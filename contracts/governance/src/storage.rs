//! Governance contract — storage accessors with tiered storage strategy.
//!
//! * Instance storage  — contract-wide config (cheap, loaded once per call)
//! * Persistent storage — per-proposal / per-voter data (survives ledger expiry)

use soroban_sdk::{Address, Env};

use crate::types::{ContractState, Proposal, ProposalState, VoteRecord};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum InstanceKey {
    Admin,
    PendingAdmin,
    VotingToken,
    ProposalCount,
    ActiveProposalCount,
    MinProposalBalance,
    ProposalCooldown,
    MinQuorumBps,
    RestrictAdminVote,
    Version,
    ContractState,
    Paused,
}

#[soroban_sdk::contracttype]
#[derive(Clone)]
pub enum PersistentKey {
    Proposal(u64),
    HasVoted(u64, Address),
    VoteRecord(u64, Address),
    LastProposal(Address),
}

// ---------------------------------------------------------------------------
// Storage accessors
// ---------------------------------------------------------------------------

pub struct GovernanceStorage;

impl GovernanceStorage {
    // --- Instance ---

    pub fn admin(env: &Env) -> Address {
        env.storage().instance().get(&InstanceKey::Admin).unwrap()
    }
    pub fn set_admin(env: &Env, v: &Address) {
        env.storage().instance().set(&InstanceKey::Admin, v);
    }

    pub fn pending_admin(env: &Env) -> Option<Address> {
        env.storage().instance().get(&InstanceKey::PendingAdmin)
    }
    pub fn set_pending_admin(env: &Env, v: Option<&Address>) {
        match v {
            Some(addr) => env.storage().instance().set(&InstanceKey::PendingAdmin, addr),
            None => env.storage().instance().remove(&InstanceKey::PendingAdmin),
        }
    }

    pub fn voting_token(env: &Env) -> Address {
        env.storage().instance().get(&InstanceKey::VotingToken).unwrap()
    }
    pub fn set_voting_token(env: &Env, v: &Address) {
        env.storage().instance().set(&InstanceKey::VotingToken, v);
    }

    pub fn proposal_count(env: &Env) -> u64 {
        env.storage().instance().get(&InstanceKey::ProposalCount).unwrap_or(0)
    }
    pub fn set_proposal_count(env: &Env, v: u64) {
        env.storage().instance().set(&InstanceKey::ProposalCount, &v);
    }

    pub fn active_proposal_count(env: &Env) -> u64 {
        env.storage().instance().get(&InstanceKey::ActiveProposalCount).unwrap_or(0)
    }
    pub fn set_active_proposal_count(env: &Env, v: u64) {
        env.storage().instance().set(&InstanceKey::ActiveProposalCount, &v);
    }

    pub fn min_proposal_balance(env: &Env) -> i128 {
        env.storage().instance().get(&InstanceKey::MinProposalBalance).unwrap_or(0)
    }
    pub fn set_min_proposal_balance(env: &Env, v: i128) {
        env.storage().instance().set(&InstanceKey::MinProposalBalance, &v);
    }

    pub fn proposal_cooldown(env: &Env) -> u64 {
        env.storage().instance().get(&InstanceKey::ProposalCooldown).unwrap_or(0)
    }
    pub fn set_proposal_cooldown(env: &Env, v: u64) {
        env.storage().instance().set(&InstanceKey::ProposalCooldown, &v);
    }

    pub fn min_quorum_bps(env: &Env) -> u32 {
        env.storage().instance().get(&InstanceKey::MinQuorumBps).unwrap_or(0)
    }
    pub fn set_min_quorum_bps(env: &Env, v: u32) {
        env.storage().instance().set(&InstanceKey::MinQuorumBps, &v);
    }

    pub fn restrict_admin_vote(env: &Env) -> bool {
        env.storage().instance().get(&InstanceKey::RestrictAdminVote).unwrap_or(false)
    }
    pub fn set_restrict_admin_vote(env: &Env, v: bool) {
        env.storage().instance().set(&InstanceKey::RestrictAdminVote, &v);
    }

    pub fn paused(env: &Env) -> bool {
        env.storage().instance().get(&InstanceKey::Paused).unwrap_or(false)
    }
    pub fn set_paused(env: &Env, v: bool) {
        env.storage().instance().set(&InstanceKey::Paused, &v);
    }

    pub fn contract_state(env: &Env) -> ContractState {
        env.storage()
            .instance()
            .get(&InstanceKey::ContractState)
            .unwrap_or(ContractState::Uninitialized)
    }
    pub fn set_contract_state(env: &Env, v: ContractState) {
        env.storage().instance().set(&InstanceKey::ContractState, &v);
    }

    pub fn version(env: &Env) -> (u32, u32, u32) {
        env.storage().instance().get(&InstanceKey::Version).unwrap_or((1, 0, 0))
    }
    pub fn set_version(env: &Env, v: (u32, u32, u32)) {
        env.storage().instance().set(&InstanceKey::Version, &v);
    }

    // --- Persistent ---

    pub fn proposal(env: &Env, id: u64) -> Option<Proposal> {
        env.storage().persistent().get(&PersistentKey::Proposal(id))
    }
    pub fn set_proposal(env: &Env, id: u64, v: &Proposal) {
        env.storage().persistent().set(&PersistentKey::Proposal(id), v);
    }

    pub fn has_voted(env: &Env, proposal_id: u64, voter: &Address) -> bool {
        env.storage()
            .persistent()
            .get(&PersistentKey::HasVoted(proposal_id, voter.clone()))
            .unwrap_or(false)
    }
    pub fn set_has_voted(env: &Env, proposal_id: u64, voter: &Address, v: bool) {
        env.storage()
            .persistent()
            .set(&PersistentKey::HasVoted(proposal_id, voter.clone()), &v);
    }

    pub fn vote_record(env: &Env, proposal_id: u64, voter: &Address) -> Option<VoteRecord> {
        env.storage()
            .persistent()
            .get(&PersistentKey::VoteRecord(proposal_id, voter.clone()))
    }
    pub fn set_vote_record(env: &Env, proposal_id: u64, voter: &Address, v: &VoteRecord) {
        env.storage()
            .persistent()
            .set(&PersistentKey::VoteRecord(proposal_id, voter.clone()), v);
    }

    pub fn last_proposal_time(env: &Env, proposer: &Address) -> Option<u64> {
        env.storage()
            .persistent()
            .get(&PersistentKey::LastProposal(proposer.clone()))
    }
    pub fn set_last_proposal_time(env: &Env, proposer: &Address, v: u64) {
        env.storage()
            .persistent()
            .set(&PersistentKey::LastProposal(proposer.clone()), &v);
    }

    /// Convenience: check if a proposal is in a terminal state.
    pub fn is_terminal(state: &ProposalState) -> bool {
        matches!(
            state,
            ProposalState::Executed | ProposalState::Cancelled | ProposalState::Rejected
        )
    }
}
