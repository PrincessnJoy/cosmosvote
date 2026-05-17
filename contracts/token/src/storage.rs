//! Token contract — storage accessors.

use soroban_sdk::{Address, Env};

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum InstanceKey {
    Admin,
    TotalSupply,
    Initialized,
    Version,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum PersistentKey {
    Balance(Address),
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
}
