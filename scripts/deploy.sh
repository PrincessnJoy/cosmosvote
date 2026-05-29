#!/usr/bin/env bash
# deploy.sh — Deploy CosmosVote contracts to local or testnet
set -euo pipefail

# ─── Load environment ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

NETWORK="${NETWORK:-local}"
STELLAR_RPC_URL="${STELLAR_RPC_URL:-http://localhost:8000}"
STELLAR_SECRET_KEY="${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY must be set}"
INITIAL_TOKEN_SUPPLY="${INITIAL_TOKEN_SUPPLY:-1000000000}"
TOKEN_NAME="${TOKEN_NAME:-CosmosVote}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-VOTE}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-7}"
MIN_PROPOSAL_BALANCE="${MIN_PROPOSAL_BALANCE:-0}"
PROPOSAL_COOLDOWN="${PROPOSAL_COOLDOWN:-0}"
RESTRICT_ADMIN_VOTE="${RESTRICT_ADMIN_VOTE:-false}"

case "$NETWORK" in
  local)
    PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Standalone Network ; February 2021}"
    ;;
  testnet)
    PASSPHRASE="Test SDF Network ; September 2015"
    STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
    ;;
  *)
    echo "ERROR: Use deploy_mainnet.sh for mainnet deployments." >&2
    exit 1
    ;;
esac

echo "=== CosmosVote Deployment ==="
echo "Network : $NETWORK"
echo "RPC URL : $STELLAR_RPC_URL"
echo ""

# ─── Build ───────────────────────────────────────────────────────────────────
echo ">>> Building WASM binaries..."
cd "$ROOT_DIR"
cargo build --release --target wasm32-unknown-unknown

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

# ─── Derive admin address ────────────────────────────────────────────────────
ADMIN_ADDRESS=$(stellar keys address --secret-key "$STELLAR_SECRET_KEY" 2>/dev/null || \
  stellar keys address "$STELLAR_SECRET_KEY")

echo "Admin   : $ADMIN_ADDRESS"
echo ""

# ─── Deploy token contract ───────────────────────────────────────────────────
echo ">>> Deploying token contract..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Token contract ID: $TOKEN_CONTRACT_ID"

echo ">>> Initializing token contract..."
stellar contract invoke \
  --id "$TOKEN_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --initial_supply "$INITIAL_TOKEN_SUPPLY" \
  --name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --decimals "$TOKEN_DECIMALS"

# ─── Deploy governance contract ──────────────────────────────────────────────
echo ">>> Deploying governance contract..."
GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$GOV_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

echo ">>> Initializing governance contract..."
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --voting_token "$TOKEN_CONTRACT_ID" \
  --min_proposal_balance "$MIN_PROPOSAL_BALANCE" \
  --proposal_cooldown "$PROPOSAL_COOLDOWN" \
  --restrict_admin_vote "$RESTRICT_ADMIN_VOTE"

# ─── Write deployed addresses ────────────────────────────────────────────────
echo ""
echo "=== Deployment complete ==="
echo "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
echo ""
echo "Add these to your .env file:"
echo "  TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "  GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
