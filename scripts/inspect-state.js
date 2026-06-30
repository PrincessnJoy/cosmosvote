#!/usr/bin/env node
/**
 * inspect-state.js — Contract state inspection tool for CosmosVote
 *
 * Queries the governance contract storage via Soroban RPC and prints
 * proposals, vote tallies, and admin settings in a human-readable format.
 *
 * Usage:
 *   node scripts/inspect-state.js [command] [options]
 *
 * Commands:
 *   config                       Show admin settings
 *   proposals [--limit N]        List proposals (default: last 10)
 *   proposal <id>                Show a single proposal in detail
 *   votes <proposal-id>          Show vote tallies for a proposal
 *   all                          Show everything (config + all proposals)
 *
 * Options:
 *   --rpc-url <url>              Soroban RPC endpoint (or STELLAR_RPC_URL env)
 *   --contract-id <id>           Governance contract ID (or GOVERNANCE_CONTRACT_ID env)
 *   --network <testnet|mainnet>  Network shorthand (sets default rpc-url)
 *   --json                       Output raw JSON
 *
 * Examples:
 *   node scripts/inspect-state.js config
 *   node scripts/inspect-state.js proposals --limit 5
 *   node scripts/inspect-state.js proposal 3
 *   node scripts/inspect-state.js all --json
 *
 * Environment variables (can be set in .env):
 *   STELLAR_RPC_URL          — Soroban RPC URL
 *   GOVERNANCE_CONTRACT_ID   — Governance contract address
 */

'use strict';

// Load .env if present
try { require('dotenv').config(); } catch { /* dotenv optional */ }

const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const NETWORK_RPC = {
  testnet: 'https://soroban-testnet.stellar.org',
  mainnet: 'https://mainnet.stellar.validationcloud.io/v1/stellar',
};

const args  = process.argv.slice(2);
const flags = parseFlags(args);

const RPC_URL     = flags['--rpc-url']     ?? process.env.STELLAR_RPC_URL         ?? NETWORK_RPC[flags['--network'] ?? 'testnet'];
const CONTRACT_ID = flags['--contract-id'] ?? process.env.GOVERNANCE_CONTRACT_ID  ?? '';
const JSON_OUTPUT = '--json' in flags;
const LIMIT       = parseInt(flags['--limit'] ?? '10', 10);
const CMD         = args.filter(a => !a.startsWith('--'))[0] ?? 'all';
const CMD_ARG     = args.filter(a => !a.startsWith('--'))[1];

if (!CONTRACT_ID) {
  die('GOVERNANCE_CONTRACT_ID is not set. Pass --contract-id or set the env var.');
}

// ---------------------------------------------------------------------------
// Soroban RPC helpers
// ---------------------------------------------------------------------------

/** Call a read-only contract function via the Stellar CLI. */
function invokeView(fn, ...fnArgs) {
  const argStr = fnArgs.map(a => `--arg '${a}'`).join(' ');
  const cmd = [
    'stellar contract invoke',
    `--rpc-url "${RPC_URL}"`,
    `--id "${CONTRACT_ID}"`,
    '--network-passphrase "Test SDF Network ; September 2015"',
    `-- ${fn}`,
    argStr,
  ].join(' ');

  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(out.trim());
  } catch (err) {
    const stderr = err.stderr?.toString() ?? '';
    if (stderr.includes('not found') || stderr.includes('missing')) return null;
    throw new Error(`RPC call failed for "${fn}": ${stderr}`);
  }
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

function fetchConfig() {
  return {
    admin:               invokeView('admin'),
    votingToken:         invokeView('voting_token'),
    paused:              invokeView('is_paused'),
    proposalCount:       invokeView('proposal_count'),
    activeProposalCount: invokeView('active_proposal_count'),
    minProposalBalance:  invokeView('min_proposal_balance'),
    proposalCooldown:    invokeView('proposal_cooldown'),
    restrictAdminVote:   invokeView('restrict_admin_vote'),
  };
}

function fetchProposal(id) {
  return invokeView('get_proposal', id);
}

