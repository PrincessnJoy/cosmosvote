//! Token contract — storage accessors.

use soroban_sdk::{Address, Env, String};

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum InstanceKey {
    Admin,
    TotalSupply,
    Initialized,
    Version,
    Name,
    Symbol,
    Decimals,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum PersistentKey {
    Balance(Address),
    /// Maps delegator → delegate (who holds their voting power).
    Delegation(Address),
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum TempKey {
    Allowance(Address, Address),
}

pub struct TokenStorage;

impl TokenStorage {
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&InstanceKey::Initialized)
    }
    pub fn set_initialized(env: &Env) {
        env.storage().instance().set(&InstanceKey::Initialized, &true);
    }

    pub fn admin(env: &Env) -> Address {
        env.storage().instance().get(&InstanceKey::Admin).unwrap()
    }
    pub fn set_admin(env: &Env, v: &Address) {
        env.storage().instance().set(&InstanceKey::Admin, v);
    }

    pub fn total_supply(env: &Env) -> i128 {
        env.storage().instance().get(&InstanceKey::TotalSupply).unwrap_or(0)
    }
    pub fn set_total_supply(env: &Env, v: i128) {
        env.storage().instance().set(&InstanceKey::TotalSupply, &v);
    }

    pub fn version(env: &Env) -> (u32, u32, u32) {
        env.storage().instance().get(&InstanceKey::Version).unwrap_or((1, 0, 0))
    }
    pub fn set_version(env: &Env, v: (u32, u32, u32)) {
        env.storage().instance().set(&InstanceKey::Version, &v);
    }

    pub fn name(env: &Env) -> String {
        env.storage()
            .instance()
            .get(&InstanceKey::Name)
            .unwrap_or(String::from_slice(env, ""))
    }
    pub fn set_name(env: &Env, v: &String) {
        env.storage().instance().set(&InstanceKey::Name, v);
    }

    pub fn symbol(env: &Env) -> String {
        env.storage()
            .instance()
            .get(&InstanceKey::Symbol)
            .unwrap_or(String::from_slice(env, ""))
    }
    pub fn set_symbol(env: &Env, v: &String) {
        env.storage().instance().set(&InstanceKey::Symbol, v);
    }

    pub fn decimals(env: &Env) -> u32 {
        env.storage().instance().get(&InstanceKey::Decimals).unwrap_or(0)
    }
    pub fn set_decimals(env: &Env, v: u32) {
        env.storage().instance().set(&InstanceKey::Decimals, &v);
    }

    pub fn balance(env: &Env, owner: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&PersistentKey::Balance(owner.clone()))
            .unwrap_or(0)
    }
    pub fn set_balance(env: &Env, owner: &Address, v: i128) {
        env.storage()
            .persistent()
            .set(&PersistentKey::Balance(owner.clone()), &v);
    }

    pub fn allowance(env: &Env, owner: &Address, spender: &Address) -> i128 {
        env.storage()
            .temporary()
            .get(&TempKey::Allowance(owner.clone(), spender.clone()))
            .unwrap_or(0)
    }
    pub fn set_allowance(env: &Env, owner: &Address, spender: &Address, v: i128) {
        env.storage()
            .temporary()
            .set(&TempKey::Allowance(owner.clone(), spender.clone()), &v);
    }

    /// Returns the delegate address for `owner`, if any.
    pub fn delegation(env: &Env, owner: &Address) -> Option<Address> {
        env.storage()
            .persistent()
            .get(&PersistentKey::Delegation(owner.clone()))
    }
    pub fn set_delegation(env: &Env, owner: &Address, delegate: &Address) {
        env.storage()
            .persistent()
            .set(&PersistentKey::Delegation(owner.clone()), delegate);
    }
    pub fn remove_delegation(env: &Env, owner: &Address) {
        env.storage()
            .persistent()
            .remove(&PersistentKey::Delegation(owner.clone()));
    }

    /// Returns the total voting weight for `voter`: own balance + sum of all delegators' balances.
    /// NOTE: Soroban doesn't support reverse lookups, so delegators must be tracked off-chain.
    /// This function returns the voter's own balance; delegated weight is accumulated via
    /// `get_delegated_weight` which requires the caller to pass delegator addresses.
    pub fn get_delegated_weight(env: &Env, voter: &Address) -> i128 {
        // Base: voter's own balance (if they haven't delegated away)
        // Delegated weight is added by governance via cross-contract calls.
        // This returns the voter's own balance only; governance accumulates delegators.
        Self::balance(env, voter)
    }
}
