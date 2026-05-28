//! Escrow contract — unit tests.

#![cfg(test)]

use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

use crate::{
    types::{ContractError, EscrowState},
    EscrowContract, EscrowContractClient,
};
use cosmosvote_token::{TokenContract, TokenContractClient};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

struct TestEnv<'a> {
    env: &'a Env,
    escrow: EscrowContractClient<'a>,
    token: TokenContractClient<'a>,
    admin: Address,
    customer: Address,
    merchant: Address,
}

fn setup(env: &Env) -> TestEnv<'_> {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let customer = Address::generate(env);
    let merchant = Address::generate(env);

    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(env, &token_id);
    token.initialize(&admin, &1_000_000i128);
    token.mint(&admin, &customer, &100_000i128);

    let escrow_id = env.register(EscrowContract, ());
    let escrow = EscrowContractClient::new(env, &escrow_id);
    escrow.initialize(&admin);

    TestEnv { env, escrow, token, admin, customer, merchant }
}

/// Create a standard escrow with release=100, expiry=200.
fn create_default_escrow(t: &TestEnv) -> u64 {
    t.escrow.create_escrow(
        &t.customer,
        &t.merchant,
        &t.token.address,
        &10_000i128,
        &100u64,
        &200u64,
        &true,
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[test]
fn test_successful_expiry_refunds_customer() {
    let env = Env::default();
    let t = setup(&env);

    let id = create_default_escrow(&t);

    // Advance past expiry
    env.ledger().with_mut(|l| l.timestamp = 201);

    assert!(t.escrow.is_escrow_expired(&id));
    t.escrow.expire_escrow(&id);

    let escrow = t.escrow.get_escrow(&id);
    assert_eq!(escrow.state, EscrowState::Expired);

    // Customer should have been refunded
    assert_eq!(t.token.balance(&t.customer), 100_000i128);
}

#[test]
fn test_premature_expiry_fails() {
    let env = Env::default();
    let t = setup(&env);

    let id = create_default_escrow(&t);

    // Still before expiry_timestamp=200
    env.ledger().with_mut(|l| l.timestamp = 150);

    assert!(!t.escrow.is_escrow_expired(&id));

    let result = t.escrow.try_expire_escrow(&id);
    assert_eq!(result, Err(Ok(ContractError::EscrowNotExpired)));
}

#[test]
fn test_disputed_escrow_cannot_be_expired() {
    let env = Env::default();
    let t = setup(&env);

    let id = create_default_escrow(&t);

    // Patch state to Disputed using storage inside the contract context
    use crate::storage::EscrowStorage;
    use crate::types::EscrowState;
    let escrow_addr = t.escrow.address.clone();
    env.as_contract(&escrow_addr, || {
        let mut escrow = EscrowStorage::escrow(&env, id).unwrap();
        escrow.state = EscrowState::Disputed;
        EscrowStorage::set_escrow(&env, id, &escrow);
    });

    env.ledger().with_mut(|l| l.timestamp = 201);

    let result = t.escrow.try_expire_escrow(&id);
    assert_eq!(result, Err(Ok(ContractError::EscrowDisputed)));
}

#[test]
fn test_expiry_before_release_rejected_at_creation() {
    let env = Env::default();
    let t = setup(&env);

    // expiry_timestamp (50) <= release_timestamp (100) — must fail
    let result = t.escrow.try_create_escrow(
        &t.customer,
        &t.merchant,
        &t.token.address,
        &10_000i128,
        &100u64,
        &50u64,
        &true,
    );
    assert_eq!(result, Err(Ok(ContractError::ExpiryBeforeRelease)));
}

#[test]
fn test_set_global_expiry_config() {
    let env = Env::default();
    let t = setup(&env);

    t.escrow.set_global_expiry_config(&t.admin, &86_400u64);
    assert_eq!(t.escrow.get_default_expiry_seconds(), 86_400u64);
}

#[test]
fn test_is_escrow_expired_no_expiry_set() {
    let env = Env::default();
    let t = setup(&env);

    // expiry_timestamp = 0 means no expiry
    let id = t.escrow.create_escrow(
        &t.customer,
        &t.merchant,
        &t.token.address,
        &10_000i128,
        &100u64,
        &0u64,
        &false,
    );

    env.ledger().with_mut(|l| l.timestamp = 999_999);
    assert!(!t.escrow.is_escrow_expired(&id));
}

#[test]
fn test_double_expiry_fails() {
    let env = Env::default();
    let t = setup(&env);

    let id = create_default_escrow(&t);
    env.ledger().with_mut(|l| l.timestamp = 201);

    t.escrow.expire_escrow(&id);

    // Second call should fail — escrow is no longer Active
    let result = t.escrow.try_expire_escrow(&id);
    assert_eq!(result, Err(Ok(ContractError::EscrowAlreadyExpired)));
}
