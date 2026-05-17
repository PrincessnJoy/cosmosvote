# Audit Report

## Status

| Contract | Version | Status | Date |
|----------|---------|--------|------|
| cosmosvote-governance | 1.0.0 | Pending | — |
| cosmosvote-token | 1.0.0 | Pending | — |

## Scope

The audit covers:

- `contracts/governance/src/` — all source files
- `contracts/token/src/` — all source files

Out of scope:
- Frontend code
- Deployment scripts
- Off-chain indexers

## Audit Scope Details

See [docs/security/audit-scope.md](./docs/security/audit-scope.md) for the full scope document.

## Findings

No external audit has been completed yet. Internal review findings:

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| INT-001 | Info | Admin is a trusted role with broad privileges | Accepted |
| INT-002 | Info | Token balance fetched at vote time (live, not snapshot) | Accepted |

## Requesting an Audit

If you are a security researcher or auditing firm interested in auditing CosmosVote, please contact **security@cosmosvote.dev**.
