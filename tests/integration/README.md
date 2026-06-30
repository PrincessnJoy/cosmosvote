# Integration test (frontend + contracts)

This folder contains a scaffold for a cross-package integration test that exercises the frontend against deployed contracts.

Requirements:
- Docker (for local Soroban quickstart)
- Node.js and npm for frontend tooling
- `stellar` CLI in PATH (used by scripts/deploy.sh)

Quick start (local):

```bash
# Start a local Soroban node
docker-compose up -d stellar-node

# Build and deploy contracts (requires STELLAR_SECRET_KEY in env or .env)
STELLAR_SECRET_KEY="<your secret>" ./scripts/deploy.sh

# In frontend, install deps and start dev server
cd frontend
npm install
npm run dev

# In another shell, run the Playwright integration tests (assumes frontend at http://localhost:5173)
npx playwright test tests/integration
```

CI: The integration test requires a running Soroban environment and secrets; it is not enabled by default in CI. See the main issue for recommended CI setup.
