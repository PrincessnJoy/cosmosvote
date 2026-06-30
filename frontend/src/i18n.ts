/** Localization strings — English defaults. Replace values for other locales. */

export const t = {
  // App header
  app_title: '🌌 CosmosVote',
  app_subtitle: 'On-chain governance',
  connect_wallet: 'Connect Wallet',
  connect_wallet_prompt: 'Enter your Stellar address (G...):',

  // Filters / search
  search_placeholder: 'Search proposals...',
  search_aria_label: 'Search proposals',
  filter_aria_label: 'Filter by state',
  filter_all_states: 'All States',

  // Stats bar labels
  stat_total: 'Total',
  stat_active: 'Active',
  stat_passed: 'Passed',
  stat_executed: 'Executed',

  // Content states
  loading_proposals: 'Loading proposals...',
  no_proposals: 'No proposals found.',

  // ProposalCard
  card_ends: 'Ends',
  card_quorum: 'Quorum',
  card_quorum_progress: '% of quorum',
  vote_yes: '✅',
  vote_no: '❌',
  vote_abstain: '⬜',

  // ProposalDetail
  detail_heading: 'Proposal #',
  detail_close_aria: 'Close',
  detail_state: 'State',
  detail_proposer: 'Proposer',
  detail_start: 'Start',
  detail_end: 'End',
  detail_quorum: 'Quorum',
  detail_total_votes: 'Total Votes',
  vote_yes_label: '✅ Yes',
  vote_no_label: '❌ No',
  vote_abstain_label: '⬜ Abstain',
  vote_status_checking: 'Checking vote status...',
  vote_status_cast: 'You voted',
  vote_status_cast_weight: 'with weight',
  vote_status_not_cast: 'You have not voted on this proposal',
} as const;

export type TranslationKey = keyof typeof t;
