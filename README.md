# Rooaak Slack Adapter Starter

Official starter for Slack <-> Rooaak message bridging.

## What it does

- Verifies Slack signatures (`X-Slack-Signature`, `X-Slack-Request-Timestamp`).
- Accepts Slack events on `/webhooks/slack/events`.
- Sends inbound Slack messages into Rooaak `/v1/agents/:id/messages`.
- Verifies Rooaak webhook signatures on `/webhooks/rooaak`.
- On `message.responded`, fetches response via `GET /v1/messages/:id` and posts back to Slack.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template:

```bash
cp .env.example .env
```

3. Configure Slack Event Subscriptions:
- Request URL: `https://<your-host>/webhooks/slack/events`
- Subscribe to `app_mention` and/or `message.channels`

4. Register Rooaak webhook (either option):
- API/curl:
  - URL: `https://<your-host>/webhooks/rooaak`
  - Events: `message.responded`
- Console UI:
  - Open `Console > Webhooks` (`/console/webhooks`)
  - Create a webhook with URL `https://<your-host>/webhooks/rooaak`
  - Select event `message.responded`

## Run

```bash
npm run dev
```

## Test

```bash
npm test
```

## Session Mapping

- Rooaak `sessionId`: `slack:<channel_id>:<thread_ts_or_ts>`
- Rooaak metadata includes:
- `metadata.correlationId = <slack_event_id>`
- `metadata.channel.type = "slack"`
- provider identifiers for channel/thread/message/user

## Deployment

- Docker: `Dockerfile`
- Render: `deploy/render.yaml`
- Any platform that supports long-running Node HTTP servers

See `DEPLOYMENT.md` for production details.

## Production notes

- Replace in-memory dedupe with Redis/Postgres.
- Add queue/retry handling around outbound Slack API calls.
- Rate-limit provider ingress and validate payload shape before processing.

## License and support

- License: MIT (`LICENSE`)
- Support policy: `SUPPORT.md`
