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

### T6 — Wallet Compromise
**Goal:** Attacker steals private key or mnemonic to hijack admin or voter address.  
**Mitigations:** Use hardware wallets for admin key storage; consider multisig admin for critical operations; rotate keys promptly on suspected compromise; `restrict_admin_vote` flag limits damage from a compromised admin address.  
**Residual Risk:** High (off-chain threat — use hardware wallet + multisig)

### T7 — RPC Spoofing / Man-in-the-Middle
**Goal:** Malicious RPC endpoint returns falsified ledger state to mislead clients into believing proposals passed/failed or votes were recorded incorrectly.  
**Mitigations:** Verify transactions via multiple independent RPC endpoints; check on-chain events against known contract IDs; use HTTPS with certificate pinning; clients should verify Stellar Horizon responses with XDR validation.  
**Residual Risk:** Medium (client-side threat — use trusted RPC providers)

## Security Properties

| Property | Implementation |
|----------|---------------|
| Vote integrity | One vote per address; weight = live balance at vote time |
| Admin confinement | Admin cannot alter votes or tallies |
| Initialization safety | One-time init guard; admin/token immutable after |
| Arithmetic safety | `checked_add` on all vote accumulation |
| Finalization correctness | Pass condition evaluated atomically |
| Emergency response | Admin pause blocks all state-changing ops |
| Wallet security | Hardware wallets + multisig recommended for admin; `restrict_admin_vote` limits key-compromise blast radius |
| RPC integrity | Multi-endpoint verification + XDR validation guards against spoofed ledger responses |
