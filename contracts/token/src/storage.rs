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
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum TempKey {
    Allowance(Address, Address),
}

pub struct TokenStorage;

impl TokenStorage {
    // Amount of ledgers to extend persistent entries by (30 days)
    pub const PERSISTENT_BUMP_AMOUNT: u32 = 518_400; // ~30 days @ 5s/ledger
    pub const PERSISTENT_THRESHOLD: u32 = 17_280;   // ~1 day @ 5s/ledger

    fn bump_persistent_ttl(env: &Env, key: &PersistentKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, Self::PERSISTENT_THRESHOLD, Self::PERSISTENT_BUMP_AMOUNT);
    }

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
        let key = PersistentKey::Balance(owner.clone());
        let v = env.storage().persistent().get(&key).unwrap_or(0);
        // bump TTL on read
        Self::bump_persistent_ttl(env, &key);
        v
    }
    pub fn set_balance(env: &Env, owner: &Address, v: i128) {
        let key = PersistentKey::Balance(owner.clone());
        env.storage().persistent().set(&key, &v);
        Self::bump_persistent_ttl(env, &key);
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
