FROM rust:1.75-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Add WASM target
RUN rustup target add wasm32-unknown-unknown

# Install Stellar CLI
RUN curl -sSL https://github.com/stellar/stellar-cli/releases/download/v22.0.1/stellar-cli-22.0.1-x86_64-unknown-linux-gnu.tar.gz \
    | tar -xz -C /usr/local/bin

WORKDIR /app

# Cache dependencies
COPY Cargo.toml ./
COPY contracts/governance/Cargo.toml contracts/governance/Cargo.toml
COPY contracts/token/Cargo.toml contracts/token/Cargo.toml

# Create stub lib files for dependency caching
RUN mkdir -p contracts/governance/src contracts/token/src \
    && echo '#![no_std] soroban_sdk::contractimpl_empty!();' > contracts/governance/src/lib.rs \
    && echo '#![no_std] soroban_sdk::contractimpl_empty!();' > contracts/token/src/lib.rs \
    && cargo fetch || true

# Copy full source
COPY . .

# Install cargo tools
# RUN cargo install cargo-tarpaulin --locked

# Health check: verify the container is alive and the Stellar RPC endpoint is reachable
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -fsS "${STELLAR_RPC_URL:-http://localhost:8000}/health" > /dev/null || exit 1

CMD ["make", "test"]
