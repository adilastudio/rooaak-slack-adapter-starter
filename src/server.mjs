import "dotenv/config";
import express from "express";
import { RooaakClient, verifyWebhookSignature } from "rooaak";
import { parseSlackInboundEvent, verifySlackSignature } from "./lib/slack.mjs";
import { TimeboxedSet, bufferToString, loadEnv } from "./lib/shared.mjs";

const env = loadEnv([
  "ROOAAK_API_KEY",
  "ROOAAK_WEBHOOK_SECRET",
  "ROOAAK_AGENT_ID",
  "SLACK_SIGNING_SECRET",
  "SLACK_BOT_TOKEN",
]);

const port = Number(process.env.PORT || "8787");
const rooaak = new RooaakClient({
  apiKey: env.ROOAAK_API_KEY,
  baseUrl: process.env.ROOAAK_BASE_URL || "https://www.rooaak.com",
});

const app = express();
const seenSlackEvents = new TimeboxedSet(10 * 60 * 1000);
const seenRooaakDeliveries = new TimeboxedSet(10 * 60 * 1000);

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/webhooks/slack/events", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = bufferToString(req.body);

  if (!verifySlackSignature(req.headers, rawBody, env.SLACK_SIGNING_SECRET)) {
    res.status(401).json({ error: "invalid slack signature" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "invalid json" });
    return;
  }

  if (payload.type === "url_verification") {
    res.status(200).send(payload.challenge || "");
    return;
  }

  if (payload.type !== "event_callback") {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  res.status(200).json({ ok: true });

  if (typeof payload.event_id !== "string" || seenSlackEvents.has(payload.event_id)) {
    return;
  }
  seenSlackEvents.add(payload.event_id);

  const inbound = parseSlackInboundEvent(payload);
  if (!inbound) {
    return;
  }

  try {
    const sendResult = await rooaak.messages.send(
      {
        agentId: env.ROOAAK_AGENT_ID,
        sessionId: inbound.sessionId,
        message: inbound.text,
        metadata: {
          correlationId: inbound.eventId,
          channel: {
            type: "slack",
            externalChannelId: inbound.channelId,
            externalThreadId: inbound.threadTs,
            externalMessageId: inbound.messageTs,
            externalUserId: inbound.userId,
          },
        },
      },
      `slack-${inbound.eventId}`,
    );

    // Fast-path when Rooaak responds synchronously.
    if (sendResult.status === "responded" && sendResult.response) {
      await postSlackMessage({
        botToken: env.SLACK_BOT_TOKEN,
        channelId: inbound.channelId,
        threadTs: inbound.threadTs,
        text: sendResult.response,
      });
    }
  } catch (error) {
    console.error("[slack-starter] inbound handling failed", {
      eventId: payload.event_id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post("/webhooks/rooaak", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = bufferToString(req.body);
  const signature = String(req.header("x-rooaak-signature") || "");
  const deliveryId = String(req.header("x-rooaak-delivery") || "");

  const valid = await verifyWebhookSignature(rawBody, signature, env.ROOAAK_WEBHOOK_SECRET);
  if (!valid) {
    res.status(401).json({ error: "invalid rooaak signature" });
    return;
  }

  if (deliveryId && seenRooaakDeliveries.has(deliveryId)) {
    res.status(200).json({ ok: true, duplicate: true });
    return;
  }
  if (deliveryId) {
    seenRooaakDeliveries.add(deliveryId);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "invalid json" });
    return;
  }

  if (event.type !== "message.responded") {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const messageId = String(event?.data?.messageId || "");
  if (!messageId) {
    res.status(200).json({ ok: true, ignored: "missing messageId" });
    return;
  }

  try {
    const message = await rooaak.messages.get(messageId);
    if (!message.response) {
      res.status(200).json({ ok: true, ignored: "missing response" });
      return;
    }

    const channel = event?.data?.channel || event?.data?.metadata?.channel || {};
    const channelId = String(channel.externalChannelId || "");
    const threadTs = String(channel.externalThreadId || "");

    if (!channelId) {
      res.status(200).json({ ok: true, ignored: "missing channel mapping" });
      return;
    }

    await postSlackMessage({
      botToken: env.SLACK_BOT_TOKEN,
      channelId,
      threadTs: threadTs || undefined,
      text: message.response,
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[slack-starter] rooaak webhook handling failed", {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "failed to deliver slack response" });
  }
});

app.listen(port, () => {
  console.log(`[slack-starter] listening on :${port}`);
});

async function postSlackMessage({ botToken, channelId, threadTs, text }) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      thread_ts: threadTs || undefined,
      text,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    const errorMessage = body?.error || `HTTP ${response.status}`;
    throw new Error(`Slack API error: ${errorMessage}`);
  }
}
