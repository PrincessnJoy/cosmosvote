import type { NetworkConfig } from './types';

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    governanceContractId: import.meta.env.VITE_GOVERNANCE_CONTRACT_ID ?? '',
    tokenContractId: import.meta.env.VITE_TOKEN_CONTRACT_ID ?? '',
  },
  mainnet: {
    rpcUrl: 'https://soroban-mainnet.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    governanceContractId: import.meta.env.VITE_GOVERNANCE_CONTRACT_ID ?? '',
    tokenContractId: import.meta.env.VITE_TOKEN_CONTRACT_ID ?? '',
  },
};

export const ACTIVE_NETWORK = (import.meta.env.VITE_NETWORK as string) ?? 'testnet';
export const config = NETWORKS[ACTIVE_NETWORK] ?? NETWORKS.testnet;
