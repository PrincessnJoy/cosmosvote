//! Governance contract — storage accessors with tiered storage strategy.
//!
//! * Instance storage  — contract-wide config (cheap, loaded once per call)
//! * Persistent storage — per-proposal / per-voter data (survives ledger expiry)
//!
//! ## Storage TTL assumptions
//!
//! Soroban persistent storage entries expire after their TTL (time-to-live) elapses
//! without a bump. We extend the TTL on every write to keep proposal and vote data
//! alive for the full expected proposal lifecycle plus a safety buffer:
//!
//! * `PROPOSAL_TTL_LEDGERS` — ~30 days at 5 s/ledger = 518 400 ledgers.
//!   Covers the maximum voting duration (2 592 000 s) plus buffer.
//! * `VOTE_TTL_LEDGERS` — same window; vote records must outlive their proposal.
//! * `COOLDOWN_TTL_LEDGERS` — ~7 days; only needs to cover the cooldown period.

use soroban_sdk::{Address, Env};

use crate::types::{ContractState, Proposal, ProposalState, VoteRecord};

// ---------------------------------------------------------------------------
// TTL constants (in ledgers, assuming ~5 s/ledger)
// ---------------------------------------------------------------------------

/// ~30 days. Covers max voting duration (2 592 000 s) with buffer.
const PROPOSAL_TTL_LEDGERS: u32 = 518_400;
/// Same as proposal TTL — vote records must outlive the proposal.
const VOTE_TTL_LEDGERS: u32 = 518_400;
/// ~7 days — sufficient to cover any cooldown period.
const COOLDOWN_TTL_LEDGERS: u32 = 120_960;

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
        let key = PersistentKey::Proposal(id);
        env.storage().persistent().set(&key, v);
        env.storage().persistent().extend_ttl(&key, PROPOSAL_TTL_LEDGERS, PROPOSAL_TTL_LEDGERS);
    }

    pub fn has_voted(env: &Env, proposal_id: u64, voter: &Address) -> bool {
        env.storage()
            .persistent()
            .get(&PersistentKey::HasVoted(proposal_id, voter.clone()))
            .unwrap_or(false)
    }
    pub fn set_has_voted(env: &Env, proposal_id: u64, voter: &Address, v: bool) {
        let key = PersistentKey::HasVoted(proposal_id, voter.clone());
        env.storage().persistent().set(&key, &v);
        env.storage().persistent().extend_ttl(&key, VOTE_TTL_LEDGERS, VOTE_TTL_LEDGERS);
    }

    pub fn vote_record(env: &Env, proposal_id: u64, voter: &Address) -> Option<VoteRecord> {
        env.storage()
            .persistent()
            .get(&PersistentKey::VoteRecord(proposal_id, voter.clone()))
    }
    pub fn set_vote_record(env: &Env, proposal_id: u64, voter: &Address, v: &VoteRecord) {
        let key = PersistentKey::VoteRecord(proposal_id, voter.clone());
        env.storage().persistent().set(&key, v);
        env.storage().persistent().extend_ttl(&key, VOTE_TTL_LEDGERS, VOTE_TTL_LEDGERS);
    }

    pub fn last_proposal_time(env: &Env, proposer: &Address) -> Option<u64> {
        env.storage()
            .persistent()
            .get(&PersistentKey::LastProposal(proposer.clone()))
    }
    pub fn set_last_proposal_time(env: &Env, proposer: &Address, v: u64) {
        let key = PersistentKey::LastProposal(proposer.clone());
        env.storage().persistent().set(&key, &v);
        env.storage().persistent().extend_ttl(&key, COOLDOWN_TTL_LEDGERS, COOLDOWN_TTL_LEDGERS);
    }

    /// Convenience: check if a proposal is in a terminal state.
    pub fn is_terminal(state: &ProposalState) -> bool {
        matches!(
            state,
            ProposalState::Executed | ProposalState::Cancelled | ProposalState::Rejected
        )
    }
}
