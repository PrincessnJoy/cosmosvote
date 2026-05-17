# JavaScript / TypeScript Integration Examples

## Setup

```bash
npm install @stellar/stellar-sdk
```

## Connect to Contracts

```typescript
import { Contract, SorobanRpc, TransactionBuilder, Networks, Keypair } from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!);

const governanceId = process.env.GOVERNANCE_CONTRACT_ID!;
const tokenId = process.env.TOKEN_CONTRACT_ID!;
```

## Create a Proposal

```typescript
async function createProposal(
  proposer: string,
  title: string,
  description: string,
  quorum: bigint,
  durationSeconds: bigint
): Promise<bigint> {
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Contract.call(
        governanceId,
        'create_proposal',
        // XDR-encoded args via stellar-sdk helpers
        nativeToScVal(proposer, { type: 'address' }),
        nativeToScVal(title, { type: 'string' }),
        nativeToScVal(description, { type: 'string' }),
        nativeToScVal(quorum, { type: 'i128' }),
        nativeToScVal(durationSeconds, { type: 'u64' }),
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  const result = await server.sendTransaction(prepared);
  // parse result.returnValue for proposal ID
  return scValToNative(result.returnValue) as bigint;
}
```

## Cast a Vote

```typescript
type VoteType = 'Yes' | 'No' | 'Abstain';

async function castVote(voter: string, proposalId: bigint, vote: VoteType) {
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Contract.call(
        governanceId,
        'cast_vote',
        nativeToScVal(voter, { type: 'address' }),
        nativeToScVal(proposalId, { type: 'u64' }),
        xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(vote)]),
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  return server.sendTransaction(prepared);
}
```

## Read Proposal State

```typescript
async function getProposal(proposalId: bigint) {
  const result = await server.simulateTransaction(
    buildSimulateTx(governanceId, 'get_proposal',
      nativeToScVal(proposalId, { type: 'u64' })
    )
  );
  return scValToNative((result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval);
}
```

## Finalize a Proposal

```typescript
async function finalise(proposalId: bigint) {
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Contract.call(governanceId, 'finalise', nativeToScVal(proposalId, { type: 'u64' })))
    .setTimeout(30)
    .build();
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  return server.sendTransaction(prepared);
}
```
