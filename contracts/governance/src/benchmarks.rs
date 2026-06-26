//! Gas and storage benchmarks for governance contract operations.
//!
//! Run with:
//!   cargo test bench_ --features testutils -- --nocapture
//!
//! Each test resets the budget, runs one operation, then prints CPU instruction
//! count and memory bytes consumed by that call.

#![cfg(test)]

use soroban_sdk::Env;

use crate::{
    test_helpers::{advance_past_end, create_proposal, setup},
    types::Vote,
};

macro_rules! measure {
    ($env:expr, $label:expr, $op:expr) => {{
        $env.budget().reset_default();
        $op;
        let cpu = $env.budget().cpu_instruction_cost();
        let mem = $env.budget().memory_bytes_cost();
        println!("=== {} ===", $label);
        println!("  CPU instructions : {}", cpu);
        println!("  Memory bytes     : {}", mem);
        (cpu, mem)
    }};
}

#[test]
fn bench_create_proposal() {
    let env = Env::default();
    let t = setup(&env);
    let (cpu, mem) = measure!(&env, "create_proposal", create_proposal(&t, &t.voter_a));
    assert!(cpu < 100_000_000, "create_proposal CPU too high: {cpu}");
    assert!(mem < 40_000_000, "create_proposal memory too high: {mem}");
}

#[test]
fn bench_cast_vote() {
    let env = Env::default();
    let t = setup(&env);
    let id = create_proposal(&t, &t.voter_a);
    let (cpu, mem) = measure!(&env, "cast_vote", t.governance.cast_vote(&t.voter_b, &id, &Vote::Yes));
    assert!(cpu < 100_000_000, "cast_vote CPU too high: {cpu}");
    assert!(mem < 40_000_000, "cast_vote memory too high: {mem}");
}

#[test]
fn bench_finalise_passed() {
    let env = Env::default();
    let t = setup(&env);
    let id = create_proposal(&t, &t.voter_a);
    t.governance.cast_vote(&t.voter_a, &id, &Vote::Yes);
    t.governance.cast_vote(&t.voter_b, &id, &Vote::Yes);
    let prop = t.governance.get_proposal(&id);
    advance_past_end(&env, prop.end_time);
    let (cpu, mem) = measure!(&env, "finalise (passed)", t.governance.finalise(&id));
    assert!(cpu < 100_000_000, "finalise CPU too high: {cpu}");
    assert!(mem < 40_000_000, "finalise memory too high: {mem}");
}

#[test]
fn bench_finalise_rejected() {
    let env = Env::default();
    let t = setup(&env);
    let id = create_proposal(&t, &t.voter_a);
    // voter_c has 3_000_000 tokens — below quorum of 5_000_000
    t.governance.cast_vote(&t.voter_c, &id, &Vote::Yes);
    let prop = t.governance.get_proposal(&id);
    advance_past_end(&env, prop.end_time);
    let (cpu, mem) = measure!(&env, "finalise (rejected)", t.governance.finalise(&id));
    assert!(cpu < 100_000_000, "finalise (rejected) CPU too high: {cpu}");
    assert!(mem < 40_000_000, "finalise (rejected) memory too high: {mem}");
}

#[test]
fn bench_cancel() {
    let env = Env::default();
    let t = setup(&env);
    let id = create_proposal(&t, &t.voter_a);
    let (cpu, mem) = measure!(&env, "cancel", t.governance.cancel(&t.admin, &id));
    assert!(cpu < 100_000_000, "cancel CPU too high: {cpu}");
    assert!(mem < 40_000_000, "cancel memory too high: {mem}");
}

#[test]
fn bench_execute() {
    let env = Env::default();
    let t = setup(&env);
    let id = create_proposal(&t, &t.voter_a);
    t.governance.cast_vote(&t.voter_a, &id, &Vote::Yes);
    t.governance.cast_vote(&t.voter_b, &id, &Vote::Yes);
    let prop = t.governance.get_proposal(&id);
    advance_past_end(&env, prop.end_time);
    t.governance.finalise(&id);
    let (cpu, mem) = measure!(&env, "execute", t.governance.execute(&t.admin, &id));
    assert!(cpu < 100_000_000, "execute CPU too high: {cpu}");
    assert!(mem < 40_000_000, "execute memory too high: {mem}");
}
