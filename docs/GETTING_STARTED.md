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
git clone https://github.com/your-org/cosmosvote.git
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
