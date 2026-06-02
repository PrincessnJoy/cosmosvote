#!/usr/bin/env bash
# test_wasm.sh — Build and smoke-test WASM binaries.
set -euo pipefail

# ─── Logging ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/test_wasm_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  local level="$1"; shift
  echo "[$(date +%Y-%m-%dT%H:%M:%S)] [$level] $*"
}

trap 'log ERROR "Script failed at line $LINENO. Check $LOG_FILE for details."' ERR

log INFO "=== CosmosVote WASM Test ==="
log INFO "Log file: $LOG_FILE"

cd "$ROOT_DIR"

log INFO "Building WASM binaries..."
cargo build --release --target wasm32-unknown-unknown \
  || { log ERROR "cargo build failed"; exit 1; }

TOKEN_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_token.wasm"
GOV_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/cosmosvote_governance.wasm"

log INFO "Checking WASM files exist..."
for wasm in "$TOKEN_WASM" "$GOV_WASM"; do
  if [[ -f "$wasm" ]]; then
    size=$(du -h "$wasm" | cut -f1)
    log INFO "  ✓ $(basename "$wasm") ($size)"
  else
    log ERROR "  ✗ $(basename "$wasm") NOT FOUND"
    exit 1
  fi
done

log INFO "Inspecting WASM exports..."
if command -v stellar &>/dev/null; then
  log INFO "Token contract interface:"
  stellar contract inspect --wasm "$TOKEN_WASM" 2>/dev/null \
    || log WARN "stellar CLI inspect not available for token"
  log INFO "Governance contract interface:"
  stellar contract inspect --wasm "$GOV_WASM" 2>/dev/null \
    || log WARN "stellar CLI inspect not available for governance"
else
  log WARN "stellar CLI not found; skipping contract inspection"
fi

log INFO "=== WASM test passed ==="
log INFO "Full log saved to: $LOG_FILE"
