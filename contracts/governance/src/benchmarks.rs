//! Governance contract — performance benchmarks at scale.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};
use crate::{
    types::Vote,
    test_helpers::setup,
    GovernanceContract, GovernanceContractClient,
};
use cosmosvote_token::{TokenContract, TokenContractClient};

/// Run a benchmark for cast_vote and finalise at a specific voter scale.
fn run_voter_benchmark(voter_count: u32) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_id = env.register(TokenContract, ());
    let token = TokenContractClient::new(&env, &token_id);
    token.initialize(&admin, &1_000_000_000_000i128);

    let gov_id = env.register(GovernanceContract, ());
    let gov = GovernanceContractClient::new(&env, &gov_id);
    gov.initialize(&admin, &token_id, &0i128, &0u64, &0u32, &false, &None);

    // Create a proposal
    let proposer = Address::generate(&env);
    token.mint(&admin, &proposer, &1_000_000i128);
    let id = gov.create_proposal(
        &proposer,
        &String::from_str(&env, "Scale Test"),
        &String::from_str(&env, "Stress testing governance with many voters"),
        &1_000_000i128,
        &604_800u64,
        &None,
    );

    // Generate voters and cast votes
    let mut voters = soroban_sdk::vec![&env];
    for _ in 0..voter_count {
        let v = Address::generate(&env);
        token.mint(&admin, &v, &1_000i128);
        voters.push_back(v);
    }

    // Measure cast_vote for the last voter (worst case storage load)
    let last_voter = voters.get(voter_count - 1).unwrap();
    
    env.budget().reset_default();
    gov.cast_vote(&last_voter, &id, &Vote::Yes);
    let cast_ins = env.budget().instructions_consumed();
    
    // Measure finalise
    let proposal = gov.get_proposal(&id);
    env.ledger().with_mut(|l| l.timestamp = proposal.end_time + 1);
    
    env.budget().reset_default();
    gov.finalise(&id);
    let finalise_ins = env.budget().instructions_consumed();

    // Print results for documentation
    std::print!("\nVoter count: {}\n", voter_count);
    std::print!("cast_vote instructions: {}\n", cast_ins);
    std::print!("finalise instructions: {}\n", finalise_ins);

    // Safety gate: Soroban per-transaction limit is ~100M instructions.
    // We expect these to be much lower (e.g., < 5M).
    assert!(cast_ins < 10_000_000, "cast_vote exceeds instruction safety limit");
    assert!(finalise_ins < 10_000_000, "finalise exceeds instruction safety limit");
}

#[test]
fn bench_100_voters() {
    run_voter_benchmark(100);
}

#[test]
fn bench_500_voters() {
    run_voter_benchmark(500);
}

#[test]
fn bench_1000_voters() {
    run_voter_benchmark(1000);
}
