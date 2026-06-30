# Dependency Vulnerability Scanning

This document explains how dependency vulnerability scanning works in CosmosVote and how to address alerts.

## Overview

Two complementary mechanisms are in place:

| Mechanism | Scope | Trigger |
|-----------|-------|---------|
| GitHub Dependabot | Rust (Cargo) + Node (npm) + GitHub Actions | Weekly (Monday) + on push |
| `dependency-scan.yml` workflow | Rust (`cargo audit`) + Node (`npm audit`) | Every PR, push to main/develop, weekly |

## How It Works

### Rust — cargo audit

[`cargo audit`](https://crates.io/crates/cargo-audit) checks `Cargo.lock` against the [RustSec Advisory Database](https://rustsec.org/). Any advisory with a published CVE causes the job to fail.

Run locally:
```bash
cargo install cargo-audit --locked
cargo audit
```

### Node — npm audit

`npm audit` checks `frontend/package-lock.json` against the npm security registry. The CI step fails on **critical** severity findings only (`--audit-level=critical`).

Run locally:
```bash
cd frontend
npm audit
npm audit --audit-level=critical   # mirrors CI
```

### Dependabot

Dependabot automatically opens PRs to upgrade vulnerable dependencies. It is configured in [`.github/dependabot.yml`](../.github/dependabot.yml) with weekly scans for:
- Cargo (workspace root)
- npm (`/frontend`)
- GitHub Actions

## Addressing Alerts

### Dependabot PRs

1. Review the opened PR — check the changelog and any breaking changes.
2. If safe, merge the PR. Tests and scans run automatically.
3. If a breaking upgrade is required, update consuming code accordingly before merging.

### cargo audit failures

1. Run `cargo audit` locally and read the advisory details.
2. **Upgrade**: update the version in `Cargo.toml` and run `cargo update`.
3. **Ignore** (temporary, with justification): add an entry to `audit.toml`:
   ```toml
   [advisories]
   ignore = ["RUSTSEC-XXXX-XXXX"]
   ```
   Document the reason and set a review date.

### npm audit failures

1. Run `npm audit` in `frontend/` to see the full report.
2. **Upgrade**: `npm update <package>` or bump the version in `package.json`.
3. **Force-fix**: `npm audit fix` (avoid `--force` unless you understand breaking changes).
4. **Ignore**: add a resolution to `package.json` if a fix is not yet available, and track the issue.

## Supported Versions

| Toolchain | Version |
|-----------|---------|
| Rust (MSRV) | 1.75+ |
| TypeScript | 5.4.5 |
| Node.js | 20 LTS |
