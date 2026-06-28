# Soroban Contract Security Checklist

Use this checklist before every code review, pre-audit review, and mainnet
deployment.  Each item links to the relevant section of the CosmosVote
codebase or Soroban documentation where applicable.

---

## 1. Code Review

### Authorization

- [ ] Every state-changing function calls `address.require_auth()` or
      `address.require_auth_for_args()` before touching storage.
- [ ] Admin-only functions verify the caller is the stored admin address
      (`GovernanceStorage::admin()`).
- [ ] No function allows an arbitrary caller to act on behalf of another
      address without explicit authorization.

### Input Validation

- [ ] `title` length is checked: 1–128 bytes (`InvalidTitle`).
- [ ] `description` length is checked: 1–1024 bytes (`InvalidDescription`).
- [ ] `quorum` is positive and does not exceed total token supply
      (`InvalidQuorum`, `QuorumExceedsSupply`).
- [ ] `duration` is within bounds: 60–2_592_000 seconds (`InvalidDurationRange`).
- [ ] All `i128` token amounts are validated as non-negative before use.

### Arithmetic & Overflow

- [ ] All vote accumulation uses `checked_add` (never raw `+`).
- [ ] No unchecked arithmetic on `i128` supply or balance values.
- [ ] Subtraction of unsigned values (`u64` timestamps) is guarded against
      underflow.

### State Machine

- [ ] Proposals may only transition through defined states:
      `Active → Passed/Rejected/Cancelled`, `Passed → Executed`.
- [ ] `finalise()` is only callable when `timestamp > end_time`.
- [ ] `execute()` is only callable on `Passed` proposals.
- [ ] `cancel()` is only callable on `Active` proposals.
- [ ] `cast_vote()` is only callable while the proposal is `Active` and
      within the voting window.

### Double-Vote Prevention

- [ ] `HasVoted(proposal_id, voter)` is written to persistent storage
      **before** vote weight is added to totals.
- [ ] `try_cast_vote` on an already-voted address returns `AlreadyVoted`.

### Initialization Guard

- [ ] `initialize()` checks `ContractState::Uninitialized` and returns
      `AlreadyInitialized` on re-call.
- [ ] Admin and token addresses are immutable after initialization.

### Reentrancy

- [ ] Cross-contract calls (token `balance`, `total_supply`) are read-only
      and do not modify governance state.
- [ ] No state is written after a cross-contract call that could be
      re-entered (Soroban's single-threaded execution model prevents
      classical reentrancy, but ordering is still reviewed).

### Admin Access Controls

- [ ] Admin cannot alter vote tallies or proposal outcomes directly.
- [ ] Admin vote restriction (`restrict_admin_vote`) is enforced in
      `cast_vote`.
- [ ] Admin transfer uses a two-step pending-admin pattern to prevent
      accidental lock-out.
- [ ] Pause/unpause emits events for auditability.

### Storage

- [ ] Storage keys are unique across all `DataKey` variants.
- [ ] `Persistent` storage is used for proposals and vote records
      (survives ledger expiry).
- [ ] `Instance` storage is used for contract configuration
      (admin, token, flags).
- [ ] No sensitive data (private keys, off-chain secrets) is stored on-chain.

### Events

- [ ] Every state transition emits a corresponding on-chain event.
- [ ] Event topics are stable and documented (breaking changes require a
      version bump).

---

## 2. Test Coverage

- [ ] All `ContractError` variants are exercised by at least one test.
- [ ] Property-based fuzz tests cover `create_proposal` input boundaries
      (`fuzz_tests.rs`).
- [ ] Double-vote invariant is covered by proptest (`prop_tests.rs`).
- [ ] Full proposal lifecycle (create → vote → finalise → execute) is
      covered by integration tests.
- [ ] Failure paths (invalid inputs, wrong state, insufficient balance) are
      covered.
- [ ] `make test` passes with zero failures and zero warnings treated as
      errors (`RUSTFLAGS="-D warnings"`).

---

## 3. Audit Preparation

- [ ] `AUDIT.md` is up to date with the current contract version and scope.
- [ ] `docs/security/audit-scope.md` lists all in-scope files and
      functions.
- [ ] `docs/security/threat-model.md` is reviewed and accurate.
- [ ] All known issues in `docs/security/known-issues.md` are either fixed
      or have accepted risk documented.
- [ ] No `TODO`, `FIXME`, or `HACK` comments remain in production code.
- [ ] No `unwrap()` or `expect()` calls exist in contract code
      (use `?` with `ContractError` instead).
- [ ] Dependency versions in `Cargo.toml` are pinned (no open ranges).

---

## 4. Deployment

### Pre-deployment

- [ ] WASM binary is built in release mode: `make build`.
- [ ] WASM binary hash matches the expected SHA-256 checksum.
- [ ] Contract has been deployed and tested on **testnet** before mainnet.
- [ ] Admin address is a multisig wallet (see
      `docs/admin-multisig-pattern.md`), not a single EOA.
- [ ] Token contract address is verified and immutable.

### Deployment execution

- [ ] `initialize()` is called in the same transaction as contract
      deployment (to prevent front-running of initialization).
- [ ] `min_proposal_balance` and `proposal_cooldown` are set to prevent
      proposal spam.
- [ ] `restrict_admin_vote` is set according to the governance policy.
- [ ] Deployment transaction is signed by the authorized admin key(s).

### Post-deployment

- [ ] On-chain configuration is verified via `get_config()`.
- [ ] A smoke-test proposal is created on testnet and carried through the
      full lifecycle before mainnet deployment.
- [ ] Event indexer is operational and receiving events from the deployed
      contract.
- [ ] `CHANGELOG.md` is updated with the deployed version and contract IDs.

---

## 5. Attack Surface Areas

| Area | Risk | Mitigation | Status |
|---|---|---|---|
| Reentrancy | Low (Soroban single-threaded) | State written before cross-contract calls | ✅ Mitigated |
| Integer overflow | Low | `checked_add` on all accumulation | ✅ Mitigated |
| Admin key compromise | Medium | Multisig admin recommended | ⚠️ Config-dependent |
| Flash-loan voting | Low | Balance read at vote time; loan repaid before tx ends | ✅ Mitigated |
| Proposal spam | Low | `min_proposal_balance` + `proposal_cooldown` | ✅ Configurable |
| Unauthorized state change | None | `require_auth()` on all write ops | ✅ Mitigated |
| Token contract manipulation | High | Token address immutable; external dependency risk accepted | ⚠️ External |
| Re-initialization | None | `AlreadyInitialized` guard | ✅ Mitigated |
| Quorum manipulation | Low | Quorum validated against live supply | ✅ Mitigated |
| Vote finalization race | None | Finalization callable by anyone after `end_time` | ✅ Mitigated |

---

## References

- [Soroban Security Model](https://developers.stellar.org/docs/smart-contracts/security)
- [CosmosVote Threat Model](./threat-model.md)
- [CosmosVote Audit Scope](./audit-scope.md)
- [CosmosVote Known Issues](./known-issues.md)
- [Admin Multisig Pattern](../admin-multisig-pattern.md)
