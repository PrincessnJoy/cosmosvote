#!/usr/bin/env bash
# deploy_mainnet.sh — Deploy CosmosVote contracts to Stellar mainnet.
#
# ⚠️  WARNING: This deploys to MAINNET. Transactions are irreversible.
#
# Usage:
#   ./deploy_mainnet.sh [--dry-run] [--yes] [--expected-token-hash <sha256>] [--expected-gov-hash <sha256>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ─── Parse flags ─────────────────────────────────────────────────────────────
DRY_RUN=false
YES=false
EXPECTED_TOKEN_HASH=""
EXPECTED_GOV_HASH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --yes)     YES=true ;;
    --expected-token-hash) EXPECTED_TOKEN_HASH="$2"; shift ;;
    --expected-gov-hash)   EXPECTED_GOV_HASH="$2";   shift ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
  shift
done

# Wrapper: print command in dry-run, execute otherwise
run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

# ─── Load environment ─────────────────────────────────────────────────────────
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

STELLAR_SECRET_KEY="${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY must be set}"
INITIAL_TOKEN_SUPPLY="${INITIAL_TOKEN_SUPPLY:-1000000000}"
TOKEN_NAME="${TOKEN_NAME:-CosmosVote}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-VOTE}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-7}"
MIN_PROPOSAL_BALANCE="${MIN_PROPOSAL_BALANCE:-1000000}"
PROPOSAL_COOLDOWN="${PROPOSAL_COOLDOWN:-86400}"
RESTRICT_ADMIN_VOTE="${RESTRICT_ADMIN_VOTE:-true}"

PASSPHRASE="Public Global Stellar Network ; September 2015"
RPC_URL="https://soroban-mainnet.stellar.org"

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          CosmosVote — MAINNET DEPLOYMENT                 ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  ⚠️  You are about to deploy to STELLAR MAINNET          ║"
echo "║  This action is IRREVERSIBLE.                            ║"
[[ "$DRY_RUN" == "true" ]] && echo "║  MODE: DRY-RUN (no transactions will be submitted)       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Parameters:"
echo "  Initial supply      : $INITIAL_TOKEN_SUPPLY"
echo "  Min proposal balance: $MIN_PROPOSAL_BALANCE"
echo "  Proposal cooldown   : ${PROPOSAL_COOLDOWN}s"
echo "  Restrict admin vote : $RESTRICT_ADMIN_VOTE"
echo ""

# ─── Confirmation prompt (skip with --yes or --dry-run) ───────────────────────
if [[ "$DRY_RUN" == "false" && "$YES" == "false" ]]; then
  read -r -p "Type 'deploy mainnet' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "deploy mainnet" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# ─── Build ────────────────────────────────────────────────────────────────────
echo ">>> Building WASM binaries..."
run cargo build --release --target wasm32-unknown-unknown --manifest-path "$ROOT_DIR/Cargo.toml"

# ─── Pre-flight: WASM hash verification ──────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  if [[ -n "$EXPECTED_TOKEN_HASH" ]]; then
    ACTUAL_TOKEN_HASH=$(sha256sum "$TOKEN_WASM" | awk '{print $1}')
    if [[ "$ACTUAL_TOKEN_HASH" != "$EXPECTED_TOKEN_HASH" ]]; then
      echo "ERROR: Token WASM hash mismatch!" >&2
      echo "  Expected: $EXPECTED_TOKEN_HASH" >&2
      echo "  Actual  : $ACTUAL_TOKEN_HASH" >&2
      exit 1
    fi
    echo "✓ Token WASM hash verified: $ACTUAL_TOKEN_HASH"
  fi

  if [[ -n "$EXPECTED_GOV_HASH" ]]; then
    ACTUAL_GOV_HASH=$(sha256sum "$GOV_WASM" | awk '{print $1}')
    if [[ "$ACTUAL_GOV_HASH" != "$EXPECTED_GOV_HASH" ]]; then
      echo "ERROR: Governance WASM hash mismatch!" >&2
      echo "  Expected: $EXPECTED_GOV_HASH" >&2
      echo "  Actual  : $ACTUAL_GOV_HASH" >&2
      exit 1
    fi
    echo "✓ Governance WASM hash verified: $ACTUAL_GOV_HASH"
  fi
else
  echo "[DRY-RUN] Would verify WASM hashes (token: ${EXPECTED_TOKEN_HASH:-<not set>}, gov: ${EXPECTED_GOV_HASH:-<not set>})"
fi

ADMIN_ADDRESS=$(stellar keys address --secret-key "$STELLAR_SECRET_KEY" 2>/dev/null || \
  stellar keys address "$STELLAR_SECRET_KEY")
echo "Admin: $ADMIN_ADDRESS"

# ─── Deploy token contract ────────────────────────────────────────────────────
echo ">>> Deploying token contract to mainnet..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] stellar contract deploy --wasm $TOKEN_WASM --source <secret> --rpc-url $RPC_URL --network-passphrase '$PASSPHRASE'"
  TOKEN_CONTRACT_ID="<DRY_RUN_TOKEN_ID>"
else
  TOKEN_CONTRACT_ID=$(stellar contract deploy \
    --wasm "$TOKEN_WASM" \
    --source "$STELLAR_SECRET_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")
fi
echo "Token contract ID: $TOKEN_CONTRACT_ID"

run stellar contract invoke \
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

# ─── Deploy governance contract ───────────────────────────────────────────────
echo ">>> Deploying governance contract to mainnet..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] stellar contract deploy --wasm $GOV_WASM --source <secret> --rpc-url $RPC_URL --network-passphrase '$PASSPHRASE'"
  GOVERNANCE_CONTRACT_ID="<DRY_RUN_GOV_ID>"
else
  GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
    --wasm "$GOV_WASM" \
    --source "$STELLAR_SECRET_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE")
fi
echo "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

run stellar contract invoke \
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

echo ""
echo "=== Mainnet deployment complete ==="
echo "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
