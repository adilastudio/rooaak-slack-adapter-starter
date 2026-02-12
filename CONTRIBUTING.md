# Contributing

## Local development

```bash
npm install
npm run dev
npm test
```

## Ground rules

- Keep provider webhook verification strict.
- Keep Rooaak webhook signature verification enabled.
- Preserve idempotency/replay guards for inbound provider events.
- Add tests for any parsing, signature, or mapping changes.
