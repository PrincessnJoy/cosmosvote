//! CosmosVote Token Contract
//!
//! SEP-41-compatible governance token with balances, transfers,
//! mint/burn, spending allowances, and admin controls.

#![no_std]

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, Address, Env};

use events::TokenEvents;
use storage::TokenStorage;
use types::ContractError;

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// Initialize the token contract.
    ///
    /// * `admin`          – receives initial supply and admin privileges
    /// * `initial_supply` – total tokens minted to admin
    pub fn initialize(
        env: Env,
        admin: Address,
        initial_supply: i128,
    ) -> Result<(), ContractError> {
        if TokenStorage::is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }

        TokenStorage::set_admin(&env, &admin);
        TokenStorage::set_total_supply(&env, initial_supply);
        TokenStorage::set_balance(&env, &admin, initial_supply);
        TokenStorage::set_initialized(&env);
        TokenStorage::set_version(&env, (1, 0, 0));

        TokenEvents::initialized(&env, &admin, initial_supply);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    pub fn total_supply(env: Env) -> i128 {
        TokenStorage::total_supply(&env)
    }

    pub fn balance(env: Env, owner: Address) -> i128 {
        TokenStorage::balance(&env, &owner)
    }

    /// Alias for balance (SEP-41 compatibility).
    pub fn balance_of(env: Env, owner: Address) -> i128 {
        TokenStorage::balance(&env, &owner)
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        TokenStorage::allowance(&env, &owner, &spender)
    }

    pub fn admin(env: Env) -> Address {
        TokenStorage::admin(&env)
    }

    pub fn version(env: Env) -> (u32, u32, u32) {
        TokenStorage::version(&env)
    }

    // -----------------------------------------------------------------------
    // Transfers
    // -----------------------------------------------------------------------

    /// Transfer tokens from `from` to `to`.
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        from.require_auth();
        Self::validate_amount(amount)?;

        let from_bal = TokenStorage::balance(&env, &from);
        if from_bal < amount {
            return Err(ContractError::InsufficientBalance);
        }

        if from == to {
            return Ok(());
        }

        TokenStorage::set_balance(&env, &from, from_bal - amount);
        let to_bal = TokenStorage::balance(&env, &to);
        TokenStorage::set_balance(&env, &to, to_bal + amount);

        TokenEvents::transfer(&env, &from, &to, amount);
        Ok(())
    }

    /// Transfer tokens on behalf of `from` using a pre-approved allowance.
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        spender.require_auth();
        Self::validate_amount(amount)?;

        let allowance = TokenStorage::allowance(&env, &from, &spender);
        if allowance < amount {
            return Err(ContractError::AllowanceExceeded);
        }

        let from_bal = TokenStorage::balance(&env, &from);
        if from_bal < amount {
            return Err(ContractError::InsufficientBalance);
        }

        TokenStorage::set_allowance(&env, &from, &spender, allowance - amount);
        TokenStorage::set_balance(&env, &from, from_bal - amount);
        let to_bal = TokenStorage::balance(&env, &to);
        TokenStorage::set_balance(&env, &to, to_bal + amount);

        TokenEvents::transfer(&env, &from, &to, amount);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Allowances
    // -----------------------------------------------------------------------

    /// Approve `spender` to transfer up to `amount` tokens from `owner`.
    pub fn approve(
        env: Env,
        owner: Address,
        spender: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        if amount < 0 {
            return Err(ContractError::InvalidAmount);
        }
        TokenStorage::set_allowance(&env, &owner, &spender, amount);
        TokenEvents::approval(&env, &owner, &spender, amount);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Mint & burn (admin only)
    // -----------------------------------------------------------------------

    /// Mint new tokens to `to`. Admin only.
    pub fn mint(
        env: Env,
        admin: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;
        Self::validate_amount(amount)?;

        let supply = TokenStorage::total_supply(&env);
        TokenStorage::set_total_supply(&env, supply + amount);
        let bal = TokenStorage::balance(&env, &to);
        TokenStorage::set_balance(&env, &to, bal + amount);

        TokenEvents::minted(&env, &admin, &to, amount);
        Ok(())
    }

    /// Burn tokens from `from`. Admin only.
    pub fn burn(
        env: Env,
        admin: Address,
        from: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;
        Self::validate_amount(amount)?;

        let bal = TokenStorage::balance(&env, &from);
        if bal < amount {
            return Err(ContractError::InsufficientBalance);
        }

        let supply = TokenStorage::total_supply(&env);
        TokenStorage::set_total_supply(&env, supply - amount);
        TokenStorage::set_balance(&env, &from, bal - amount);

        TokenEvents::burned(&env, &admin, &from, amount);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------

    /// Transfer admin privileges. Current admin only.
    pub fn transfer_admin(
        env: Env,
        admin: Address,
        new_admin: Address,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_admin(&env, &admin)?;

        TokenStorage::set_admin(&env, &new_admin);
        TokenEvents::admin_transferred(&env, &admin, &new_admin);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn validate_amount(amount: i128) -> Result<(), ContractError> {
        if amount <= 0 {
            Err(ContractError::InvalidAmount)
        } else {
            Ok(())
        }
    }

    fn assert_admin(env: &Env, caller: &Address) -> Result<(), ContractError> {
        if TokenStorage::admin(env) != *caller {
            Err(ContractError::NotAdmin)
        } else {
            Ok(())
        }
    }
}
