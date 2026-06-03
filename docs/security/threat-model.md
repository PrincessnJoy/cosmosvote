# Threat Model

## Threat Actors

### T1 — Malicious Voter
**Goal:** Cast more votes than balance entitles, or vote multiple times.  
**Mitigations:** `has_voted` guard, zero-balance check, vote weight captured immutably at vote time, flash-loan mitigation (loan repaid before tx ends → zero balance).  
**Residual Risk:** None

### T2 — Malicious Proposer
**Goal:** Create proposals that pass without genuine support.  
**Mitigations:** Quorum enforcement, `min_proposal_balance`, `proposal_cooldown`, admin cancel.  
**Residual Risk:** Low

### T3 — Malicious Admin
**Goal:** Abuse privileged functions to manipulate outcomes.  
**Mitigations:** Admin can only cancel/execute — cannot alter votes or tallies. Admin vote restriction option. Events make all admin actions auditable.  
**Residual Risk:** Medium (by design — admin is a trusted role; use multisig in production)

### T4 — External Attacker (No Tokens)
**Goal:** Disrupt governance without holding tokens.  
**Mitigations:** `require_auth()` on all state-changing ops, initialization guard, state machine checks.  
**Residual Risk:** None

### T5 — Compromised Token Contract
**Goal:** Return inflated balances to favored voters.  
**Mitigations:** Admin must deploy a trustworthy token; token address is immutable after init.  
**Residual Risk:** High (external dependency — accepted)

## Security Properties

| Property | Implementation |
|----------|---------------|
| Vote integrity | One vote per address; weight = live balance at vote time |
| Admin confinement | Admin cannot alter votes or tallies |
| Initialization safety | One-time init guard; admin/token immutable after |
| Arithmetic safety | `checked_add` on all vote accumulation |
| Finalization correctness | Pass condition evaluated atomically |
| Emergency response | Admin pause blocks all state-changing ops |
.
