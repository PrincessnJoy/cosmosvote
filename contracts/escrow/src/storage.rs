//! Escrow contract — storage accessors.

use soroban_sdk::{Address, Env};

use crate::types::Escrow;

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum InstanceKey {
    Admin,
    EscrowCount,
    DefaultExpirySeconds,
    Initialized,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum PersistentKey {
    Escrow(u64),
}

pub struct EscrowStorage;

impl EscrowStorage {
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().get(&InstanceKey::Initialized).unwrap_or(false)
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

    pub fn escrow_count(env: &Env) -> u64 {
        env.storage().instance().get(&InstanceKey::EscrowCount).unwrap_or(0)
    }
    pub fn set_escrow_count(env: &Env, v: u64) {
        env.storage().instance().set(&InstanceKey::EscrowCount, &v);
    }

    pub fn default_expiry_seconds(env: &Env) -> u64 {
        env.storage().instance().get(&InstanceKey::DefaultExpirySeconds).unwrap_or(0)
    }
    pub fn set_default_expiry_seconds(env: &Env, v: u64) {
        env.storage().instance().set(&InstanceKey::DefaultExpirySeconds, &v);
    }

    pub fn escrow(env: &Env, id: u64) -> Option<Escrow> {
        env.storage().persistent().get(&PersistentKey::Escrow(id))
    }
    pub fn set_escrow(env: &Env, id: u64, v: &Escrow) {
        env.storage().persistent().set(&PersistentKey::Escrow(id), v);
    }
}
