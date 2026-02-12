# Release Checklist

## Pre-release validation

- [x] `npm install`
- [x] `npm test` passes
- [x] `node --check src/server.mjs` passes
- [x] `.env.example` matches runtime-required env vars
- [x] README setup steps are accurate end-to-end

## Security checks

- [x] Slack signature validation enabled
- [x] Rooaak webhook signature validation enabled
- [x] No secrets/tokens logged
- [x] Replay/idempotency guard for inbound events verified

## Deployment checks

- [x] Health endpoint responds (`/healthz`)
- [x] Webhook routes reachable via HTTPS
- [ ] Slack app subscription URL points to deployed host
- [x] Rooaak webhook registered for `message.responded`

## Release ops

- [x] Tag release (`v0.1.0`)
- [x] Publish changelog entry
- [ ] Smoke test with real Slack workspace

## Verification notes (2026-02-12)

- Local checks passed: install, tests, syntax, and `/healthz`.
- Deployed webhook routes are live over HTTPS and return expected auth errors when unsigned (`/webhooks/slack/events`, `/webhooks/rooaak`).
- Rooaak webhook is registered for `message.responded` at `https://rooaak-slack-adapter-starter.fly.dev/webhooks/rooaak` (id: `cd10d384-13af-4968-a273-bdeb1eab7bb3`).
- Remaining unchecked items require Slack app callback configuration + live workspace smoke test.
