#!/usr/bin/env bash
# Health probe for CosmosVote services. Exits non-zero if any check fails.
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
NOTIFICATION_URL="${NOTIFICATION_URL:-http://localhost:8080/health}"
HORIZON_URL="${STELLAR_HORIZON_URL:-https://horizon-testnet.stellar.org}"
SOROBAN_RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"

pass=0; fail=0

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "[OK]   $name"
    ((pass++)) || true
  else
    echo "[FAIL] $name"
    ((fail++)) || true
  fi
}

check "Frontend"             "curl -sf --max-time 5 '$FRONTEND_URL'"
check "Notification service" "curl -sf --max-time 5 '$NOTIFICATION_URL'"
check "Horizon RPC"          "curl -sf --max-time 5 '$HORIZON_URL'"
check "Soroban RPC" \
  "curl -sf --max-time 5 -X POST '$SOROBAN_RPC_URL' \
     -H 'Content-Type: application/json' \
     -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}' \
   | grep -q 'healthy'"

echo ""
echo "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
