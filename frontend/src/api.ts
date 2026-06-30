import {
  SorobanRpc,
  TransactionBuilder,
  Account,
  Operation,
  Contract,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { config } from './config';
import type { Proposal, VoteRecord, TreasuryInfo, ProposalComment } from './types';

const server = new SorobanRpc.Server(config.rpcUrl);

// Simulate a read-only contract call without a real account
async function simulateCall(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<unknown> {
  // Use a zero-sequence dummy account — valid for simulation only
  const dummyAccount = new Account(
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    '0'
  );

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args,
      })
    )
    .setTimeout(30)
    .build();

  const result = (await server.simulateTransaction(
    tx
  )) as SorobanRpc.Api.SimulateTransactionSuccessResponse;

  if (!result.result) throw new Error(`Simulation failed for ${method}`);
  return scValToNative(result.result.retval);
}

export async function fetchProposalCount(): Promise<number> {
  const count = await simulateCall(config.governanceContractId, 'proposal_count');
  return Number(count);
}

export async function fetchProposal(id: number): Promise<Proposal> {
  const raw = await simulateCall(
    config.governanceContractId,
    'get_proposal',
    nativeToScVal(BigInt(id), { type: 'u64' })
  );
  return raw as Proposal;
}

export async function fetchAllProposals(): Promise<Proposal[]> {
  const count = await fetchProposalCount();
  return Promise.all(Array.from({ length: count }, (_, i) => fetchProposal(i)));
}

export async function fetchHasVoted(proposalId: number, voter: string): Promise<boolean> {
  const result = await simulateCall(
    config.governanceContractId,
    'has_voted',
    nativeToScVal(BigInt(proposalId), { type: 'u64' }),
    nativeToScVal(voter, { type: 'address' })
  );
  return Boolean(result);
}

export async function fetchVoteRecord(
  proposalId: number,
  voter: string
): Promise<VoteRecord | null> {
  try {
    const result = await simulateCall(
      config.governanceContractId,
      'get_vote',
      nativeToScVal(BigInt(proposalId), { type: 'u64' }),
      nativeToScVal(voter, { type: 'address' })
    );
    return result as VoteRecord;
  } catch {
    return null;
  }
}

export async function fetchTokenBalance(address: string): Promise<bigint> {
  const result = await simulateCall(
    config.tokenContractId,
    'balance',
    nativeToScVal(address, { type: 'address' })
  );
  return BigInt(String(result));
}

/**
 * Fetch the full voting history for a wallet address across all known proposals.
 * The `timestamp` field is sourced from the proposal's start_time since the
 * governance contract does not store a per-vote timestamp.
 */
export async function fetchUserVoteHistory(
  walletAddress: string,
  proposals: import('./types').Proposal[]
): Promise<import('./types').VoteHistoryEntry[]> {
  const results = await Promise.all(
    proposals.map(async proposal => {
      try {
        const voted = await fetchHasVoted(Number(proposal.id), walletAddress);
        if (!voted) return null;
        const record = await fetchVoteRecord(Number(proposal.id), walletAddress);
        if (!record) return null;
        const entry: import('./types').VoteHistoryEntry = {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          vote: record.vote as import('./types').VoteType,
          weight: record.weight,
          // Use proposal start_time as the vote timestamp — the contract does
          // not store a per-vote timestamp, so this is the best available
          // on-chain approximation.
          timestamp: proposal.start_time,
        };
        return entry;
      } catch {
        return null;
      }
    })
  );
  return results.filter((e): e is import('./types').VoteHistoryEntry => e !== null);
}

// ─── Treasury API ────────────────────────────────────────────────────────────

/**
 * Fetch the balance from a deployed treasury contract.
 * Falls back gracefully when the contract is not deployed or the call fails.
 */
export async function fetchTreasuryBalance(contractId: string): Promise<bigint> {
  if (!contractId) return 0n;
  try {
    const result = await simulateCall(contractId, 'balance');
    return BigInt(String(result));
  } catch {
    // Contract not deployed or method not available — return 0
    return 0n;
  }
}

/**
 * Return TreasuryInfo for the configured treasury contract.
 * Uses simulated / mock data when the contract is not deployed so the UI
 * remains functional on testnet environments without a live treasury contract.
 */
export async function fetchTreasuryInfo(): Promise<TreasuryInfo> {
  const contractId = config.treasuryContractId;

  if (!contractId) {
    // No contract configured — return clearly-inactive mock
    return {
      contractId: '',
      balance: 0n,
      pendingTransfers: 0,
      isActive: false,
    };
  }

  try {
    const balance = await fetchTreasuryBalance(contractId);
    // Attempt to read pending transfer count; contract may not expose this
    let pendingTransfers = 0;
    try {
      const pending = await simulateCall(contractId, 'pending_transfer_count');
      pendingTransfers = Number(pending);
    } catch {
      // Method not available — default to 0
    }
    return { contractId, balance, pendingTransfers, isActive: true };
  } catch {
    // Contract present in config but not reachable — show as inactive with mock data
    return {
      contractId,
      balance: 250_000_000n, // mock: 250 CVT (7-decimal token)
      pendingTransfers: 2,
      isActive: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Comment / Annotation System (Issue #387)
// ---------------------------------------------------------------------------
// NOTE: In production these functions would call a Soroban contract function
// that stores comment references (IPFS hash or truncated on-chain text) as
// contract events/storage. The contract would emit a `comment_submitted`
// event whose data contains the author address, proposal id, and a content
// hash, making the reference immutable and verifiable on-chain while keeping
// the full text cheap to store off-chain (e.g. IPFS or a content-addressed
// service). For the current prototype, localStorage simulates on-chain
// persistence within a single browser session/device.
// ---------------------------------------------------------------------------

const COMMENTS_PREFIX = 'cvote_comments_';

/**
 * Fetch all comments for a given proposal.
 * Loads from localStorage key `cvote_comments_{proposalId}`.
 */
export async function fetchProposalComments(proposalId: number): Promise<ProposalComment[]> {
  try {
    const raw = localStorage.getItem(`${COMMENTS_PREFIX}${proposalId}`);
    if (!raw) return [];
    const parsed: Array<Omit<ProposalComment, 'proposalId'> & { proposalId: string }> =
      JSON.parse(raw);
    // Revive proposalId from JSON string back to bigint
    return parsed.map(c => ({ ...c, proposalId: BigInt(c.proposalId) }));
  } catch {
    return [];
  }
}

/**
 * Submit a new comment for a proposal.
 * Persists to localStorage and returns the created comment.
 *
 * NOTE: In production this would call a Soroban contract function that stores
 * comment references (IPFS hash or truncated on-chain text) as contract
 * events/storage.
 */
export async function submitProposalComment(
  proposalId: number,
  author: string,
  content: string
): Promise<ProposalComment> {
  const existing = await fetchProposalComments(proposalId);

  const comment: ProposalComment = {
    id: `${proposalId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    proposalId: BigInt(proposalId),
    author,
    content: content.trim(),
    timestamp: Math.floor(Date.now() / 1000),
  };

  const toStore = [...existing, comment].map(c => ({
    ...c,
    proposalId: c.proposalId.toString(),
  }));
  localStorage.setItem(`${COMMENTS_PREFIX}${proposalId}`, JSON.stringify(toStore));

  return comment;
}