# ADR-005: On-Chain Events for All State Transitions

**Status:** Accepted  
**Date:** 2026-05-17

## Context

Off-chain applications (frontends, indexers, analytics) need to track governance activity without polling contract state.

## Decision

Emit a Soroban event for every state-changing operation:
- Contract initialized
- Proposal created
- Vote cast
- Proposal finalized (Passed/Rejected)
- Proposal executed
- Proposal cancelled
- Quorum updated
- Admin transferred
- Contract paused/unpaused

## Rationale

- Events are cheaper than storage for off-chain consumption
- Soroban events are indexed by the Stellar network and queryable via RPC
- Events provide an immutable audit trail independent of contract storage
- Off-chain indexers can reconstruct full governance history from events alone

## Consequences

- Every state-changing call has a small additional cost for event emission
- Event data is not queryable from within contracts (write-only from contract perspective)
- Off-chain consumers must handle event parsing and potential reorgs
