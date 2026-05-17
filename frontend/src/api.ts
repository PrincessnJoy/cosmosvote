import { SorobanRpc, Contract, TransactionBuilder, Networks, Keypair, xdr, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';
import { config } from './config';
import type { Proposal, VoteRecord } from './types';

const server = new SorobanRpc.Server(config.rpcUrl);

async function simulateCall(contractId: string, method: string, ...args: xdr.ScVal[]): Promise<unknown> {
  const dummyKeypair = Keypair.random();
  const account = await server.getAccount(dummyKeypair.publicKey()).catch(() => ({
    accountId: () => dummyKeypair.publicKey(),
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  }));

  const tx = new TransactionBuilder(account as Parameters<typeof TransactionBuilder>[0], {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(Contract.call(contractId, method, ...args))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx) as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (!result.result) throw new Error('Simulation failed');
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
    nativeToScVal(BigInt(id), { type: 'u64' }),
  ) as Record<string, unknown>;
  return raw as unknown as Proposal;
}

export async function fetchAllProposals(): Promise<Proposal[]> {
  const count = await fetchProposalCount();
  const proposals = await Promise.all(
    Array.from({ length: count }, (_, i) => fetchProposal(i))
  );
  return proposals;
}

export async function fetchHasVoted(proposalId: number, voter: string): Promise<boolean> {
  const result = await simulateCall(
    config.governanceContractId,
    'has_voted',
    nativeToScVal(BigInt(proposalId), { type: 'u64' }),
    nativeToScVal(voter, { type: 'address' }),
  );
  return Boolean(result);
}

export async function fetchVoteRecord(proposalId: number, voter: string): Promise<VoteRecord | null> {
  try {
    const result = await simulateCall(
      config.governanceContractId,
      'get_vote',
      nativeToScVal(BigInt(proposalId), { type: 'u64' }),
      nativeToScVal(voter, { type: 'address' }),
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
    nativeToScVal(address, { type: 'address' }),
  );
  return BigInt(result as string | number);
}
