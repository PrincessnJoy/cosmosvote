//! Governance contract — unit tests.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{
    types::{ContractError, ProposalState, Vote},
    GovernanceContract, GovernanceContractClient,
};
use cosmosvote_token::{TokenContract, TokenContractClient};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn setup(env: &Env) -> (GovernanceContractClient<'_>, TokenContractClient<'_>, Address, Address, Address) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let voter = Address::generate(env);
    let voter2 = Address::generate(env);

    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(env, &token_id);
    token.initialize(&admin, &1_000_000_000i128);
    token.mint(&admin, &voter, &10_000_000i128);
    token.mint(&admin, &voter2, &5_000_000i128);

    let gov_id = env.register(GovernanceContract, ());
    let gov = GovernanceContractClient::new(env, &gov_id);
    gov.initialize(&admin, &token_id, &0i128, &0u64, &false);

    (gov, token, admin, voter, voter2)
}

#[test]
fn test_get_config() {
    let env = Env::default();
    let (gov, token, admin, _, _) = setup(&env);
    
    let config = gov.get_config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.voting_token, token.address);
    assert_eq!(config.min_proposal_balance, 0i128);
    assert_eq!(config.proposal_cooldown, 0u64);
    assert_eq!(config.restrict_admin_vote, false);
    assert_eq!(config.paused, false);
}

fn make_proposal(gov: &GovernanceContractClient, env: &Env, proposer: &Address) -> u64 {
    gov.create_proposal(
        proposer,
        &String::from_str(env, "Upgrade Protocol"),
        &String::from_str(env, "Upgrade the CosmosVote protocol to v2"),
        &5_000_000i128,
        &604_800u64,
    )
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

#[test]
fn test_initialize_success() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(&env, &token_id);
    token.initialize(&admin, &1_000_000_000i128);

    let gov_id = env.register(GovernanceContract, ());
    let gov = GovernanceContractClient::new(&env, &gov_id);
    gov.initialize(&admin, &token_id, &0i128, &0u64, &false);

    assert_eq!(gov.admin(), admin);
    assert_eq!(gov.proposal_count(), 0);
}

#[test]
fn test_initialize_double_init_fails() {
    let env = Env::default();
    let (gov, _, admin, _, _) = setup(&env);
    let token_id = env.register(TokenContract, ());
    let result = gov.try_initialize(&admin, &token_id, &0i128, &0u64, &false);
    assert_eq!(result, Err(Ok(ContractError::AlreadyInitialized)));
}

// ---------------------------------------------------------------------------
// Proposal creation
// ---------------------------------------------------------------------------

#[test]
fn test_create_proposal_success() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    assert_eq!(id, 0);
    assert_eq!(gov.proposal_count(), 1);
}

#[test]
fn test_create_proposal_increments_id() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id0 = make_proposal(&gov, &env, &voter);
    let id1 = make_proposal(&gov, &env, &voter);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
}

#[test]
fn test_create_proposal_empty_title_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, ""),
        &String::from_str(&env, "desc"),
        &1_000_000i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidTitle)));
}

#[test]
fn test_create_proposal_zero_quorum_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "desc"),
        &0i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidQuorum)));
}

#[test]
fn test_create_proposal_duration_too_short_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "desc"),
        &1_000_000i128,
        &10u64,
    );
    assert_eq!(result, Err(Ok(ContractError::InvalidDurationRange)));
}

#[test]
fn test_create_proposal_quorum_exceeds_supply_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "desc"),
        &2_000_000_000i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::QuorumExceedsSupply)));
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

#[test]
fn test_cast_vote_yes() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter, &id, &Vote::Yes);
    assert!(gov.has_voted(&id, &voter));
    let record = gov.get_vote(&id, &voter);
    assert_eq!(record.vote, Vote::Yes);
    assert_eq!(record.weight, 10_000_000);
}

#[test]
fn test_cast_vote_no() {
    let env = Env::default();
    let (gov, _, _, voter, voter2) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter2, &id, &Vote::No);
    let record = gov.get_vote(&id, &voter2);
    assert_eq!(record.vote, Vote::No);
}

#[test]
fn test_cast_vote_abstain() {
    let env = Env::default();
    let (gov, _, _, voter, voter2) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter2, &id, &Vote::Abstain);
    let record = gov.get_vote(&id, &voter2);
    assert_eq!(record.vote, Vote::Abstain);
}

