//! Escrow contract — type definitions and error codes.

use soroban_sdk::{contracterror, contracttype, Address};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    // Initialization
    AlreadyInitialized   = 1,
    NotInitialized       = 2,

    // Escrow lifecycle
    EscrowNotFound       = 10,
    EscrowNotFunded      = 11,
    EscrowAlreadyReleased = 12,
    EscrowDisputed       = 13,

    // Expiry
    EscrowNotExpired     = 47,
    EscrowAlreadyExpired = 48,
    ExpiryBeforeRelease  = 49,

    // Admin
    NotAdmin             = 30,

    // Arithmetic
    ArithmeticOverflow   = 50,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Active,
    Released,
    Refunded,
    Disputed,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u64,
    pub customer: Address,
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub release_timestamp: u64,
    pub expiry_timestamp: u64,   // 0 = no expiry
    pub auto_refund_on_expiry: bool,
    pub state: EscrowState,
}
