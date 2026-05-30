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
    gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false);

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
    gov.initialize(initialize(&admin, &token_id, &0i128, &0u64, &false)admin, &token_id, &0i128, &0u64, &0u32, &false);

    assert_eq!(gov.admin(), admin);
    assert_eq!(gov.proposal_count(), 0);
}

#[test]
fn test_initialize_double_init_fails() {
    let env = Env::default();
    let (gov, _, admin, _, _) = setup(&env);
    let token_id = env.register(TokenContract, ());
    let result = gov.try_initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false);
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
        &None,
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

#[test]
fn test_create_proposal_below_quorum_floor_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let voter = Address::generate(&env);

    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(&env, &token_id);
    token.initialize(&admin, &1_000_000i128); // 1M supply
    token.mint(&admin, &voter, &1_000_000i128);

    let gov_id = env.register(GovernanceContract, ());
    let gov = GovernanceContractClient::new(&env, &gov_id);
    // 10% quorum floor (1000 bps)
    gov.initialize(&admin, &token_id, &0i128, &0u64, &1000u32, &false);

    // 10% of 1M is 100k. 50k should fail.
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "desc"),
        &50_000i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::QuorumBelowFloor)));
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
    
    // Step 1: Transfer admin initiates two-step transfer
    gov.transfer_admin(&admin, &voter);
    
    // Admin should still be the old admin
    assert_eq!(gov.admin(), admin);
    
    // Pending admin should be the voter
    assert_eq!(gov.pending_admin(), Some(voter.clone()));
}

#[test]
fn test_accept_admin() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    
    // Step 1: Transfer admin initiates two-step transfer
    gov.transfer_admin(&admin, &voter);
    
    // Step 2: New admin accepts the transfer
    gov.accept_admin(&voter);
    
    // Admin should now be the voter
    assert_eq!(gov.admin(), voter);
    
    // Pending admin should be cleared
    assert_eq!(gov.pending_admin(), None);
}

#[test]
fn test_accept_admin_fails_for_non_pending() {
    let env = Env::default();
    let (gov, _, admin, voter, voter2) = setup(&env);
    
    // Try to accept admin when not pending
    let result = gov.try_accept_admin(&voter2);
    assert_eq!(result, Err(Ok(ContractError::NotPendingAdmin)));
}

#[test]
fn test_transfer_admin_prevents_accidental_loss() {
    let env = Env::default();
    let (gov, _, admin, voter, voter2) = setup(&env);
    
    // Transfer admin to voter
    gov.transfer_admin(&admin, &voter);
    
    // Old admin is still the admin until transfer is accepted
    assert_eq!(gov.admin(), admin);
    
    // Different address cannot accept it
    let result = gov.try_accept_admin(&voter2);
    assert_eq!(result, Err(Ok(ContractError::NotPendingAdmin)));
    
    // Only the pending admin can accept
    gov.accept_admin(&voter);
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

#[test]
fn test_update_quorum_with_votes_fails() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    let id = make_proposal(&gov, &env, &voter);
    
    // Cast a vote
    gov.cast_vote(&voter, &id, &Vote::Yes);
    
    // Attempt to update quorum
    let result = gov.try_update_quorum(&admin, &id, &1_000_000i128);
    assert_eq!(result, Err(Ok(ContractError::QuorumUpdateNotAllowed)));
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

// ---------------------------------------------------------------------------
// Pagination & Filtering
// ---------------------------------------------------------------------------

#[test]
fn test_get_proposals_pagination() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    
    // Create 5 proposals
    for _ in 0..5 {
        make_proposal(&gov, &env, &voter);
    }
    
    let page1 = gov.get_proposals(&0, &2);
    assert_eq!(page1.len(), 2);
    assert_eq!(page1.get(0).unwrap().id, 0);
    assert_eq!(page1.get(1).unwrap().id, 1);
    
    let page2 = gov.get_proposals(&2, &2);
    assert_eq!(page2.len(), 2);
    assert_eq!(page2.get(0).unwrap().id, 2);
    assert_eq!(page2.get(1).unwrap().id, 3);
    
    let page3 = gov.get_proposals(&4, &2);
    assert_eq!(page3.len(), 1);
    assert_eq!(page3.get(0).unwrap().id, 4);
}

#[test]
fn test_get_proposals_limit_cap() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    
    for _ in 0..25 {
        make_proposal(&gov, &env, &voter);
    }
    
    let large_page = gov.get_proposals(&0, &50);
    assert_eq!(large_page.len(), 20); // Capped at 20
}

#[test]
fn test_get_proposals_by_state() {
    let env = Env::default();
    let (gov, _, admin, voter, _) = setup(&env);
    
    let id0 = make_proposal(&gov, &env, &voter);
    let id1 = make_proposal(&gov, &env, &voter);
    let id2 = make_proposal(&gov, &env, &voter);
    
    gov.cancel(&admin, &id1);
    
    let active = gov.get_proposals_by_state(&ProposalState::Active, &0, &10);
    assert_eq!(active.len(), 2);
    assert_eq!(active.get(0).unwrap().id, 0);
    assert_eq!(active.get(1).unwrap().id, 2);
    
    let cancelled = gov.get_proposals_by_state(&ProposalState::Cancelled, &0, &10);
    assert_eq!(cancelled.len(), 1);
    assert_eq!(cancelled.get(0).unwrap().id, 1);
}

// ---------------------------------------------------------------------------
// Issue #84: Active Proposal Limit
// ---------------------------------------------------------------------------

#[test]
fn test_active_proposal_limit() {
    let env = Env::default();
    let (gov, _, _, voter, _) = setup(&env);
    
    // Fill up to the limit (50)
    for _ in 0..50 {
        make_proposal(&gov, &env, &voter);
    }
    
    // 51st should fail
    let result = gov.try_create_proposal(
        &voter,
        &String::from_str(&env, "Too Many"),
        &String::from_str(&env, "This should fail"),
        &1_000_000i128,
        &3600u64,
    );
    assert_eq!(result, Err(Ok(ContractError::ProposalsStillActive)));
}
