# ADR-004: Three-Way Voting (Yes / No / Abstain)

**Status:** Accepted  
**Date:** 2026-05-17

## Context

Binary yes/no voting forces voters to choose a side or abstain by not voting. This conflates "I don't care" with "I didn't participate."

## Decision

Support three vote types: `Yes`, `No`, and `Abstain`.

Pass conditions:
```
total_votes = yes + no + abstain
Passed if total_votes >= quorum AND yes > no
```

## Rationale

- Abstain allows voters to signal participation without taking a position
- Abstain counts toward quorum, ensuring minimum participation is met
- Abstain does not affect the yes/no outcome, preserving neutrality
- Tie (yes == no) results in rejection — the status quo is preserved when there is no clear majority

## Consequences

- A proposal can meet quorum entirely through abstain votes and still be rejected
- Voters who want to block a proposal without voting No can abstain to help meet quorum while keeping the outcome neutral
- The three-way model is slightly more complex to explain but more expressive
