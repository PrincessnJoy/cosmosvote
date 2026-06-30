#!/usr/bin/env bash
# local_node_start.sh — Start a local Soroban node via Docker.
# Usage: ./scripts/local_node_start.sh [--wait]
set -euo pipefail

RPC_URL="http://localhost:8000/soroban/rpc"
HEALTH_URL="http://localhost:8000"

echo "=== Starting local Soroban node ==="
docker compose up -d stellar-node

if [[ "${1:-}" == "--wait" ]]; then
  echo ">>> Waiting for node to be ready..."
  for i in $(seq 1 30); do
    if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
      echo "  ✓ Node is ready at $RPC_URL"
      exit 0
    fi
    echo "  ... attempt $i/30"
    sleep 3
  done
  echo "✗ Node did not become ready in time" >&2
  exit 1
fi

echo "Node started. RPC: $RPC_URL"
echo "Run './scripts/local_node_stop.sh' to tear down."
