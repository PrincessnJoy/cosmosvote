# Notification Channels

> Issue #284 — Multi-channel notification support

The CosmosVote notification service supports **four notification channels**. A subscriber can receive events via any combination of them.

---

## Available channels

| Channel | Subscriber field | Env var (global fallback) | Description |
|---------|-----------------|--------------------------|-------------|
| Email   | `email`          | `SMTP_*`, `EMAIL_FROM`   | SMTP via nodemailer |
| Webhook | `webhookUrl`     | —                        | Generic HTTP POST (JSON body) |
| Slack   | `slackWebhookUrl` | `SLACK_WEBHOOK_URL`      | Slack Incoming Webhook |
| Discord | `discordWebhookUrl` | `DISCORD_WEBHOOK_URL`  | Discord Webhook |

---

## Configuration

Copy `.env.example` to `.env` and fill in the relevant values for each channel you want to enable.

```bash
cp .env.example .env
# Edit .env
```

### Email (SMTP)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=yourpassword
EMAIL_FROM=cosmosvote@example.com
```

### Slack Incoming Webhook

1. Go to [Slack API — Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. Create an app and enable Incoming Webhooks for your workspace
3. Copy the webhook URL

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

You can also set a per-subscriber URL using `--slack <url>` in the subscribe command, which overrides the global env var.

### Discord Webhook

1. Open your Discord server settings → Integrations → Webhooks
2. Create a new webhook and copy the URL

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
```

You can also set a per-subscriber URL using `--discord <url>`.

### Generic HTTP Webhook

No global env var — configured per subscriber:

```bash
npx ts-node src/index.ts subscribe \
  --webhook https://example.com/notify \
  --events created,final
```

The service sends a `POST` request with `Content-Type: application/json` and body:

```json
{ "event": { "type": "created", "proposalId": "42", "ledger": 12345678, "raw": {} } }
```

---

## Subscribing

### Single channel

```bash
# Email only
npx ts-node src/index.ts subscribe \
  --email user@example.com \
  --events created,final

# Slack only
npx ts-node src/index.ts subscribe \
  --slack https://hooks.slack.com/services/... \
  --events created,voted,final,exec,cancel

# Discord only
npx ts-node src/index.ts subscribe \
  --discord https://discord.com/api/webhooks/... \
  --events final,exec
```

### Multiple channels in one subscriber

```bash
npx ts-node src/index.ts subscribe \
  --email alert@example.com \
  --slack https://hooks.slack.com/services/... \
  --events created,final
```

### Filter by proposal

```bash
npx ts-node src/index.ts subscribe \
  --email user@example.com \
  --proposal-id 42 \
  --events final
```

---

## Adding a new channel (plugin interface)

All channels implement the `NotificationChannel` interface in `src/channels.ts`:

```typescript
export interface NotificationChannel {
  readonly name: string;
  isConfigured(subscriber: Subscriber): boolean;
  send(subscriber: Subscriber, event: GovernanceEvent): Promise<void>;
}
```

To add a new channel:

1. Implement `NotificationChannel` in `src/channels.ts`
2. Add any new fields to the `Subscriber` interface in `src/types.ts`
3. Register the implementation in the `CHANNELS` array at the bottom of `src/channels.ts`
4. Add CLI flags for the new field in `src/index.ts` and `src/subscriptions.ts`
5. Document the configuration in `.env.example`

Example skeleton:

```typescript
export const PagerDutyChannel: NotificationChannel = {
  name: 'pagerduty',
  isConfigured(subscriber) {
    return !!subscriber.pagerDutyRoutingKey;
  },
  async send(subscriber, event) {
    // POST to PagerDuty Events API v2
  },
};

// Register
CHANNELS.push(PagerDutyChannel);
```
