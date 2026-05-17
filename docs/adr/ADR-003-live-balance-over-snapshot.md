# ADR-003: Live Balance at Vote Time (Not Pre-Snapshot)

**Status:** Accepted  
**Date:** 2026-05-17

## Context

Token-weighted voting requires capturing each voter's balance. Two approaches exist:
1. **Pre-snapshot**: Record all balances at proposal creation time
2. **Live balance**: Fetch balance at the moment of voting

## Decision

Use live balance: fetch the voter's token balance at the time `cast_vote()` is called, and store it immutably as the vote weight.

## Rationale

- Pre-snapshot requires iterating all token holders at proposal creation — prohibitively expensive on-chain
- Live balance is O(1) per voter: one cross-contract call to `token.balance(voter)`
- The stored `VoteRecord.weight` is immutable after casting, preventing post-vote manipulation
- Transfer-then-vote attacks are mitigated: the attacker's balance is reduced after transfer, so they cannot vote with tokens they no longer hold

## Consequences

- A voter who transfers tokens before voting loses that voting power
- A voter who receives tokens before voting gains that voting power
- Flash-loan attacks are mitigated because the loan must be repaid before the transaction ends, leaving the attacker with zero balance at vote time
- Vote weights are stored persistently and form an immutable audit trail
