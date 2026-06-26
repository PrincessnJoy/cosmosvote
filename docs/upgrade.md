# Contract Upgrade

CosmosVote supports governance contract upgrades through an admin-only `upgrade` entrypoint.

## Upgrade API

```rust
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), ContractError>
```

## Behavior

- Only the configured governance admin may call `upgrade`.
- The contract uses `env.deployer().update_current_contract_wasm(new_wasm_hash)` to update the current deployed WASM.
- An `Upgraded` event is emitted with the new WASM hash.

## Usage

1. Build the new WASM.
2. Compute the 32-byte hash of the WASM binary.
3. Call `upgrade(admin, new_wasm_hash)` from the governance admin account.

## Notes

- This function does not migrate existing contract storage; it only updates the contract code.
- Any new WASM must preserve expected storage layout for existing contract data.
