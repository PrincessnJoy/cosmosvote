# ADR-001: Use Stellar Soroban as the Smart Contract Platform

**Status:** Accepted  
**Date:** 2026-05-17

## Context

CosmosVote requires a smart contract platform that supports:
- Deterministic execution
- Low transaction fees
- Strong developer tooling
- An active ecosystem

## Decision

Use Stellar's Soroban platform (Protocol 22+) with Rust as the implementation language.

## Rationale

- Soroban provides a WASM-based execution environment with deterministic semantics
- Stellar's base fee (~0.00001 XLM) makes governance economically viable for all participants
- The Soroban SDK provides first-class Rust support with testutils for unit testing
- Stellar has an active developer community and growing DeFi/DAO ecosystem
- SEP-41 provides a standard token interface compatible with existing tooling

## Consequences

- Contracts must be compiled to `wasm32-unknown-unknown`
- All state must go through Soroban's tiered storage model
- Cross-contract calls use the Soroban SDK client pattern
