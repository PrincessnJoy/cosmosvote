# Audit Readiness Checklist

This document tracks the readiness of the CosmosVote codebase for an external security audit.
Update each item as work is completed and reference relevant PRs or commits.

---

## 1. Test Coverage

| Item | Status | Notes |
|------|--------|-------|
| All public contract functions have unit tests | ✅ Done | `contracts/governance/src/test.rs`, `contracts/token/src/test.rs` |
| Edge-case and boundary-value tests exist | ✅ Done | See `prop_tests.rs`, `fuzz_tests.rs` |
| Input validation tests (invalid params, overflow) | ✅ Done | See issue [#367](https://github.com/PrincessnJoy/cosmosvote/issues/367) |
| Integration tests covering full proposal lifecycle | ✅ Done | `tests/integration_tests.rs` |
| Property-based / fuzz tests | ✅ Done | `contracts/governance/src/prop_tests.rs`, `fuzz_tests.rs` |
| Test coverage ≥ 80 % (line) | ⬜ Pending | Run `cargo tarpaulin` to generate report |

---

## 2. Documentation

| Item | Status | Notes |
|------|--------|-------|
| Architecture overview | ✅ Done | `README.md`, `docs/governance-model.md` |
| Contract API reference | ✅ Done | `docs/api/governance.md`, `docs/api/token.md` |
| Storage layout documented | ✅ Done | `docs/storage.md` |
| Error codes documented | ✅ Done | `docs/errors.md` |
| Threat model documented | ✅ Done | `docs/security/threat-model.md` |
| Audit scope defined | ✅ Done | `docs/security/audit-scope.md` |
| Event emission audit trail | ✅ Done | `docs/event-emission-audit.md` |
| Known issues / accepted risks listed | ✅ Done | `docs/security/known-issues.md` |
| ADRs for all major design decisions | ✅ Done | `docs/adr/` |
| CHANGELOG up to date | ✅ Done | `CHANGELOG.md` |

---

## 3. Code Hygiene

| Item | Status | Notes |
|------|--------|-------|
| No compiler warnings (`cargo build`) | ✅ Done | CI enforces `-D warnings` |
| Clippy clean (`cargo clippy`) | ✅ Done | `make lint` |
| No unused `#[allow(...)]` suppressions | ⬜ Pending | Manual review needed |
| All `unwrap()`/`expect()` removed from production paths | ✅ Done | Contract panics use `ContractError` |
| Arithmetic uses checked ops (`checked_add`, etc.) | ✅ Done | See `ArithmeticOverflow` error |
| No hardcoded addresses or secrets | ✅ Done | Config via env / `.env` |
| `require_auth()` on every state-changing entry point | ✅ Done | Verified in `lib.rs` |
| Double-vote guard in place | ✅ Done | Persistent `HasVoted` flag |
| Contract pause mechanism present | ✅ Done | `paused` flag in instance storage |

---

## 4. Required Auditor Artifacts

The following must be provided to the audit firm before engagement begins:

- [ ] Final WASM binaries (reproducible build via `make build`)
- [ ] Git commit hash of audited revision
- [ ] Dependency tree (`cargo tree`)
- [ ] `cargo audit` output (zero high/critical findings)
- [ ] Completed `docs/security/audit-scope.md`
- [ ] Access to this repository (read-only)
- [ ] Contact for technical questions during the audit

---

## 5. Known Risks & Remediation Priorities

| Risk | Severity | Remediation | Status |
|------|----------|-------------|--------|
| `restrict_admin_vote` semantics ambiguity | Low | Documented in ADR-007, behaviour locked | ✅ Resolved |
| Off-chain notification service has no RBAC | Low | See issue [#368](https://github.com/PrincessnJoy/cosmosvote/issues/368) | ⬜ In Progress |
| No on-chain upgrade path | Informational | Accepted — immutable contracts by design | ✅ Accepted |
| Token balance used as live voting weight (no snapshot) | Low | Accepted risk — documented in ADR-003 | ✅ Accepted |
| Frontend XSS surface (wallet message display) | Low | Sanitization documented in `docs/wallet-message-sanitization.md` | ✅ Resolved |

---

## 6. Pre-Audit Sign-off

Before scheduling an audit, all ✅ items above must remain green and all ⬜ items must be resolved or explicitly accepted with a written rationale.

| Approver | Role | Date |
|----------|------|------|
| — | Lead Developer | — |
| — | Security Lead | — |
