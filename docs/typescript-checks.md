# TypeScript Compile Checks in CI

CI runs `tsc --noEmit` on all TypeScript packages to catch type errors before they reach production.

## Workflow

The workflow is defined in [`.github/workflows/typescript-check.yml`](../.github/workflows/typescript-check.yml) and runs on every push or pull request that modifies TypeScript source files.

### Packages checked

| Package | Directory | tsconfig |
|---------|-----------|---------|
| frontend | `frontend/` | `frontend/tsconfig.json` |

The `type-check` script in `frontend/package.json` runs `tsc --noEmit`, which validates all types without producing output files. Any type error causes the CI job to fail.

## Running locally

```bash
cd frontend
npm run type-check
```

## Supported TypeScript versions

| Package | TypeScript version |
|---------|-------------------|
| frontend | **5.4.5** (pinned in `frontend/package.json`) |

The project targets **ES2020** with strict mode enabled (`"strict": true`). Additional strictness flags:

- `noUnusedLocals` — error on unused local variables
- `noUnusedParameters` — error on unused function parameters
- `noFallthroughCasesInSwitch` — error on switch case fall-through

## Upgrading TypeScript

1. Update the `typescript` version in `frontend/package.json`.
2. Run `npm run type-check` locally to catch any new errors introduced by the upgrade.
3. Fix any errors before opening a PR.