#[test]
fn test_double_vote_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter, &id, &Vote::Yes);
    let result = gov.try_cast_vote(&voter, &id, &Vote::No);
    assert_eq!(result, Err(Ok(ContractError::AlreadyVoted)));
}

#[test]
fn test_vote_after_period_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    let result = gov.try_cast_vote(&voter, &id, &Vote::Yes);
    assert_eq!(result, Err(Ok(ContractError::VotingPeriodEnded)));
}

#[test]
fn test_vote_no_power_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    let broke = Address::generate(&env);
    let result = gov.try_cast_vote(&broke, &id, &Vote::Yes);
    assert_eq!(result, Err(Ok(ContractError::NoVotingPower)));
}

// ---------------------------------------------------------------------------
// Finalization
// ---------------------------------------------------------------------------

#[test]
fn test_finalise_passed() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter, &id, &Vote::Yes);
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    gov.finalise(&id);
    let updated = gov.get_proposal(&id);
    assert_eq!(updated.state, ProposalState::Passed);
}

#[test]
fn test_finalise_rejected_quorum_not_met() {
    let env = Env::default();
    let (gov, _, _, voter, voter2) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    // voter2 has 5M, quorum is 5M but votes_yes must exceed votes_no
    gov.cast_vote(&voter2, &id, &Vote::No);
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    gov.finalise(&id);
    let updated = gov.get_proposal(&id);
    assert_eq!(updated.state, ProposalState::Rejected);
}

#[test]
fn test_finalise_voting_still_open_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    let result = gov.try_finalise(&id);
    assert_eq!(result, Err(Ok(ContractError::VotingStillOpen)));
}

#[test]
fn test_finalise_tie_rejected() {
    let env = Env::default();
    let (gov, token, admin, voter, voter2) = setup(&env);
    // Make equal balances
    token.mint(&admin, &voter2, &5_000_000i128); // voter2 now has 10M
    let id = gov.create_proposal(
        &voter,
        &String::from_str(&env, "Tie Test"),
        &String::from_str(&env, "Equal yes and no votes"),
        &5_000_000i128,
        &3600u64,
    );
    gov.cast_vote(&voter, &id, &Vote::Yes);
    gov.cast_vote(&voter2, &id, &Vote::No);
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    gov.finalise(&id);
    let updated = gov.get_proposal(&id);
    assert_eq!(updated.state, ProposalState::Rejected);
}

// ---------------------------------------------------------------------------
// Execution & cancellation
// ---------------------------------------------------------------------------

#[test]
fn test_execute_passed_proposal() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cast_vote(&voter, &id, &Vote::Yes);
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    gov.finalise(&id);
    gov.execute(&admin, &id);
    let updated = gov.get_proposal(&id);
    assert_eq!(updated.state, ProposalState::Executed);
}

#[test]
fn test_execute_not_passed_fails() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    let result = gov.try_execute(&admin, &id);
    assert_eq!(result, Err(Ok(ContractError::ProposalNotPassed)));
}

#[test]
fn test_cancel_active_proposal() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.cancel(&admin, &id);
    let updated = gov.get_proposal(&id);
    assert_eq!(updated.state, ProposalState::Cancelled);
}

#[test]
fn test_cancel_non_admin_fails() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    let result = gov.try_cancel(&voter, &id);
    assert_eq!(result, Err(Ok(ContractError::NotAdmin)));
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

#[test]
fn test_transfer_admin() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    gov.transfer_admin(&admin, &voter);
    assert_eq!(gov.admin(), voter);
}

#[test]
fn test_pause_unpause() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    gov.pause(&admin);
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "desc"),
        &1_000_000i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::ContractPaused)));
    gov.unpause(&admin);
    // Should succeed after unpause
    let id = make_proposal(&gov, &env, &voter);
    assert_eq!(id, 0);
}

#[test]
fn test_update_quorum() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    gov.update_quorum(&admin, &id, &1_000_000i128);
    let proposal = gov.get_proposal(&id);
    assert_eq!(proposal.quorum, 1_000_000);
}

// ---------------------------------------------------------------------------
// Proposal not found
// ---------------------------------------------------------------------------

#[test]
fn test_get_nonexistent_proposal_fails() {
    let env = Env::default();
    let (gov, _, _, _, _) = setup(&env);
    let result = gov.try_get_proposal(&999u64);
    assert_eq!(result, Err(Ok(ContractError::ProposalNotFound)));
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

#[test]
fn test_version() {
    let env = Env::default();
    let (gov, _, _, _, _) = setup(&env);
    assert_eq!(gov.version(), (1u32, 0u32, 0u32));
}
