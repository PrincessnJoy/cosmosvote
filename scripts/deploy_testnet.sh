#!/usr/bin/env bash
# deploy_testnet.sh — Deploy CosmosVote contracts to Stellar testnet.
#
# Required inputs (set via environment or .env file):
#   STELLAR_SECRET_KEY        — Stellar secret key (S...)
#
# Optional inputs (all have sensible testnet defaults):
#   INITIAL_TOKEN_SUPPLY      — tokens minted to admin (default: 1000000000)
#   TOKEN_NAME                — token name (default: CosmosVote)
#   TOKEN_SYMBOL              — token symbol (default: VOTE)
#   TOKEN_DECIMALS            — decimal places (default: 7)
#   MIN_PROPOSAL_BALANCE      — min tokens to propose (default: 0)
#   PROPOSAL_COOLDOWN         — seconds between proposals (default: 0)
#   RESTRICT_ADMIN_VOTE       — restrict admin voting (default: false)
#
# Dry-run mode (syntax check only, no network calls):
#   DRY_RUN=1 ./scripts/deploy_testnet.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ─── Load environment ────────────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

STELLAR_SECRET_KEY="${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY must be set}"
INITIAL_TOKEN_SUPPLY="${INITIAL_TOKEN_SUPPLY:-1000000000}"
TOKEN_NAME="${TOKEN_NAME:-CosmosVote}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-VOTE}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-7}"
MIN_PROPOSAL_BALANCE="${MIN_PROPOSAL_BALANCE:-0}"
PROPOSAL_COOLDOWN="${PROPOSAL_COOLDOWN:-0}"
RESTRICT_ADMIN_VOTE="${RESTRICT_ADMIN_VOTE:-false}"

PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
DRY_RUN="${DRY_RUN:-0}"

# ─── Dry-run guard ───────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "1" ]]; then
  echo "=== DRY RUN: validating script inputs ==="
  echo "STELLAR_SECRET_KEY : [set]"
  echo "INITIAL_TOKEN_SUPPLY : $INITIAL_TOKEN_SUPPLY"
  echo "TOKEN_NAME : $TOKEN_NAME"
  echo "TOKEN_SYMBOL : $TOKEN_SYMBOL"
  echo "TOKEN_DECIMALS : $TOKEN_DECIMALS"
  echo "MIN_PROPOSAL_BALANCE : $MIN_PROPOSAL_BALANCE"
  echo "PROPOSAL_COOLDOWN : $PROPOSAL_COOLDOWN"
  echo "RESTRICT_ADMIN_VOTE : $RESTRICT_ADMIN_VOTE"
  echo "RPC_URL : $RPC_URL"

  # Validate numeric inputs
  if ! [[ "$INITIAL_TOKEN_SUPPLY" =~ ^[0-9]+$ ]]; then
    echo "ERROR: INITIAL_TOKEN_SUPPLY must be a non-negative integer" >&2; exit 1
  fi
  if ! [[ "$TOKEN_DECIMALS" =~ ^[0-9]+$ ]]; then
    echo "ERROR: TOKEN_DECIMALS must be a non-negative integer" >&2; exit 1
  fi
  if ! [[ "$MIN_PROPOSAL_BALANCE" =~ ^[0-9]+$ ]]; then
    echo "ERROR: MIN_PROPOSAL_BALANCE must be a non-negative integer" >&2; exit 1
  fi
  if ! [[ "$PROPOSAL_COOLDOWN" =~ ^[0-9]+$ ]]; then
    echo "ERROR: PROPOSAL_COOLDOWN must be a non-negative integer" >&2; exit 1
  fi
  if [[ "$RESTRICT_ADMIN_VOTE" != "true" && "$RESTRICT_ADMIN_VOTE" != "false" ]]; then
    echo "ERROR: RESTRICT_ADMIN_VOTE must be 'true' or 'false'" >&2; exit 1
  fi
  # Validate secret key format (starts with S, 56 chars)
  if ! [[ "$STELLAR_SECRET_KEY" =~ ^S[A-Z2-7]{55}$ ]]; then
    echo "ERROR: STELLAR_SECRET_KEY does not look like a valid Stellar secret key" >&2; exit 1
  fi

  echo ""
  echo "=== Dry run passed — all inputs valid ==="
  exit 0
fi

# ─── Build ───────────────────────────────────────────────────────────────────
echo "=== CosmosVote Testnet Deployment ==="
echo "Network : testnet"
echo "RPC URL : $RPC_URL"
echo ""

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
echo ">>> Deploying token contract to testnet..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Token contract ID: $TOKEN_CONTRACT_ID"

echo ">>> Initializing token contract..."
stellar contract invoke \
  --id "$TOKEN_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --initial_supply "$INITIAL_TOKEN_SUPPLY" \
  --name "$TOKEN_NAME" \
  --symbol "$TOKEN_SYMBOL" \
  --decimals "$TOKEN_DECIMALS"

# ─── Deploy governance contract ──────────────────────────────────────────────
echo ">>> Deploying governance contract to testnet..."
GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$GOV_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

echo ">>> Initializing governance contract..."
stellar contract invoke \
  --id "$GOVERNANCE_CONTRACT_ID" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --voting_token "$TOKEN_CONTRACT_ID" \
  --min_proposal_balance "$MIN_PROPOSAL_BALANCE" \
  --proposal_cooldown "$PROPOSAL_COOLDOWN" \
  --restrict_admin_vote "$RESTRICT_ADMIN_VOTE"

# ─── Output deployed addresses ───────────────────────────────────────────────
echo ""
echo "=== Testnet deployment complete ==="
echo "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
echo ""
echo "Add these to your .env file:"
echo "  TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "  GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
