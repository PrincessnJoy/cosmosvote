# Getting Started with CosmosVote

This guide walks you through setting up CosmosVote from scratch.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.75+ | [rustup.rs](https://rustup.rs) |
| Stellar CLI | 22+ | [stellar.org/cli](https://stellar.org/cli) |
| Docker | Any | [docker.com](https://docker.com) (optional) |

## Step 1 — Clone & Build

```bash
git clone https://github.com/PrincessnJoy/cosmosvote.git
cd cosmosvote
rustup target add wasm32-unknown-unknown
make build
```

## Step 2 — Run Tests

```bash
make test
```

All 60+ tests should pass.

## Step 3 — Configure Environment

```bash
cp .env.example .env
# Edit .env: set STELLAR_SECRET_KEY and NETWORK
```

## Step 4 — Deploy to Testnet

```bash
NETWORK=testnet ./scripts/deploy.sh
```

Copy the printed contract IDs into your `.env`.

## Step 5 — Interact with Contracts

```bash
# Create a proposal
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --network testnet \
  -- create_proposal \
  --proposer <YOUR_ADDRESS> \
  --title "My First Proposal" \
  --description "A test governance proposal" \
  --quorum 1000000 \
  --duration 3600

# Cast a vote
stellar contract invoke \
  --id $GOVERNANCE_CONTRACT_ID \
  --source $STELLAR_SECRET_KEY \
  --network testnet \
  -- cast_vote \
  --voter <YOUR_ADDRESS> \
  --proposal_id 0 \
  --vote '{"tag":"Yes"}'
```

## Step 6 — Run the Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Next Steps

- Read the [Proposal Lifecycle](./lifecycle.md)
- Review the [Storage Model](./storage.md)
- Check the [Error Reference](./errors.md)
- Browse [Architecture Decision Records](./adr/)

---

## Container Health Checks

All services in `docker-compose.yml` expose health status for orchestration tools (Docker Swarm, Kubernetes, etc.).

### stellar-node

| Property | Value |
|----------|-------|
| Endpoint | `http://localhost:8000/health` |
| Interval | 15 s |
| Timeout | 10 s |
| Start period | 30 s (node needs time to initialize) |
| Retries | 5 |

The Stellar quickstart node exposes `/health` on its RPC port. The `dev` service waits for `stellar-node` to be **healthy** before starting (`depends_on: condition: service_healthy`).

### dev (build/test container)

| Property | Value |
|----------|-------|
| Endpoint | `http://stellar-node:8000/health` |
| Interval | 30 s |
| Timeout | 10 s |
| Start period | 15 s |
| Retries | 3 |

The `dev` container checks that the upstream RPC node is reachable. This ensures CI pipelines and orchestrators can detect when the build container has lost connectivity to its dependency.

### Dockerfile HEALTHCHECK

The `Dockerfile` also embeds a `HEALTHCHECK` instruction so that images built from it are health-aware when run standalone (outside compose):

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -fsS "${STELLAR_RPC_URL:-http://localhost:8000}/health" > /dev/null || exit 1
```

The `STELLAR_RPC_URL` environment variable controls which endpoint is polled; it defaults to `http://localhost:8000/health` when not set.
