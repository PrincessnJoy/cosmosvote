# Gas & Storage Benchmarks

This document records Soroban CPU instruction and memory costs for the core governance operations: proposal creation, voting, finalization, cancellation, and execution.

## Running the Benchmarks

```bash
cargo test bench_ --features testutils -- --nocapture
```

Each test prints CPU instruction count and memory bytes for a single isolated call.

## Benchmark Results

> **Environment:** Soroban SDK (testutils environment, no network overhead)  
> Results reflect in-VM cost only. Network fees depend on ledger congestion.

| Operation | CPU Instructions | Memory (bytes) | Notes |
|-----------|-----------------|----------------|-------|
| `create_proposal` | ~TBD (run to populate) | ~TBD | Writes Proposal to persistent storage, increments counter |
| `cast_vote` | ~TBD | ~TBD | Reads token balance + proposal, writes HasVoted + VoteRecord |
| `finalise` (passed) | ~TBD | ~TBD | Reads proposal + vote totals, writes new state |
| `finalise` (rejected) | ~TBD | ~TBD | Same path, quorum not met |
| `cancel` | ~TBD | ~TBD | Admin auth + state write |
| `execute` | ~TBD | ~TBD | Admin auth + state write |

Run the benchmarks and fill in the table above with the printed values.

---

## Storage Budget Summary

### Governance Contract

| Item | Storage Tier | Estimated Entries | Notes |
|------|-------------|------------------|-------|
| Admin config (`Admin`, `VotingToken`, etc.) | Instance | 6 keys | Set once at init, low cost |
| `Proposal(id)` | Persistent | 1 per proposal | ~200–400 bytes per struct |
| `HasVoted(id, voter)` | Persistent | 1 per (proposal, voter) | 1 bool — minimal |
| `VoteRecord(id, voter)` | Persistent | 1 per (proposal, voter) | ~50 bytes |
| `LastProposal(proposer)` | Persistent | 1 per proposer | 8-byte timestamp |

### Token Contract

| Item | Storage Tier | Notes |
|------|-------------|-------|
| `Balance(address)` | Persistent | ~50 bytes per holder |
| `Admin` | Instance | Single key |
| `TotalSupply` | Instance | Single i128 |
| `Allowance(owner, spender)` | Temporary | Expires each ledger |

### Storage Costs (Soroban fee schedule, approximate)

| Tier | Write fee | Read fee | TTL |
|------|-----------|----------|-----|
| Instance | Lowest | Lowest | Contract lifetime |
| Persistent | Medium | Low | Requires bump to stay live |
| Temporary | Low | Low | Expires after a few ledgers |

> **Important:** Persistent storage entries must be bumped regularly (via `env.storage().persistent().bump()`) or they expire. The governance contract bumps proposal entries on every read. If a proposal sits unread for an extended period, it may need a manual TTL bump.

---

## Interpreting Results

**CPU instructions** map to the Soroban fee resource `cpu_insns`. The network charges a fee proportional to instructions used. Higher instruction counts raise the transaction fee.

**Memory bytes** map to the `mem_bytes` resource. Large memory use increases fees and can hit the per-transaction memory cap.

Both resources are bounded per transaction by the Soroban network limits. As of Stellar Protocol 21:

| Resource | Per-transaction limit |
|----------|----------------------|
| CPU instructions | 100,000,000 |
| Memory bytes | 40,000,000 |
| Read ledger entries | 40 |
| Write ledger entries | 25 |
| Read bytes | 200,000 |
| Write bytes | 66,560 |

All CosmosVote governance operations stay well within these limits for typical usage.

---

## Benchmark Test Location

Source: [`contracts/governance/src/benchmarks.rs`](../contracts/governance/src/benchmarks.rs)

```
cargo test bench_create_proposal --features testutils -- --nocapture
cargo test bench_cast_vote       --features testutils -- --nocapture
cargo test bench_finalise_passed --features testutils -- --nocapture
cargo test bench_finalise_rejected --features testutils -- --nocapture
cargo test bench_cancel          --features testutils -- --nocapture
cargo test bench_execute         --features testutils -- --nocapture
```
