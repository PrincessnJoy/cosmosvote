# Runtime Monitoring for Anomalous Contract Events

Off-chain monitoring script that polls Soroban contract events and emits structured alerts when suspicious governance or token activity is detected.

## Quick Start

```bash
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export GOVERNANCE_CONTRACT_ID="C..."
export TOKEN_CONTRACT_ID="C..."

node scripts/monitor.js
```

Output is newline-delimited JSON streamed to stdout, suitable for log aggregators (Datadog, CloudWatch, Loki, etc.).

## Anomalies Detected

| Anomaly | Description | Default Threshold |
|---------|-------------|-------------------|
| `SUSPICIOUS_ADMIN_CHANGES` | Multiple `set_admin` or `update_config` events in one poll window | ≥ 2 events |
| `LARGE_TOKEN_TRANSFER` | Single transfer above threshold | ≥ 1,000,000,000,000 base units |
| `RAPID_VOTE_BURST` | Unusually high vote volume in one poll window | ≥ 50 votes |
| `PROPOSAL_CANCELLED` | Any admin cancellation of a governance proposal | Every occurrence |
| `CONTRACT_PAUSED` | Governance contract pause event | Every occurrence |
| `TOKEN_MINTED` | Any mint event (unexpected supply increase) | Every occurrence |

## Configuration

All settings are controlled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban JSON-RPC endpoint |
| `GOVERNANCE_CONTRACT_ID` | _(empty)_ | Governance contract address |
| `TOKEN_CONTRACT_ID` | _(empty)_ | Token contract address |
| `POLL_INTERVAL_MS` | `30000` | Milliseconds between polls |
| `LARGE_TRANSFER_THRESHOLD` | `1000000000000` | Base-unit threshold for large-transfer alerts |
| `RAPID_VOTE_BURST` | `50` | Vote-count threshold per poll window |
| `ADMIN_CHANGE_COUNT` | `2` | Admin-change count before alert |

## Alert Output Format

Every log line is a JSON object:

```json
{
  "timestamp": "2026-01-15T10:00:00.000Z",
  "level": "ALERT",
  "event": "LARGE_TOKEN_TRANSFER",
  "contractId": "C...",
  "from": "G...",
  "to": "G...",
  "amount": "5000000000000",
  "threshold": "1000000000000"
}
```

`level` is one of `INFO`, `ALERT`, or `ERROR`.

## Adding Alerting Hooks

The `alert()` function in `scripts/monitor.js` is the single extension point. Add integrations there:

```js
// Slack
fetch(process.env.SLACK_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: `[ALERT] ${event}: ${JSON.stringify(details)}` }),
});

// PagerDuty, email, SNS, etc.
```

## Running in Production

For continuous operation, run the script under a process manager:

```bash
# PM2
pm2 start scripts/monitor.js --name cosmosvote-monitor

# systemd — see your distro documentation
# Docker
docker run -e STELLAR_RPC_URL=... -e GOVERNANCE_CONTRACT_ID=... node:20-alpine node scripts/monitor.js
```

## Tuning Thresholds

Adjust thresholds based on observed on-chain activity:

1. Run the monitor in `INFO`-only mode for a week to collect baseline metrics.
2. Set `LARGE_TRANSFER_THRESHOLD` to ~10× the typical single-transaction volume.
3. Set `RAPID_VOTE_BURST` to ~3× the typical votes-per-30s rate.
4. Lower `ADMIN_CHANGE_COUNT` to `1` on mainnet for stricter alerting.
