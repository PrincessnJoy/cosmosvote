#!/usr/bin/env bash
# deploy_mainnet.sh — Deploy CosmosVote contracts to Stellar mainnet.
#
# ⚠️  WARNING: This deploys to MAINNET. Transactions are irreversible.
#     Double-check all parameters before running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
fi

# ─── Secrets manager injection ───────────────────────────────────────────────
# If STELLAR_SECRET_KEY is not already set, try to fetch it from a secrets manager.
#
#   AWS Secrets Manager: set SECRETS_MANAGER_SECRET_ID to your secret name/ARN.
#   HashiCorp Vault:     set VAULT_SECRET_PATH and VAULT_SECRET_FIELD.
if [[ -z "${STELLAR_SECRET_KEY:-}" ]] && [[ -n "${SECRETS_MANAGER_SECRET_ID:-}" ]]; then
  echo ">>> Fetching STELLAR_SECRET_KEY from AWS Secrets Manager ($SECRETS_MANAGER_SECRET_ID)..."
  STELLAR_SECRET_KEY=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRETS_MANAGER_SECRET_ID" \
    --query SecretString \
    --output text)
elif [[ -z "${STELLAR_SECRET_KEY:-}" ]] && [[ -n "${VAULT_SECRET_PATH:-}" ]]; then
  echo ">>> Fetching STELLAR_SECRET_KEY from HashiCorp Vault ($VAULT_SECRET_PATH)..."
  STELLAR_SECRET_KEY=$(vault kv get -field="${VAULT_SECRET_FIELD:-stellar_secret_key}" "$VAULT_SECRET_PATH")
fi

STELLAR_SECRET_KEY="${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY must be set (or set SECRETS_MANAGER_SECRET_ID / VAULT_SECRET_PATH)}"
INITIAL_TOKEN_SUPPLY="${INITIAL_TOKEN_SUPPLY:-1000000000}"
TOKEN_NAME="${TOKEN_NAME:-CosmosVote}"
TOKEN_SYMBOL="${TOKEN_SYMBOL:-VOTE}"
TOKEN_DECIMALS="${TOKEN_DECIMALS:-7}"
MIN_PROPOSAL_BALANCE="${MIN_PROPOSAL_BALANCE:-1000000}"
PROPOSAL_COOLDOWN="${PROPOSAL_COOLDOWN:-86400}"
RESTRICT_ADMIN_VOTE="${RESTRICT_ADMIN_VOTE:-true}"

PASSPHRASE="Public Global Stellar Network ; September 2015"
RPC_URL="https://soroban-mainnet.stellar.org"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          CosmosVote — MAINNET DEPLOYMENT                 ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  ⚠️  You are about to deploy to STELLAR MAINNET          ║"
echo "║  This action is IRREVERSIBLE.                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Parameters:"
echo "  Initial supply      : $INITIAL_TOKEN_SUPPLY"
echo "  Min proposal balance: $MIN_PROPOSAL_BALANCE"
echo "  Proposal cooldown   : ${PROPOSAL_COOLDOWN}s"
echo "  Restrict admin vote : $RESTRICT_ADMIN_VOTE"
echo ""
read -r -p "Type 'deploy mainnet' to confirm: " CONFIRM
if [[ "$CONFIRM" != "deploy mainnet" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo ">>> Building WASM binaries..."
cd "$ROOT_DIR"
cargo build --release --target wasm32-unknown-unknown

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

ADMIN_ADDRESS=$(stellar keys address --secret-key "$STELLAR_SECRET_KEY" 2>/dev/null || \
  stellar keys address "$STELLAR_SECRET_KEY")

echo "Admin: $ADMIN_ADDRESS"

echo ">>> Deploying token contract to mainnet..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Token contract ID: $TOKEN_CONTRACT_ID"

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

echo ">>> Deploying governance contract to mainnet..."
GOVERNANCE_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$GOV_WASM" \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")

echo "Governance contract ID: $GOVERNANCE_CONTRACT_ID"

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

echo ""
echo "=== Mainnet deployment complete ==="
echo "TOKEN_CONTRACT_ID=$TOKEN_CONTRACT_ID"
echo "GOVERNANCE_CONTRACT_ID=$GOVERNANCE_CONTRACT_ID"
