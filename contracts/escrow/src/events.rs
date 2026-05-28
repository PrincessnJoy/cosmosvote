//! Escrow contract — on-chain event emission.

use soroban_sdk::{symbol_short, Address, Env};

pub struct EscrowEvents;

impl EscrowEvents {
    pub fn escrow_created(env: &Env, escrow_id: u64, customer: &Address, merchant: &Address, amount: i128) {
        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("created")),
            (escrow_id, customer.clone(), merchant.clone(), amount),
        );
    }

    pub fn escrow_expired(env: &Env, escrow_id: u64, refunded_to: &Address, amount: i128) {
        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("expired")),
            (escrow_id, refunded_to.clone(), amount),
        );
    }

    pub fn expiry_config_set(env: &Env, admin: &Address, default_expiry_seconds: u64) {
        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("cfg")),
            (admin.clone(), default_expiry_seconds),
        );
    }
}
