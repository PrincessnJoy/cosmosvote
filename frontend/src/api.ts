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

export async function fetchAllProposals(
  onProgress?: (loaded: number, total: number) => void
): Promise<Proposal[]> {
  const count = await fetchProposalCount();
  const ids = Array.from({ length: count }, (_, i) => i);
  return batchFetch(ids, async (id) => fetchProposal(id), 10, onProgress);
}

/**
 * Fetch items in concurrency-limited batches.
 * Failed individual fetches are skipped (null) rather than aborting all.
 */
export async function batchFetch<T>(
  ids: number[],
  fetcher: (id: number) => Promise<T>,
  concurrency = 10,
  onProgress?: (loaded: number, total: number) => void,
): Promise<T[]> {
  const results: T[] = [];
  let loaded = 0;
  const total = ids.length;

  for (let i = 0; i < total; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map(id => fetcher(id)));
    for (const result of settled) {
      if (result.status === 'fulfilled') results.push(result.value);
      // skips rejected — individual failure doesn't abort the batch
    }
    loaded += chunk.length;
    onProgress?.(Math.min(loaded, total), total);
  }

  return results;
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
