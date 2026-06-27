import {
  SorobanRpc,
  TransactionBuilder,
  Account,
  Operation,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { config } from './config';
import type { Proposal, VoteRecord } from './types';

const server = new SorobanRpc.Server(config.rpcUrl);

// ---------------------------------------------------------------------------
// Simulation error — distinct from real on-chain failures
// ---------------------------------------------------------------------------

export class SimulationError extends Error {
  constructor(
    message: string,
    public readonly raw: SorobanRpc.Api.SimulateTransactionResponse,
  ) {
    super(message);
    this.name = 'SimulationError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildTx(
  senderOrDummy: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): ReturnType<TransactionBuilder['build']> {
  const account = new Account(senderOrDummy, '0');
  return new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: method,
        args,
      }),
    )
    .setTimeout(30)
    .build();
}

// Simulate a read-only contract call without a real account
async function simulateCall(
  contractId: string,
  method: string,
  ...args: xdr.ScVal[]
): Promise<unknown> {
  // Use a zero-sequence dummy account — valid for simulation only
  const dummyAccount = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
  const tx = buildTx(dummyAccount, contractId, method, args);
  const result = (await server.simulateTransaction(
    tx
  )) as SorobanRpc.Api.SimulateTransactionSuccessResponse;

  if (!result.result) throw new Error(`Simulation failed for ${method}`);
  return scValToNative(result.result.retval);
}

// ---------------------------------------------------------------------------
// Public: simulate a write transaction and return a structured preview.
// This does NOT submit anything on-chain.
// ---------------------------------------------------------------------------

export interface SimulationPreview {
  /** Estimated fee in stroops (1 XLM = 10_000_000 stroops). */
  feeStoops: string;
  /** Decoded return value, if any. */
  result: unknown;
  /** Whether the simulation succeeded. */
  success: true;
}

/**
 * Simulate a state-changing contract call for the given sender address.
 * Returns a `SimulationPreview` on success or throws `SimulationError` on
 * failure — so callers can distinguish simulation errors from real tx errors.
 */
export async function simulateWriteCall(
  sender: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<SimulationPreview> {
  const tx = buildTx(sender, contractId, method, args);
  const raw = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(raw)) {
    throw new SimulationError(
      `Simulation error for ${method}: ${(raw as SorobanRpc.Api.SimulateTransactionErrorResponse).error}`,
      raw,
    );
  }

  const success = raw as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  return {
    feeStoops: success.minResourceFee ?? '0',
    result: success.result ? scValToNative(success.result.retval) : undefined,
    success: true,
  };
}

/** Simulate casting a vote. Call this before the real transaction to show the user a fee preview. */
export async function simulateCastVote(
  voter: string,
  proposalId: number,
  vote: string,
): Promise<SimulationPreview> {
  return simulateWriteCall(voter, config.governanceContractId, 'cast_vote', [
    nativeToScVal(voter, { type: 'address' }),
    nativeToScVal(BigInt(proposalId), { type: 'u64' }),
    nativeToScVal({ tag: vote, values: [] }, { type: 'enum' }),
  ]);
}

/** Simulate creating a proposal. Lets the proposer preview the fee before submitting. */
export async function simulateCreateProposal(
  proposer: string,
  title: string,
  description: string,
  quorum: bigint,
  duration: bigint,
): Promise<SimulationPreview> {
  return simulateWriteCall(proposer, config.governanceContractId, 'create_proposal', [
    nativeToScVal(proposer, { type: 'address' }),
    nativeToScVal(title, { type: 'string' }),
    nativeToScVal(description, { type: 'string' }),
    nativeToScVal(quorum, { type: 'i128' }),
    nativeToScVal(duration, { type: 'u64' }),
  ]);
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

export async function fetchTokenDecimals(): Promise<number> {
  const result = await simulateCall(
    config.tokenContractId,
    'decimals'
  );
  return Number(result);
}
