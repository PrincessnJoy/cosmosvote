# Mutation Testing

Mutation testing verifies that the existing test suite catches real logic faults by introducing small code changes (mutants) and confirming tests fail.

---

## Tool: cargo-mutants

[`cargo-mutants`](https://mutants.rs/) is the standard mutation testing tool for Rust. It works without any source changes and integrates naturally with Cargo workspaces.

### Installation

```bash
cargo install cargo-mutants
```

### Quick Run (governance contract only)

```bash
cargo mutants -p cosmosvote-governance --features testutils
```

### Full Workspace Run

```bash
cargo mutants --features testutils
```

Results are written to `mutants.out/` — survivors (mutants not caught by tests) are in `mutants.out/missed.txt`.

---

## Makefile Target

Add to `Makefile`:

```makefile
## Run mutation tests against governance contract
mutants:
	cargo mutants -p cosmosvote-governance --features testutils
```

Run with:

```bash
make mutants
```

---

## Key Areas to Target

Focus mutation runs on the governance logic most critical for correctness:

| File | Critical logic |
|------|---------------|
| `contracts/governance/src/lib.rs` | `cast_vote`, `finalise`, `create_proposal` |
| `contracts/governance/src/storage.rs` | `has_voted`, proposal read/write |

To limit the run to specific files:

```bash
cargo mutants -p cosmosvote-governance --features testutils \
  -- contracts/governance/src/lib.rs \
     contracts/governance/src/storage.rs
```

---

## Interpreting Results

| Outcome | Meaning |
|---------|---------|
| **Caught** | A test failed when the mutant was applied — test suite is effective |
| **Missed** (survivor) | No test failed — a logic fault could go undetected |
| **Timeout** | Mutant caused a test to hang — treat like missed |
| **Unviable** | Mutant failed to compile — not relevant to test quality |

A **mutation score** is calculated as:

```
score = caught / (caught + missed + timeout)  × 100%
```

Target score: ≥ 80% for governance logic.

---

## Mutation Score Baseline & Remediation

Run `cargo mutants` and record results in this table after each significant change:

| Date | Caught | Missed | Score | Notes |
|------|--------|--------|-------|-------|
| _(run to populate)_ | — | — | — | Baseline |

### Remediating Survivors

For each entry in `mutants.out/missed.txt`:

1. Read the mutant diff — understand what logic was changed.
2. Identify which behavior is untested.
3. Add a targeted test that fails on the original mutant and passes on the correct code.
4. Re-run `cargo mutants` to confirm the survivor is now caught.

Common survivor patterns in governance contracts:

| Mutant pattern | Likely missing test |
|---------------|---------------------|
| `>=` changed to `>` in quorum check | Test where `total_votes == quorum` exactly |
| `>` changed to `>=` in yes/no comparison | Test tie scenario (yes == no → Rejected) |
| `has_voted` check removed | Test double-vote attempt |
| `require_auth()` removed | Test unauthorized call is rejected |

---

## CI Integration

Add to `.github/workflows/ci.yml` as an optional job:

```yaml
mutation-tests:
  runs-on: ubuntu-latest
  # Run only on push to main or manual trigger — mutation tests are slow
  if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - run: cargo install cargo-mutants
    - run: cargo mutants -p cosmosvote-governance --features testutils
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: mutants-out
        path: mutants.out/
```

---

## Related

- [cargo-mutants documentation](https://mutants.rs/)
- [`contracts/governance/src/test.rs`](../contracts/governance/src/test.rs) — unit tests
- [`contracts/governance/src/prop_tests.rs`](../contracts/governance/src/prop_tests.rs) — property-based tests
