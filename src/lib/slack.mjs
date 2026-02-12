import crypto from "node:crypto";

export function verifySlackSignature(headers, rawBody, signingSecret, nowMs = Date.now()) {
  const timestamp = String(headers["x-slack-request-timestamp"] || "");
  const signature = String(headers["x-slack-signature"] || "");
  if (!timestamp || !signature) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseSlackInboundEvent(payload) {
  if (!payload || payload.type !== "event_callback") {
    return null;
  }
  if (typeof payload.event_id !== "string" || payload.event_id.length === 0) {
    return null;
  }
  const event = payload.event || {};
  if (event.bot_id) {
    return null;
  }
  if (event.type !== "message" && event.type !== "app_mention") {
    return null;
  }

  const text = typeof event.text === "string" ? event.text.trim() : "";
  const channelId = String(event.channel || "");
  const messageTs = String(event.ts || "");
  const threadTs = String(event.thread_ts || event.ts || "");
  const userId = String(event.user || "");

  if (!text || !channelId || !threadTs) {
    return null;
  }

  return {
    eventId: payload.event_id,
    text,
    channelId,
    messageTs,
    threadTs,
    userId,
    sessionId: `slack:${channelId}:${threadTs}`,
  };
}
