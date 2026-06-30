# Terraform Setup & Environment Configuration

This guide explains how to provision and manage CosmosVote infrastructure using Terraform, including workspace setup and environment-specific configurations.

---

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) v1.5+
- Stellar/Soroban RPC access for target network
- Appropriate credentials (secret keys, API tokens) for the target environment

---

## Repository Layout

```
infra/
├── main.tf           # Root module — providers, backend
├── variables.tf      # Input variable declarations
├── outputs.tf        # Output values
└── envs/
    ├── local.tfvars      # Local development overrides
    ├── testnet.tfvars    # Testnet environment values
    └── mainnet.tfvars    # Mainnet environment values
```

---

## Workspace Setup

Terraform workspaces map directly to deployment environments. Create and select a workspace before applying:

```bash
# Initialize the backend
terraform init

# Create workspaces (first time only)
terraform workspace new local
terraform workspace new testnet
terraform workspace new mainnet

# List available workspaces
terraform workspace list

# Switch to a workspace
terraform workspace select testnet
```

The active workspace name is exposed as `terraform.workspace` inside `.tf` files, allowing conditional logic per environment.

---

## The `envs/` Folder

Each `.tfvars` file in `envs/` supplies environment-specific variable values. Pass the relevant file with `-var-file` when running plan/apply:

```bash
terraform plan  -var-file="envs/testnet.tfvars"
terraform apply -var-file="envs/testnet.tfvars"
```

### `envs/local.tfvars`

```hcl
network             = "local"
stellar_rpc_url     = "http://localhost:8000/soroban/rpc"
governance_contract = ""   # populated after first deploy
token_contract      = ""
```

### `envs/testnet.tfvars`

```hcl
network             = "testnet"
stellar_rpc_url     = "https://soroban-testnet.stellar.org"
governance_contract = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
token_contract      = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### `envs/mainnet.tfvars`

```hcl
network             = "mainnet"
stellar_rpc_url     = "https://mainnet.stellar.validationcloud.io/v1/<API_KEY>"
governance_contract = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
token_contract      = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

> **Never commit real secret keys or API tokens.** Use environment variables or a secrets manager and reference them via `TF_VAR_*` or a secrets backend.

---

## Full Workflow Per Environment

### Local

```bash
terraform workspace select local
terraform plan  -var-file="envs/local.tfvars"
terraform apply -var-file="envs/local.tfvars"
```

### Testnet

```bash
terraform workspace select testnet
terraform plan  -var-file="envs/testnet.tfvars"
terraform apply -var-file="envs/testnet.tfvars"
```

### Mainnet

```bash
terraform workspace select mainnet
# Always review the plan before applying to mainnet
terraform plan  -var-file="envs/mainnet.tfvars" -out=mainnet.plan
terraform apply mainnet.plan
```

---

## Sensitive Variables

Pass secrets at runtime via environment variables rather than storing them in `.tfvars`:

```bash
export TF_VAR_stellar_secret_key="S..."
terraform apply -var-file="envs/testnet.tfvars"
```

Or declare a `terraform.tfvars` file locally (add to `.gitignore`) for developer convenience.

---

## State Management

| Environment | Recommended Backend |
|-------------|-------------------|
| local       | Local filesystem (`terraform.tfstate`) |
| testnet     | Remote (S3, GCS, or Terraform Cloud) |
| mainnet     | Remote with locking enabled |

Configure the backend in `main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket = "cosmosvote-tfstate"
    key    = "cosmosvote/${terraform.workspace}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

---

## Related

- [Configuration reference](./config/) — `local.toml`, `testnet.toml`, `mainnet.toml`
- [Deploy scripts](../scripts/deploy.sh)
- [Getting Started](./GETTING_STARTED.md)
