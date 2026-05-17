# Contributing to CosmosVote

Thank you for your interest in contributing to CosmosVote! This document explains how to get involved.

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## How to Contribute

### Reporting Bugs

Open a GitHub Issue with:
- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Rust version and OS

### Suggesting Features

Open a GitHub Discussion or Issue tagged `enhancement`. Describe the use case and proposed API.

### Submitting Code

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-username/cosmosvote.git`
3. **Create a branch**: `git checkout -b feat/your-feature-name`
4. **Make your changes**
5. **Run the full check suite**:
   ```bash
   make fmt
   make lint
   make test
   make build
   ```
6. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add proposal delegation support
   fix: prevent quorum bypass on abstain-only votes
   docs: update lifecycle diagram
   test: add edge case for zero-balance voter
   ```
7. **Push** your branch: `git push origin feat/your-feature-name`
8. **Open a Pull Request** against `main`

## Pull Request Requirements

- [ ] All tests pass (`make test`)
- [ ] No Clippy warnings (`make lint`)
- [ ] Code is formatted (`make fmt-check`)
- [ ] New features include tests
- [ ] Bug fixes include a regression test
- [ ] Documentation updated if public API changed
- [ ] CHANGELOG.md updated under `[Unreleased]`

## Coding Standards

- Follow existing code style and module structure
- Use `checked_add` / `checked_sub` for all arithmetic on token amounts
- All public contract functions must call `require_auth()` on the caller
- Storage keys must use the established `InstanceKey` / `PersistentKey` / `TempKey` enums
- Emit events for every state transition
- Error codes must be added to `ContractError` with a unique `u32` discriminant

## Testing Requirements

- Unit tests go in `src/test.rs`
- Test helpers go in `src/test_helpers.rs`
- Property-based tests go in `src/prop_tests.rs`
- Use `env.mock_all_auths()` in tests
- Test both success and failure paths for every public function

## Security

If you discover a security vulnerability, **do not open a public issue**. See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Questions

Open a GitHub Discussion or reach out via the issue tracker.
