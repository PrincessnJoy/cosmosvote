# ADR-002: Token-Weighted Voting

**Status:** Accepted  
**Date:** 2026-05-17

## Context

CosmosVote needs a voting model that is fair, transparent, and resistant to manipulation.

## Decision

Vote weight = voter's governance token balance at the time of voting.

## Rationale

- Aligns voting power with economic stake in the protocol
- Standard model for DAO governance (used by Compound, Uniswap, etc.)
- Simple to implement and audit
- Token balance is already stored on-chain; no additional snapshot infrastructure needed

## Consequences

- Voters with more tokens have proportionally more influence
- Plutocratic by design — accepted tradeoff for economic alignment
- Token distribution determines governance power; fair initial distribution is critical
- See ADR-003 for how balance manipulation is prevented
