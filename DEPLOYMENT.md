# Deployment Guide

## Required env vars

- `ROOAAK_API_KEY`
- `ROOAAK_WEBHOOK_SECRET`
- `ROOAAK_AGENT_ID`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- Optional: `ROOAAK_BASE_URL`, `PORT`

## Webhook URLs

- Slack inbound: `POST /webhooks/slack/events`
- Rooaak inbound: `POST /webhooks/rooaak`
- Health: `GET /healthz`

## Render

Use `deploy/render.yaml` and set env vars in dashboard or IaC secret management.

## Docker

```bash
docker build -t rooaak-slack-adapter-starter .
docker run --rm -p 8787:8787 --env-file .env rooaak-slack-adapter-starter
```

## Security checklist

- Enforce HTTPS at edge.
- Do not log raw provider tokens or webhook secrets.
- Keep replay protection (event IDs/delivery IDs) and move dedupe store to Redis/Postgres.