function fetchProposals(limit) {
  const count = invokeView('proposal_count') ?? 0;
  const start = Math.max(1, count - limit + 1);
  const proposals = [];
  for (let id = start; id <= count; id++) {
    const p = fetchProposal(id);
    if (p) proposals.push(p);
  }
  return proposals;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function printConfig(cfg) {
  console.log('\n=== Admin Settings ===');
  console.log(`  Admin address       : ${cfg.admin ?? 'n/a'}`);
  console.log(`  Voting token        : ${cfg.votingToken ?? 'n/a'}`);
  console.log(`  Paused              : ${cfg.paused}`);
  console.log(`  Proposal count      : ${cfg.proposalCount}`);
  console.log(`  Active proposals    : ${cfg.activeProposalCount}`);
  console.log(`  Min proposal balance: ${cfg.minProposalBalance}`);
  console.log(`  Proposal cooldown   : ${cfg.proposalCooldown}s`);
  console.log(`  Restrict admin vote : ${cfg.restrictAdminVote}`);
}

function stateLabel(state) {
  if (!state) return 'Unknown';
  if (typeof state === 'string') return state;
  return Object.keys(state)[0] ?? JSON.stringify(state);
}

function printProposal(p) {
  if (!p) { console.log('  (not found)'); return; }
  const total = (p.votes_yes ?? 0) + (p.votes_no ?? 0) + (p.votes_abstain ?? 0);
  console.log(`\n  Proposal #${p.id}`);
  console.log(`    Title       : ${p.title}`);
  console.log(`    State       : ${stateLabel(p.state)}`);
  console.log(`    Proposer    : ${p.proposer}`);
  console.log(`    Quorum      : ${p.quorum}`);
  console.log(`    Votes Yes   : ${p.votes_yes}  No: ${p.votes_no}  Abstain: ${p.votes_abstain}  Total: ${total}`);
  console.log(`    Voters      : ${p.voter_count}`);
  console.log(`    Start/End   : ${p.start_time} / ${p.end_time}`);
  if (p.description) console.log(`    Description : ${p.description.slice(0, 120)}${p.description.length > 120 ? '…' : ''}`);
}

function printProposals(list) {
  if (!list.length) { console.log('  No proposals found.'); return; }
  console.log(`\n=== Proposals (${list.length}) ===`);
  list.forEach(printProposal);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  switch (CMD) {
    case 'config': {
      const cfg = fetchConfig();
      JSON_OUTPUT ? console.log(JSON.stringify(cfg, null, 2)) : printConfig(cfg);
      break;
    }
    case 'proposals': {
      const list = fetchProposals(LIMIT);
      JSON_OUTPUT ? console.log(JSON.stringify(list, null, 2)) : printProposals(list);
      break;
    }
    case 'proposal': {
      if (!CMD_ARG) die('Usage: proposal <id>');
      const p = fetchProposal(parseInt(CMD_ARG, 10));
      JSON_OUTPUT ? console.log(JSON.stringify(p, null, 2)) : printProposal(p);
      break;
    }
    case 'votes': {
      if (!CMD_ARG) die('Usage: votes <proposal-id>');
      const p = fetchProposal(parseInt(CMD_ARG, 10));
      if (!p) { console.log('Proposal not found.'); break; }
      const votes = { yes: p.votes_yes, no: p.votes_no, abstain: p.votes_abstain, voters: p.voter_count };
      JSON_OUTPUT ? console.log(JSON.stringify(votes, null, 2)) : console.log(`\nVotes for #${CMD_ARG}:`, votes);
      break;
    }
    case 'all': {
      const cfg  = fetchConfig();
      const list = fetchProposals(LIMIT);
      if (JSON_OUTPUT) {
        console.log(JSON.stringify({ config: cfg, proposals: list }, null, 2));
      } else {
        printConfig(cfg);
        printProposals(list);
      }
      break;
    }
    default:
      die(`Unknown command: ${CMD}. Use: config | proposals | proposal | votes | all`);
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      result[argv[i]] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return result;
}

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

main().catch(err => { console.error(err.message); process.exit(1); });
