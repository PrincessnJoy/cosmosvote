# Local Soroban Node Testing

This guide explains how to run CosmosVote contract integration tests against a local Soroban node.

---

## Prerequisites

- Docker and Docker Compose
- Rust 1.75+ with `wasm32-unknown-unknown` target
- (Optional) Stellar CLI for manual contract invocations

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/local_node_start.sh` | Start the local Soroban node (optionally waits until ready) |
| `scripts/local_node_stop.sh` | Stop and remove the local node container |
| `scripts/test_integration_local.sh` | Full end-to-end: start node → build → test → teardown |

---

## Quick Start

```bash
# Run full integration suite (start node, test, teardown)
./scripts/test_integration_local.sh

# Keep the node running after tests (useful for manual inspection)
./scripts/test_integration_local.sh --no-teardown

# Manual node lifecycle
./scripts/local_node_start.sh --wait    # blocks until RPC is ready
./scripts/local_node_stop.sh
```

---

## How It Works

1. `local_node_start.sh` brings up `stellar/quickstart` in `--local` mode with Soroban RPC enabled (port 8000).
2. `test_integration_local.sh` exports `STELLAR_RPC_URL` and `STELLAR_NETWORK_PASSPHRASE` so the soroban-sdk testutils can connect.
3. WASM binaries are compiled and all tests tagged `#[cfg(feature = "testutils")]` are executed.
4. On exit (success or failure), the node is stopped automatically via a `trap`.

---

## Environment Variables

| Variable | Value |
|----------|-------|
| `STELLAR_RPC_URL` | `http://localhost:8000/soroban/rpc` |
| `STELLAR_NETWORK_PASSPHRASE` | `Standalone Network ; February 2021` |

These are set automatically by `test_integration_local.sh`. Override them if your local node runs on a different port.

---

## Running Individual Test Suites

```bash
# After starting the node manually:
./scripts/local_node_start.sh --wait

# Governance contract tests only
cargo test -p cosmosvote-governance --features testutils -- --nocapture

# Token contract tests only
cargo test -p cosmosvote-token --features testutils -- --nocapture

# Property-based tests
cargo test prop_ --all --features testutils

# Stop when done
./scripts/local_node_stop.sh
```

---

## Teardown

The `test_integration_local.sh` script always tears down the node on exit (unless `--no-teardown` is passed). To manually stop:

```bash
./scripts/local_node_stop.sh
# or directly:
docker compose down stellar-node
```
