# On-Chain Events Reference

All events follow the Soroban event format: a **topics tuple** and a **data tuple**.

---

## Token Contract Events

Contract prefix: `"token"` (`symbol_short!("token")`)

| Event | Topics | Data | Description |
|-------|--------|------|-------------|
| `initialized` | `("token", "init")` | `(admin: Address, supply: i128)` | Emitted once on contract initialization |
| `transfer` | `("token", "xfer")` | `(from: Address, to: Address, amount: i128)` | Token transfer between accounts |
| `approval` | `("token", "approve")` | `(owner: Address, spender: Address, amount: i128)` | Allowance set by owner for spender |
| `minted` | `("token", "mint")` | `(admin: Address, to: Address, amount: i128)` | New tokens minted by admin |
| `burned` | `("token", "burn")` | `(admin: Address, from: Address, amount: i128)` | Tokens burned by admin |
| `admin_transferred` | `("token", "admin")` | `(old_admin: Address, new_admin: Address)` | Admin privileges transferred |

---

## Governance Contract Events

Contract prefix: `"gov"` (`symbol_short!("gov")`)

| Event | Topics | Data | Description |
|-------|--------|------|-------------|
| `initialized` | `("gov", "init")` | `(admin: Address, token: Address)` | Emitted once on contract initialization |
| `proposal_created` | `("gov", "created")` | `(id: u64, proposer: Address, title: String, quorum: i128, end_time: u64)` | New proposal created |
| `vote_cast` | `("gov", "voted")` | `(proposal_id: u64, voter: Address, vote: Vote, weight: i128)` | Vote cast on a proposal |
| `proposal_finalized` | `("gov", "final")` | `(proposal_id: u64, state: ProposalState)` | Proposal finalized (Passed or Rejected) |
| `proposal_executed` | `("gov", "exec")` | `(proposal_id: u64, admin: Address)` | Passed proposal executed by admin |
| `proposal_cancelled` | `("gov", "cancel")` | `(proposal_id: u64, admin: Address)` | Active proposal cancelled by admin |
| `quorum_updated` | `("gov", "quorum")` | `(proposal_id: u64, old_quorum: i128, new_quorum: i128)` | Proposal quorum updated by admin |
| `admin_transferred` | `("gov", "admin")` | `(old_admin: Address, new_admin: Address)` | Admin transfer completed (legacy single-step) |
| `admin_transfer_initiated` | `("gov", "admint")` | `(current_admin: Address, pending_admin: Address)` | Two-step admin transfer initiated |
| `admin_transfer_completed` | `("gov", "admina")` | `(previous_admin: Address, new_admin: Address)` | Two-step admin transfer completed |
| `paused` | `("gov", "paused")` | `admin: Address` | Contract paused by admin |
| `unpaused` | `("gov", "unpause")` | `admin: Address` | Contract unpaused by admin |

---

## Standardized Schema: `admin_transferred`

Both contracts emit an admin transfer event with the **same data schema**:

- **Topics:** `("<contract_prefix>", "admin")`
- **Data:** `(old_admin: Address, new_admin: Address)`

This consistent schema allows indexers to handle admin transfers uniformly across both contracts by filtering on the second topic `"admin"`.

---

## Indexing Notes

- All topics use `symbol_short!` (max 9 ASCII chars).
- Events are emitted via `env.events().publish(topics, data)`.
- Off-chain indexers should filter by the first topic (`"token"` or `"gov"`) to distinguish contract sources.
