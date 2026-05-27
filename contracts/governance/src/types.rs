//! Governance contract — type definitions and error codes.

use soroban_sdk::{contracterror, contracttype, Address, String};

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    // Initialization
    AlreadyInitialized  = 1,
    NotInitialized      = 2,

    // Proposals
    ProposalNotFound    = 10,
    ProposalNotActive   = 11,
    ProposalNotPassed   = 12,
    InvalidTitle        = 13,
    InvalidDescription  = 14,
    InvalidQuorum       = 15,
    QuorumExceedsSupply = 16,
    InvalidDurationRange = 17,
    InsufficientBalance = 18,
    ProposalCooldown    = 19,

    // Voting
    VotingNotStarted    = 20,
    VotingPeriodEnded   = 21,
    VotingStillOpen     = 22,
    AlreadyVoted        = 23,
    NoVotingPower       = 24,
    AdminVoteRestricted = 25,
    VoteNotFound        = 26,

    // Admin
    NotAdmin            = 30,
    InvalidNewAdmin     = 31,

    // Contract state
    ContractPaused      = 40,
    NotPaused           = 41,

    // Arithmetic
    ArithmeticOverflow  = 50,
}

// ---------------------------------------------------------------------------
// Contract state
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContractState {
    Uninitialized,
    Ready,
}

// ---------------------------------------------------------------------------
// Proposal
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalState {
    Active,
    Passed,
    Rejected,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub votes_yes: i128,
    pub votes_no: i128,
    pub votes_abstain: i128,
    pub quorum: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub state: ProposalState,
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Vote {
    Yes,
    No,
    Abstain,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteRecord {
    pub vote: Vote,
    pub weight: i128,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct GovernanceConfig {
    pub admin: Address,
    pub voting_token: Address,
    pub min_proposal_balance: i128,
    pub proposal_cooldown: u64,
    pub restrict_admin_vote: bool,
    pub paused: bool,
}
