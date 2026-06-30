#!/usr/bin/env bash
# local_node_stop.sh — Tear down the local Soroban node.
set -euo pipefail

echo "=== Stopping local Soroban node ==="
docker compose down stellar-node
echo "Node stopped."
