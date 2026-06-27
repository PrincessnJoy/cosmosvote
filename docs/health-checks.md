# Infrastructure Health Checks

Health check configuration and remediation guide for deployed CosmosVote services.

---

## Health Check Endpoints

| Service | Endpoint | Method | Expected Response |
|---------|----------|--------|-------------------|
| Frontend (Vite/React) | `http://<host>:3000/` | GET | HTTP 200 |
| Notification Service | `http://<host>:8080/health` | GET | `{"status":"ok"}` |
| Horizon RPC Connector | `https://<horizon-url>/` | GET | HTTP 200 + JSON |
| Soroban RPC | `https://<rpc-url>/` | POST `getHealth` | `{"status":"healthy"}` |

### Soroban RPC Health Call

```bash
curl -s -X POST https://<rpc-url> \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  | jq .result.status
# expected: "healthy"
```

---

## Automated Probes

### Docker Compose Health Checks

Add to `docker-compose.yml` under each service:

```yaml
services:
  frontend:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3

  notification:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Cron-Based Probe Script

`scripts/health_check.sh` runs all checks and alerts on failure:

```bash
#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
NOTIFICATION_URL="${NOTIFICATION_URL:-http://localhost:8080/health}"
HORIZON_URL="${STELLAR_HORIZON_URL:-https://horizon-testnet.stellar.org}"

fail() { echo "[FAIL] $1"; exit 1; }

curl -sf "$FRONTEND_URL"       >/dev/null || fail "Frontend unreachable"
curl -sf "$NOTIFICATION_URL"   >/dev/null || fail "Notification service unreachable"
curl -sf "$HORIZON_URL"        >/dev/null || fail "Horizon RPC unreachable"

echo "[OK] All services healthy"
```

Add to crontab (every 5 minutes):

```
*/5 * * * * /bin/bash /workspaces/cosmosvote/scripts/health_check.sh >> /var/log/cosmosvote-health.log 2>&1
```

---

## Remediation Actions

| Failure | Remediation |
|---------|-------------|
| Frontend down | `docker compose restart frontend` or redeploy static build |
| Notification service down | `docker compose restart notification`; check logs with `docker compose logs notification` |
| Horizon RPC unreachable | Switch `STELLAR_HORIZON_URL` to a fallback endpoint (e.g., `https://horizon.stellar.org`) |
| Soroban RPC unhealthy | Check ledger sync status; switch `STELLAR_RPC_URL` to alternate RPC provider |
| All services down | Restart full stack: `docker compose down && docker compose up -d` |

Check application logs:

```bash
docker compose logs --tail=100 <service>
```

---

## Related

- [`.env.example`](../.env.example) — environment variable reference
- [`docker-compose.yml`](../docker-compose.yml) — service definitions
- [Stellar Horizon docs](https://developers.stellar.org/api/horizon)
- Depends on: #148
