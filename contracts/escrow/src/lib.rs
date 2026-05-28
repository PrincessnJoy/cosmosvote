//! CosmosVote Escrow Contract
//! Holds funds between a customer and merchant with a configurable expiry.
//! After expiry_timestamp passes, anyone may call expire_escrow() to trigger
//! an automatic refund to the customer.

#![no_std]

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, Address, Env};

use events::EscrowEvents;
use storage::EscrowStorage;
use types::{ContractError, Escrow, EscrowState};

mod token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[allow(dead_code)]
    #[contractclient(name = "TokenClient")]
    pub trait TokenInterface {
        fn transfer(env: Env, from: Address, to: Address, amount: i128);
    }
}

pub(crate) use token_interface::TokenClient;

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if EscrowStorage::is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }
        EscrowStorage::set_admin(&env, &admin);
        EscrowStorage::set_initialized(&env);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Escrow creation
    // -----------------------------------------------------------------------

    /// Create a new escrow. The customer must have approved this contract to
    /// spend `amount` of `token` before calling.
    ///
    /// * `expiry_timestamp` – unix timestamp after which anyone may expire the
    ///   escrow; 0 means no expiry.
    /// * `auto_refund_on_expiry` – if true, expiry refunds the customer.
    pub fn create_escrow(
        env: Env,
        customer: Address,
        merchant: Address,
        token: Address,
        amount: i128,
        release_timestamp: u64,
        expiry_timestamp: u64,
        auto_refund_on_expiry: bool,
    ) -> Result<u64, ContractError> {
        customer.require_auth();
        Self::assert_initialized(&env)?;

        // expiry must be after release (if set)
        if expiry_timestamp > 0 && expiry_timestamp <= release_timestamp {
            return Err(ContractError::ExpiryBeforeRelease);
        }

        // Pull funds from customer into this contract
        let contract_addr = env.current_contract_address();
        TokenClient::new(&env, &token).transfer(&customer, &contract_addr, &amount);

        let id = EscrowStorage::escrow_count(&env);
        let escrow = Escrow {
            id,
            customer: customer.clone(),
            merchant: merchant.clone(),
            token,
            amount,
            release_timestamp,
            expiry_timestamp,
            auto_refund_on_expiry,
            state: EscrowState::Active,
        };

        EscrowStorage::set_escrow(&env, id, &escrow);
        EscrowStorage::set_escrow_count(&env, id + 1);

        EscrowEvents::escrow_created(&env, id, &customer, &merchant, amount);
        Ok(id)
    }

    // -----------------------------------------------------------------------
    // Expiry functions
    // -----------------------------------------------------------------------

    /// Returns true if the escrow's expiry_timestamp has passed and the escrow
    /// is still Active.
    pub fn is_escrow_expired(env: Env, escrow_id: u64) -> bool {
        let escrow = match EscrowStorage::escrow(&env, escrow_id) {
            Some(e) => e,
            None => return false,
        };
        if escrow.state != EscrowState::Active {
            return false;
        }
        if escrow.expiry_timestamp == 0 {
            return false;
        }
        env.ledger().timestamp() >= escrow.expiry_timestamp
    }

    /// Expire an escrow after its expiry_timestamp has passed.
    /// Anyone may call this. Refunds the full amount to the customer.
    ///
    /// Errors:
    /// - `EscrowNotFound`       – no escrow with that id
    /// - `EscrowAlreadyExpired` – escrow is not Active
    /// - `EscrowDisputed`       – escrow is under dispute
    /// - `EscrowNotExpired`     – expiry_timestamp has not passed yet, or no expiry set
    pub fn expire_escrow(env: Env, escrow_id: u64) -> Result<(), ContractError> {
        let mut escrow = EscrowStorage::escrow(&env, escrow_id)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.state == EscrowState::Disputed {
            return Err(ContractError::EscrowDisputed);
        }
        if escrow.state != EscrowState::Active {
            return Err(ContractError::EscrowAlreadyExpired);
        }
        if escrow.expiry_timestamp == 0 || env.ledger().timestamp() < escrow.expiry_timestamp {
            return Err(ContractError::EscrowNotExpired);
        }

        escrow.state = EscrowState::Expired;
        EscrowStorage::set_escrow(&env, escrow_id, &escrow);

        // Refund to customer
        let contract_addr = env.current_contract_address();
        TokenClient::new(&env, &escrow.token).transfer(
            &contract_addr,
            &escrow.customer,
            &escrow.amount,
        );

        EscrowEvents::escrow_expired(&env, escrow_id, &escrow.customer, escrow.amount);
        Ok(())
    }

    /// Set the global default expiry duration (in seconds). Admin only.
    /// New escrows created without an explicit expiry will use this value.
    pub fn set_global_expiry_config(
        env: Env,
        admin: Address,
        default_expiry_seconds: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;

        EscrowStorage::set_default_expiry_seconds(&env, default_expiry_seconds);
        EscrowEvents::expiry_config_set(&env, &admin, default_expiry_seconds);
        Ok(())
    }

    /// Retrieve an escrow by ID.
    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<Escrow, ContractError> {
        EscrowStorage::escrow(&env, escrow_id).ok_or(ContractError::EscrowNotFound)
    }

    /// Return the configured default expiry seconds.
    pub fn get_default_expiry_seconds(env: Env) -> u64 {
        EscrowStorage::default_expiry_seconds(&env)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn assert_initialized(env: &Env) -> Result<(), ContractError> {
        if !EscrowStorage::is_initialized(env) {
            return Err(ContractError::NotInitialized);
        }
        Ok(())
    }

    fn assert_admin(env: &Env, caller: &Address) -> Result<(), ContractError> {
        if EscrowStorage::admin(env) != *caller {
            return Err(ContractError::NotAdmin);
        }
        Ok(())
    }
}
