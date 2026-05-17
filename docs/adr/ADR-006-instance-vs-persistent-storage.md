# ADR-006: Instance vs Persistent vs Temporary Storage

**Status:** Accepted  
**Date:** 2026-05-17

## Context

Soroban provides three storage tiers with different cost and lifetime characteristics. Choosing the right tier for each data type is critical for cost efficiency.

## Decision

| Data | Tier | Rationale |
|------|------|-----------|
| Admin, VotingToken, config | Instance | Read on every call; cheapest per-read cost |
| Proposals, vote records | Persistent | Must survive ledger expiry; per-proposal lifetime |
| Token allowances | Temporary | Short-lived; expires naturally with ledger TTL |

## Rationale

**Instance storage** is loaded once per contract invocation at a fixed overhead cost. Config values (admin, token address, paused state) are read on nearly every call, making instance storage the most cost-effective choice.

**Persistent storage** entries survive ledger expiry independently. Proposal and vote data must be available indefinitely (or until explicitly deleted), making persistent storage the correct tier.

**Temporary storage** entries expire when the ledger entry TTL expires. Token allowances are inherently short-lived (set, used, forgotten), so temporary storage avoids paying for long-term persistence.

## Consequences

- Instance storage entries share a single TTL bump; all config is extended together
- Persistent storage entries may need explicit TTL extension for very long-lived proposals
- Temporary allowances will expire if not used within the ledger TTL window
