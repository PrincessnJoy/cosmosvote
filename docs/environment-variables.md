# Environment Variables & Secrets

This document covers all environment variables used by CosmosVote scripts and the frontend, how to configure them, and best practices for managing secrets.

---

## Quick Start

```bash
# Root (Rust scripts / deployment)
cp .env.example .env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Never commit `.env` or `.env.local` to version control — they are listed in `.gitignore`.

---

## Root `.env` — Deployment & Scripts

Used by `scripts/deploy.sh`, `scripts/deploy_mainnet.sh`, and other shell scripts.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NETWORK` | Yes | `local` | Target network: `local`, `testnet`, or `mainnet` |
| `STELLAR_RPC_URL` | Yes | `http://localhost:8000` | Soroban RPC endpoint |
| `STELLAR_NETWORK_PASSPHRASE` | Yes | Standalone passphrase | Network identity string |
| `STELLAR_SECRET_KEY` | Yes | — | **Secret.** Ed25519 secret key (`S…`) for the deploying admin account |
| `GOVERNANCE_CONTRACT_ID` | After deploy | — | Contract ID of the deployed governance contract (set by deploy script) |
| `TOKEN_CONTRACT_ID` | After deploy | — | Contract ID of the deployed token contract (set by deploy script) |
| `MIN_PROPOSAL_BALANCE` | No | `1000000` | Minimum token units required to create a proposal (0 = no minimum) |
| `PROPOSAL_COOLDOWN` | No | `86400` | Seconds a proposer must wait between proposals (0 = no cooldown) |
| `RESTRICT_ADMIN_VOTE` | No | `true` | `true` prevents the admin from voting on proposals they created |
| `INITIAL_TOKEN_SUPPLY` | No | `1000000000` | Token units minted to admin at initialization |

### Network Passphrases

| Network | Passphrase |
|---------|-----------|
| Local (standalone) | `Standalone Network ; February 2021` |
| Testnet | `Test SDF Network ; September 2015` |
| Mainnet | `Public Global Stellar Network ; September 2015` |

### Per-network RPC URLs

| Network | RPC URL |
|---------|---------|
| Local | `http://localhost:8000` |
| Testnet | `https://soroban-testnet.stellar.org` |
| Mainnet | `https://soroban-mainnet.stellar.org` |

---

## Frontend `frontend/.env.local` — Vite / React

Vite only exposes variables prefixed with `VITE_` to the browser bundle.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_NETWORK` | Yes | Network to connect to: `testnet` or `mainnet` |
| `VITE_GOVERNANCE_CONTRACT_ID` | Yes | Stellar contract ID for the governance contract (starts with `C`, 56 chars) |
| `VITE_TOKEN_CONTRACT_ID` | Yes | Stellar contract ID for the token contract (starts with `C`, 56 chars) |

Example `frontend/.env.local`:

```dotenv
VITE_NETWORK=testnet
VITE_GOVERNANCE_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_TOKEN_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The frontend calls `validateConfig()` on startup and throws if either contract ID is missing or malformed.

---

## Secret Management Best Practices

### Local Development

- Copy `.env.example` → `.env` and fill in your values. The `.env` file is gitignored.
- Do not share your `STELLAR_SECRET_KEY` with anyone or paste it into chat, issues, or PRs.
- Use a dedicated **testnet** key for development — never reuse your mainnet key locally.
- Rotate any key that has been accidentally committed or exposed immediately.

### CI / GitHub Actions

- Store secrets under **Settings → Secrets and variables → Actions** in the GitHub repo.
- Reference them in workflows with `${{ secrets.SECRET_NAME }}` — they are masked in logs.
- Grant only the minimum permissions needed (e.g., a deploy key scoped to one environment).
- Never `echo` or `print` a secret value in a workflow step.

```yaml
# Good — secret passed as env var
- name: Deploy contracts
  env:
    STELLAR_SECRET_KEY: ${{ secrets.STELLAR_SECRET_KEY }}
  run: bash scripts/deploy.sh

# Bad — secret visible in logs
- run: bash scripts/deploy.sh --key ${{ secrets.STELLAR_SECRET_KEY }}
```

### Production Deployments

- Use a dedicated mainnet admin key that is stored in a hardware wallet or secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).
- Rotate `STELLAR_SECRET_KEY` after any personnel change with admin access.
- Audit contract ownership with `stellar contract invoke ... -- admin` after each deployment to confirm the expected admin address.
- The `deploy_mainnet.sh` script requires `NETWORK=mainnet` explicitly to prevent accidental mainnet deployment.

### What to Never Commit

- `STELLAR_SECRET_KEY` values
- Any file named `.env`, `.env.local`, `.env.production`
- Private keys, mnemonics, or seed phrases of any kind

These are all covered by `.gitignore`. Run `git status` before committing to confirm no secret files are staged.

---

## Validating Your Configuration

```bash
# Check that all required variables are set before deploying
source .env
: "${NETWORK:?NETWORK is required}"
: "${STELLAR_RPC_URL:?STELLAR_RPC_URL is required}"
: "${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY is required}"
```

The deploy scripts perform these checks automatically and exit with a clear error message if a required variable is missing.

For the frontend, `validateConfig()` in `src/config.ts` checks that both contract IDs are present and well-formed on app startup.
