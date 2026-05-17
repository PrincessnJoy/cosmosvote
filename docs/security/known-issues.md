# Known Issues

## KI-001: Flash-Loan Voting Attack

**Severity:** Low (mitigated)  
**Description:** An attacker could borrow a large token balance, vote, then repay — inflating their vote weight.  
**Mitigation:** Soroban transactions are atomic. A flash loan must be repaid within the same transaction. After repayment the attacker's balance is zero, so `cast_vote` returns `NoVotingPower`.  
**Status:** Mitigated by design.

## KI-002: Admin Is a Single Point of Trust

**Severity:** Medium (accepted)  
**Description:** The admin address has broad privileges (cancel, execute, pause, update quorum). A compromised admin key can disrupt governance.  
**Mitigation:** Use a multisig or timelock contract as the admin address in production. The `restrict_admin_vote` flag limits admin influence on voting.  
**Status:** Accepted risk. Documented.

## KI-003: Token Contract External Dependency

**Severity:** High (accepted)  
**Description:** The governance contract trusts the token contract to return accurate balances. A malicious or buggy token contract could return inflated balances.  
**Mitigation:** Deploy and audit the token contract before initializing governance. Token address is immutable after initialization.  
**Status:** Accepted risk. Deployer responsibility.

## KI-004: No On-Chain Proposal Execution Payload

**Severity:** Info  
**Description:** The `execute()` function marks a proposal as Executed but does not execute any on-chain payload. Execution is off-chain by convention.  
**Mitigation:** This is a deliberate design choice for v1. On-chain execution payloads are on the roadmap.  
**Status:** Known limitation.
