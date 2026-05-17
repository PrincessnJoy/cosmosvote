# Audit Scope

## In Scope

### cosmosvote-governance (v1.0.0)

| File | Description |
|------|-------------|
| `contracts/governance/src/lib.rs` | Main contract — all public functions |
| `contracts/governance/src/storage.rs` | Storage accessors and key definitions |
| `contracts/governance/src/events.rs` | Event emission |
| `contracts/governance/src/types.rs` | Error codes and data structures |

Key areas of focus:
- Authorization checks (`require_auth`)
- Double-vote prevention
- Quorum and pass condition logic
- State machine transitions
- Arithmetic overflow handling
- Initialization guard

### cosmosvote-token (v1.0.0)

| File | Description |
|------|-------------|
| `contracts/token/src/lib.rs` | Token contract — all public functions |
| `contracts/token/src/storage.rs` | Storage accessors |
| `contracts/token/src/events.rs` | Event emission |
| `contracts/token/src/types.rs` | Error codes |

Key areas of focus:
- Balance accounting (mint, burn, transfer)
- Allowance logic
- Admin controls
- Initialization guard

## Out of Scope

- Frontend code (`frontend/`)
- Deployment scripts (`scripts/`)
- Test files (`src/test.rs`, `src/prop_tests.rs`)
- Off-chain indexers

## Audit Checklist

- [ ] All public functions have `require_auth()` where appropriate
- [ ] No integer overflow in token arithmetic
- [ ] No reentrancy vectors
- [ ] Storage keys are unique and correctly typed
- [ ] Error codes are unique and correctly mapped
- [ ] Events emitted for all state transitions
- [ ] Initialization guard prevents re-initialization
- [ ] State machine transitions are exhaustive and correct
