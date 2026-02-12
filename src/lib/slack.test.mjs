import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { parseSlackInboundEvent, verifySlackSignature } from "./slack.mjs";

function buildSignature({ signingSecret, rawBody, timestamp }) {
  const base = `v0:${timestamp}:${rawBody}`;
  return `v0=${crypto.createHmac("sha256", signingSecret).update(base).digest("hex")}`;
}

test("verifySlackSignature accepts valid signature", () => {
  const signingSecret = "secret";
  const rawBody = JSON.stringify({ ok: true });
  const nowMs = Date.parse("2026-02-12T18:00:00.000Z");
  const timestamp = Math.floor(nowMs / 1000).toString();
  const signature = buildSignature({ signingSecret, rawBody, timestamp });

  const valid = verifySlackSignature(
    {
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
    rawBody,
    signingSecret,
    nowMs,
  );

  assert.equal(valid, true);
});

test("verifySlackSignature rejects stale timestamp", () => {
  const signingSecret = "secret";
  const rawBody = JSON.stringify({ ok: true });
  const nowMs = Date.parse("2026-02-12T18:00:00.000Z");
  const timestamp = Math.floor((nowMs - 10 * 60 * 1000) / 1000).toString();
  const signature = buildSignature({ signingSecret, rawBody, timestamp });

  const valid = verifySlackSignature(
    {
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
    rawBody,
    signingSecret,
    nowMs,
  );

  assert.equal(valid, false);
});

test("parseSlackInboundEvent maps message callback", () => {
  const parsed = parseSlackInboundEvent({
    type: "event_callback",
    event_id: "evt-1",
    event: {
      type: "message",
      text: "hello",
      channel: "C123",
      ts: "1700000000.123",
      user: "U123",
    },
  });

  assert.deepEqual(parsed, {
    eventId: "evt-1",
    text: "hello",
    channelId: "C123",
    messageTs: "1700000000.123",
    threadTs: "",
    userId: "U123",
    sessionId: "slack:C123:1700000000.123",
  });
});

test("parseSlackInboundEvent ignores bot and invalid events", () => {
  const botEvent = parseSlackInboundEvent({
    type: "event_callback",
    event_id: "evt-2",
    event: {
      type: "message",
      text: "hello",
      channel: "C123",
      ts: "1700000000.123",
      bot_id: "B123",
    },
  });
  assert.equal(botEvent, null);

  const missingText = parseSlackInboundEvent({
    type: "event_callback",
    event_id: "evt-3",
    event: {
      type: "message",
      text: " ",
      channel: "C123",
      ts: "1700000000.123",
    },
  });
  assert.equal(missingText, null);
});
