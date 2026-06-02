#!/usr/bin/env bash
# deploy.sh — Deploy CosmosVote contracts to local or testnet
set -euo pipefail

# ─── Logging ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  local level="$1"; shift
  echo "[$(date +%Y-%m-%dT%H:%M:%S)] [$level] $*"
}

trap 'log ERROR "Script failed at line $LINENO. Check $LOG_FILE for details."' ERR

# ─── Load environment ────────────────────────────────────────────────────────
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
    log ERROR "Unsupported network '$NETWORK'. Use deploy_mainnet.sh for mainnet deployments."
    exit 1
    ;;
esac

log INFO "=== CosmosVote Deployment ==="
log INFO "Network : $NETWORK"
log INFO "RPC URL : $STELLAR_RPC_URL"
log INFO "Log file: $LOG_FILE"

# ─── Build ───────────────────────────────────────────────────────────────────
log INFO "Building WASM binaries..."
cd "$ROOT_DIR"
cargo build --release --target wasm32-unknown-unknown \
  || { log ERROR "cargo build failed"; exit 1; }

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

for wasm in "$TOKEN_WASM" "$GOV_WASM"; do
  [[ -f "$wasm" ]] || { log ERROR "WASM not found: $wasm"; exit 1; }
done

# ─── Derive admin address ────────────────────────────────────────────────────
ADMIN_ADDRESS=$(stellar keys address --secret-key "$STELLAR_SECRET_KEY" 2>/dev/null || \
  stellar keys address "$STELLAR_SECRET_KEY") \
  || { log ERROR "Failed to derive admin address from STELLAR_SECRET_KEY"; exit 1; }
log INFO "Admin: $ADMIN_ADDRESS"

# ─── Deploy token contract ───────────────────────────────────────────────────
log INFO "Deploying token contract..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE") \
  || { log ERROR "Token contract deployment failed"; exit 1; }
log INFO "Token contract ID: $TOKEN_CONTRACT_ID"

log INFO "Initializing token contract..."
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
  --decimals "$TOKEN_DECIMALS" \
  || { log ERROR "Token contract initialization failed"; exit 1; }

# ─── Deploy governance contract ──────────────────────────────────────────────
log INFO "Deploying governance contract..."
GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$GOV_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$PASSPHRASE") \
  || { log ERROR "Governance contract deployment failed"; exit 1; }
log INFO "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

log INFO "Initializing governance contract..."
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
  --restrict_admin_vote "$RESTRICT_ADMIN_VOTE" \
  || { log ERROR "Governance contract initialization failed"; exit 1; }

# ─── Summary ─────────────────────────────────────────────────────────────────
log INFO "=== Deployment complete ==="
log INFO "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
log INFO "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
log INFO "Add these to your .env file:"
log INFO "  TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
log INFO "  GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
log INFO "Full log saved to: $LOG_FILE"
