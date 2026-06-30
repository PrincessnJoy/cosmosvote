#!/usr/bin/env bash
# test_integration_local.sh — Run contract integration tests against a local Soroban node.
#
# Prerequisites:
#   - Docker and docker compose
#   - Rust + wasm32-unknown-unknown target
#
# Usage:
#   ./scripts/test_integration_local.sh          # start node, test, stop node
#   ./scripts/test_integration_local.sh --no-teardown  # keep node running after tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEARDOWN=true

for arg in "$@"; do
  [[ "$arg" == "--no-teardown" ]] && TEARDOWN=false
done

cleanup() {
  if $TEARDOWN; then
    echo ""
    echo "=== Tearing down local node ==="
    bash "$SCRIPT_DIR/local_node_stop.sh"
  else
    echo "Local node left running (--no-teardown)."
  fi
}
trap cleanup EXIT

echo "=== CosmosVote local integration tests ==="

# 1. Start node
bash "$SCRIPT_DIR/local_node_start.sh" --wait

# 2. Export env vars consumed by soroban-sdk testutils
export STELLAR_RPC_URL="http://localhost:8000/soroban/rpc"
export STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2021"

cd "$ROOT_DIR"

# 3. Build WASM binaries
echo ""
echo ">>> Building WASM binaries..."
cargo build --release --target wasm32-unknown-unknown --quiet

# 4. Run integration tests
#    Tests tagged with #[cfg(feature = "testutils")] exercise the full contract lifecycle.
echo ""
echo ">>> Running integration tests (features=testutils)..."
cargo test --all --features testutils -- --nocapture

echo ""
echo "=== All integration tests passed ==="
