//! Token contract — unit tests.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{types::ContractError, TokenContract, TokenContractClient};

fn setup(env: &Env) -> (TokenContractClient, Address, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let user = Address::generate(env);
    let id = env.register(TokenContract, ());
    let token = TokenContractClient::new(env, &id);
    token.initialize(&admin, &1_000_000_000i128);
    (token, admin, user)
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

#[test]
fn test_initialize() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    assert_eq!(token.total_supply(), 1_000_000_000);
    assert_eq!(token.balance(&admin), 1_000_000_000);
}

#[test]
fn test_double_init_fails() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    let result = token.try_initialize(&admin, &1_000_000i128);
    assert_eq!(result, Err(Ok(ContractError::AlreadyInitialized)));
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

#[test]
fn test_transfer() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer(&admin, &user, &1_000_000i128);
    assert_eq!(token.balance(&user), 1_000_000);
    assert_eq!(token.balance(&admin), 999_000_000);
}

#[test]
fn test_transfer_insufficient_balance_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_transfer(&user, &Address::generate(&env), &1i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_transfer_zero_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let result = token.try_transfer(&admin, &user, &0i128);
    assert_eq!(result, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn test_transfer_to_self_noop() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    token.transfer(&admin, &admin, &1_000_000i128);
    assert_eq!(token.balance(&admin), 1_000_000_000);
}

// ---------------------------------------------------------------------------
// Allowances
// ---------------------------------------------------------------------------

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    token.approve(&admin, &spender, &5_000_000i128);
    assert_eq!(token.allowance(&admin, &spender), 5_000_000);
    token.transfer_from(&spender, &admin, &user, &2_000_000i128);
    assert_eq!(token.balance(&user), 2_000_000);
    assert_eq!(token.allowance(&admin, &spender), 3_000_000);
}

#[test]
fn test_transfer_from_exceeds_allowance_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let spender = Address::generate(&env);
    token.approve(&admin, &spender, &100i128);
    let result = token.try_transfer_from(&spender, &admin, &user, &200i128);
    assert_eq!(result, Err(Ok(ContractError::AllowanceExceeded)));
}

// ---------------------------------------------------------------------------
// Mint & burn
// ---------------------------------------------------------------------------

#[test]
fn test_mint() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.mint(&admin, &user, &5_000_000i128);
    assert_eq!(token.balance(&user), 5_000_000);
    assert_eq!(token.total_supply(), 1_005_000_000);
}

#[test]
fn test_burn() {
    let env = Env::default();
    let (token, admin, _) = setup(&env);
    token.burn(&admin, &admin, &100_000_000i128);
    assert_eq!(token.total_supply(), 900_000_000);
    assert_eq!(token.balance(&admin), 900_000_000);
}

#[test]
fn test_burn_insufficient_fails() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    let result = token.try_burn(&admin, &user, &1i128);
    assert_eq!(result, Err(Ok(ContractError::InsufficientBalance)));
}

#[test]
fn test_mint_non_admin_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_mint(&user, &user, &1_000i128);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

// ---------------------------------------------------------------------------
// Admin transfer
// ---------------------------------------------------------------------------

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    let (token, admin, user) = setup(&env);
    token.transfer_admin(&admin, &user);
    assert_eq!(token.admin(), user);
}

#[test]
fn test_transfer_admin_non_admin_fails() {
    let env = Env::default();
    let (token, _, user) = setup(&env);
    let result = token.try_transfer_admin(&user, &Address::generate(&env));
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

#[test]
fn test_version() {
    let env = Env::default();
    let (token, _, _) = setup(&env);
    assert_eq!(token.version(), (1u32, 0u32, 0u32));
}
