#!/usr/bin/env bash
# test_wasm.sh — Build and smoke-test WASM binaries.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== CosmosVote WASM Test ==="

cd "$ROOT_DIR"

echo ">>> Building WASM binaries..."
cargo build --release --target wasm32-unknown-unknown

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

echo ""
echo ">>> Checking WASM files exist..."
for wasm in "$TOKEN_WASM" "$GOV_WASM"; do
  if [[ -f "$wasm" ]]; then
    size=$(du -h "$wasm" | cut -f1)
    echo "  ✓ $(basename "$wasm") ($size)"
  else
    echo "  ✗ $(basename "$wasm") NOT FOUND" >&2
    exit 1
  fi
done

echo ""
echo ">>> Inspecting WASM exports (requires wasm-objdump or stellar CLI)..."
if command -v stellar &>/dev/null; then
  echo "Token contract interface:"
  stellar contract inspect --wasm "$TOKEN_WASM" 2>/dev/null || echo "  (stellar CLI inspect not available)"
  echo ""
  echo "Governance contract interface:"
  stellar contract inspect --wasm "$GOV_WASM" 2>/dev/null || echo "  (stellar CLI inspect not available)"
fi

echo ""
echo "=== WASM test passed. ==="
