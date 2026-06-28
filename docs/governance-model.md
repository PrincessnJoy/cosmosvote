# Governance Model

Full reference for CosmosVote's proposal lifecycle, voting rules, and participation guide.

> See [`lifecycle.md`](./lifecycle.md) for the concise state-transition table.

---

## Proposal States

| State | Description |
|-------|-------------|
| **Active** | Voting is open. Anyone holding tokens may cast exactly one vote. |
| **Passed** | Voting period ended, quorum met, and Yes votes outnumber No votes. |
| **Rejected** | Voting period ended, but quorum was not met or Yes ≤ No. |
| **Cancelled** | Admin terminated the proposal before finalization. |
| **Executed** | Admin confirmed on-chain execution of a Passed proposal. |

### State Transition Rules

```
Active ──[finalise(), quorum met AND yes > no]──► Passed ──[execute()]──► Executed
Active ──[finalise(), quorum not met OR yes ≤ no]──► Rejected
Active ──[cancel()]──► Cancelled
```

- `finalise()` — permissionless; callable by anyone after the voting period ends.
- `execute()` / `cancel()` — admin-only.
- States are terminal (no re-opening a Rejected or Cancelled proposal).

---

## Quorum

Quorum is the **minimum total votes** (Yes + No + Abstain) required for a proposal to be eligible to pass.

```
total_votes = votes_yes + votes_no + votes_abstain
quorum_met  = total_votes >= proposal.quorum
```

- Quorum is set per proposal at creation time and is immutable.
- A proposal that meets quorum but has Yes ≤ No is still **Rejected**.
- A proposal that fails quorum is **always Rejected**, regardless of the yes/no split.

### Choosing a Quorum Value

| Scenario | Suggested Quorum |
|----------|-----------------|
| Minor parameter update | 5–10% of circulating supply |
| Major protocol change | 20–33% of circulating supply |
| Emergency action | Defined by admin governance policy |

---

## Vote Types & Abstain Handling

| Vote | Counts toward quorum | Counts toward outcome |
|------|---------------------|----------------------|
| Yes | ✓ | ✓ (for passing) |
| No | ✓ | ✓ (against passing) |
| Abstain | ✓ | ✗ |

**Abstain** signals participation without taking a position. It helps proposals reach quorum without influencing the Yes/No outcome — useful when a voter acknowledges the proposal but has no preference.

---

## Finalization

Anyone may call `finalise()` once `env.ledger().timestamp() >= proposal.end_time`.

```
Pass  if quorum_met AND votes_yes > votes_no
Reject otherwise (includes ties: votes_yes == votes_no)
```

There is no automatic finalization — an explicit call is required. This is intentional: it avoids automatic on-chain computation and gives participants time to verify results before state transition.

---

## Guide for Proposal Creators

### Prerequisites

- Hold at least `min_proposal_balance` governance tokens (set at contract initialization).
- Respect the `proposal_cooldown` — you cannot create a new proposal until the cooldown since your last proposal has elapsed.

### Creating a Proposal

```rust
create_proposal(
    env,
    proposer,          // your address (must sign)
    title,             // 1–128 characters
    description,       // 1–1024 characters
    quorum,            // minimum total votes required (> 0, ≤ total supply)
    duration,          // voting window in seconds (60s – 2,592,000s / 30 days)
)
```

### Best Practices

1. **Set a realistic quorum.** Too high and the proposal can never pass; too low and a small minority decides.
2. **Write a clear description.** The description is stored on-chain permanently — be precise about what change is being proposed and why.
3. **Announce before submitting.** Off-chain discussion (Discord, forums) before on-chain submission improves turnout.
4. **Monitor the voting period.** Encourage token holders to vote before `end_time`.

### Example

```
Title:       "Increase min_proposal_balance to 10,000 VOTE"
Description: "Current 1,000 VOTE minimum allows spam proposals. Raising to
              10,000 VOTE aligns with community governance guidelines.
              See forum post: https://..."
Quorum:      5_000_000   // 5M tokens
Duration:    604_800     // 7 days
```

---

## Guide for Voters

### Checking a Proposal

```rust
// Off-chain via RPC:
get_proposal(env, proposal_id) -> Proposal
```

Key fields to review: `title`, `description`, `quorum`, `end_time`, current `votes_yes / votes_no / votes_abstain`.

### Casting a Vote

```rust
cast_vote(
    env,
    voter,        // your address (must sign)
    proposal_id,
    Vote::Yes     // or Vote::No or Vote::Abstain
)
```

- Each address may vote **exactly once** per proposal.
- Vote weight equals your **token balance at the time of voting**.
- Votes are **immutable** — you cannot change your vote after casting.

### When to Use Each Vote

| Situation | Recommended vote |
|-----------|-----------------|
| You support the change | Yes |
| You oppose the change | No |
| You want to help reach quorum but have no preference | Abstain |
| You have a conflict of interest | Abstain |

### Example Voting Session

```
Proposal ID: 42  —  "Upgrade Protocol v2"
Quorum:      5,000,000 VOTE
End time:    2026-07-01T00:00:00Z
Current:     Yes: 3.1M  No: 0.8M  Abstain: 0.6M  (total: 4.5M)

Your balance: 700,000 VOTE

cast_vote(env, your_address, 42, Vote::Yes)
  → New total: 5.2M (quorum met), Yes: 3.8M

After end_time, anyone calls finalise():
  5.2M >= 5M (quorum met) AND 3.8M > 0.8M → Passed
```

---

## Related Docs

- [`lifecycle.md`](./lifecycle.md) — state machine quick reference
- [`storage.md`](./storage.md) — on-chain data structures
- [`errors.md`](./errors.md) — error codes and meanings
- [`README.md`](../README.md) — contract function signatures
