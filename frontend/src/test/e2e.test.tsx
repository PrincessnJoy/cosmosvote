/**
 * E2E tests for wallet connect and voting flows (#344).
 *
 * These tests use vitest + @testing-library/react with fully mocked
 * external dependencies (Freighter, xBull, Soroban RPC) to simulate
 * the complete user journeys without requiring a live network.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSimulateTransaction = vi.hoisted(() => vi.fn());
const mockIsConnected = vi.hoisted(() => vi.fn());
const mockRequestAccess = vi.hoisted(() => vi.fn());
const mockGetAddress = vi.hoisted(() => vi.fn());

vi.mock('@stellar/freighter-api', () => ({
  isConnected: mockIsConnected,
  requestAccess: mockRequestAccess,
  getAddress: mockGetAddress,
}));

vi.mock('@stellar/stellar-sdk', () => ({
  SorobanRpc: {
    Server: vi.fn().mockImplementation(() => ({ simulateTransaction: mockSimulateTransaction })),
  },
  TransactionBuilder: vi.fn().mockImplementation(() => ({
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({}),
  })),
  Account: vi.fn(),
  Operation: { invokeContractFunction: vi.fn().mockReturnValue({}) },
  xdr: {},
  scValToNative: vi.fn(),
  nativeToScVal: vi.fn().mockReturnValue({}),
}));

vi.mock('../config', () => ({
  config: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    governanceContractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
    tokenContractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC5',
  },
  ACTIVE_NETWORK: 'testnet',
  validateConfig: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import React from 'react';
import { WalletProvider, useWallet } from '../WalletContext';
import { ConnectWalletModal } from '../components/ConnectWalletModal';
import { scValToNative } from '@stellar/stellar-sdk';
import {
  fetchProposalCount,
  fetchProposal,
  fetchHasVoted,
  castVote,
  fetchTokenBalance,
} from '../api';
import type { Proposal } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

const activeProposal: Proposal = {
  id: 0n,
  proposer: TEST_ADDRESS,
  title: 'Fund Community Treasury',
  description: 'Allocate 10,000 VOTE to the community treasury.',
  votes_yes: 1000n,
  votes_no: 200n,
  votes_abstain: 50n,
  quorum: 5000n,
  start_time: 1700000000n,
  end_time: 9999999999n,
  state: 'Active' as const,
};

const passedProposal: Proposal = {
  ...activeProposal,
  id: 1n,
  title: 'Passed Proposal',
  votes_yes: 6000n,
  votes_no: 100n,
  state: 'Passed' as const,
};

const rejectedProposal: Proposal = {
  ...activeProposal,
  id: 2n,
  title: 'Rejected Proposal',
  votes_yes: 100n,
  votes_no: 6000n,
  state: 'Rejected' as const,
};

// ---------------------------------------------------------------------------
// Helper: render with WalletProvider
// ---------------------------------------------------------------------------

function renderWithWallet(ui: React.ReactElement) {
  return render(<WalletProvider>{ui}</WalletProvider>);
}

// ---------------------------------------------------------------------------
// 1. Wallet connect flows
// ---------------------------------------------------------------------------

describe('Wallet connect — Freighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('0');
  });

  it('connects successfully when Freighter is installed', async () => {
    mockIsConnected.mockResolvedValue(true);
    mockRequestAccess.mockResolvedValue(undefined);
    mockGetAddress.mockResolvedValue({ address: TEST_ADDRESS, error: null });

    const TestComponent = () => {
      const { walletAddress, connect } = useWallet();
      return (
        <div>
          <button onClick={() => connect('Freighter')}>Connect</button>
          <span data-testid="addr">{walletAddress ?? 'none'}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('addr').textContent).toBe(TEST_ADDRESS)
    );
  });

  it('shows error when Freighter extension is not installed', async () => {
    mockIsConnected.mockResolvedValue(false);

    const TestComponent = () => {
      const { connect } = useWallet();
      const [err, setErr] = React.useState('');
      return (
        <div>
          <button onClick={() => connect('Freighter').catch(e => setErr(e.message))}>Connect</button>
          <span data-testid="err">{err}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('err').textContent).toMatch(/Freighter extension not found/i)
    );
  });

  it('shows error when getAddress returns an error', async () => {
    mockIsConnected.mockResolvedValue(true);
    mockRequestAccess.mockResolvedValue(undefined);
    mockGetAddress.mockResolvedValue({ address: null, error: { message: 'User denied access' } });

    const TestComponent = () => {
      const { connect } = useWallet();
      const [err, setErr] = React.useState('');
      return (
        <div>
          <button onClick={() => connect('Freighter').catch(e => setErr(e.message))}>Connect</button>
          <span data-testid="err">{err}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('err').textContent).toMatch(/User denied access/i)
    );
  });

  it('disconnect clears wallet address and balance', async () => {
    mockIsConnected.mockResolvedValue(true);
    mockRequestAccess.mockResolvedValue(undefined);
    mockGetAddress.mockResolvedValue({ address: TEST_ADDRESS, error: null });

    const TestComponent = () => {
      const { walletAddress, connect, disconnect } = useWallet();
      return (
        <div>
          <button onClick={() => connect('Freighter')}>Connect</button>
          <button onClick={disconnect}>Disconnect</button>
          <span data-testid="addr">{walletAddress ?? 'none'}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() => expect(screen.getByTestId('addr').textContent).toBe(TEST_ADDRESS));

    await userEvent.click(screen.getByText('Disconnect'));
    expect(screen.getByTestId('addr').textContent).toBe('none');
  });
});

describe('Wallet connect — xBull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('0');
  });

  it('connects successfully when xBull SDK is injected', async () => {
    const xBullSDK = { connect: vi.fn().mockResolvedValue({ publicKey: TEST_ADDRESS }) };
    Object.defineProperty(window, 'xBullSDK', { value: xBullSDK, configurable: true });

    const TestComponent = () => {
      const { walletAddress, connect } = useWallet();
      return (
        <div>
          <button onClick={() => connect('xBull')}>Connect</button>
          <span data-testid="addr">{walletAddress ?? 'none'}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('addr').textContent).toBe(TEST_ADDRESS)
    );

    delete (window as unknown as Record<string, unknown>).xBullSDK;
  });

  it('shows error when xBull SDK is not injected', async () => {
    // Ensure xBullSDK is not present
    delete (window as unknown as Record<string, unknown>).xBullSDK;

    const TestComponent = () => {
      const { connect } = useWallet();
      const [err, setErr] = React.useState('');
      return (
        <div>
          <button onClick={() => connect('xBull').catch(e => setErr(e.message))}>Connect</button>
          <span data-testid="err">{err}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('err').textContent).toMatch(/xBull extension not found/i)
    );
  });
});

// ---------------------------------------------------------------------------
// 2. ConnectWalletModal UI
// ---------------------------------------------------------------------------

describe('ConnectWalletModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('0');
  });

  it('renders Freighter and xBull buttons', () => {
    renderWithWallet(<ConnectWalletModal />);
    expect(screen.getByText(/Freighter/)).toBeInTheDocument();
    expect(screen.getByText(/xBull/)).toBeInTheDocument();
  });

  it('calls closeModal when Cancel is clicked', async () => {
    const WrapperWithModal = () => {
      const { openModal, showModal } = useWallet();
      return (
        <div>
          <button onClick={openModal}>Open</button>
          {showModal && <ConnectWalletModal />}
          <span data-testid="open">{String(showModal)}</span>
        </div>
      );
    };

    renderWithWallet(<WrapperWithModal />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('open').textContent).toBe('true');

    await userEvent.click(screen.getByText('Cancel'));
    await waitFor(() =>
      expect(screen.getByTestId('open').textContent).toBe('false')
    );
  });

  it('closes modal when backdrop is clicked', async () => {
    const WrapperWithModal = () => {
      const { openModal, showModal } = useWallet();
      return (
        <div>
          <button onClick={openModal}>Open</button>
          {showModal && <ConnectWalletModal />}
          <span data-testid="open">{String(showModal)}</span>
        </div>
      );
    };

    renderWithWallet(<WrapperWithModal />);
    await userEvent.click(screen.getByText('Open'));
    // Click the backdrop (the dialog overlay)
    fireEvent.click(screen.getByRole('dialog'));
    await waitFor(() =>
      expect(screen.getByTestId('open').textContent).toBe('false')
    );
  });

  it('shows error when connection fails', async () => {
    mockIsConnected.mockResolvedValue(false);
    renderWithWallet(<ConnectWalletModal />);
    await userEvent.click(screen.getByText(/Freighter/));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/Freighter extension not found/i)
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Proposal creation flow
// ---------------------------------------------------------------------------

describe('Proposal creation flow — fetchProposalCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 0 when no proposals exist', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(0);
    expect(await fetchProposalCount()).toBe(0);
  });

  it('returns correct proposal count', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(3);
    expect(await fetchProposalCount()).toBe(3);
  });

  it('throws on RPC simulation failure', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: null });
    await expect(fetchProposalCount()).rejects.toThrow('Simulation failed');
  });

  it('throws on network error', async () => {
    mockSimulateTransaction.mockRejectedValue(new Error('Network error'));
    await expect(fetchProposalCount()).rejects.toThrow('Network error');
  });
});

describe('Proposal creation flow — fetchProposal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a proposal for a valid id', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(activeProposal);
    const proposal = await fetchProposal(0);
    expect(proposal).toEqual(activeProposal);
  });

  it('propagates error for invalid proposal id', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: null });
    await expect(fetchProposal(999)).rejects.toThrow('Simulation failed');
  });
});

// ---------------------------------------------------------------------------
// 4. Voting flow
// ---------------------------------------------------------------------------

describe('Voting flow — has_voted check', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false when user has not voted', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(false);
    expect(await fetchHasVoted(0, TEST_ADDRESS)).toBe(false);
  });

  it('returns true when user has already voted', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(true);
    expect(await fetchHasVoted(0, TEST_ADDRESS)).toBe(true);
  });
});

describe('Voting flow — castVote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('simulates a Yes vote successfully', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: 'ok' } });
    const result = await castVote(TEST_ADDRESS, 0, 'Yes');
    expect(typeof result).toBe('string');
    expect(mockSimulateTransaction).toHaveBeenCalledTimes(1);
  });

  it('simulates a No vote successfully', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: 'ok' } });
    await expect(castVote(TEST_ADDRESS, 0, 'No')).resolves.not.toThrow();
  });

  it('simulates an Abstain vote successfully', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: 'ok' } });
    await expect(castVote(TEST_ADDRESS, 0, 'Abstain')).resolves.not.toThrow();
  });

  it('throws when simulation fails (e.g. AlreadyVoted)', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: null });
    await expect(castVote(TEST_ADDRESS, 0, 'Yes')).rejects.toThrow(
      'Transaction simulation failed'
    );
  });

  it('throws on network error during vote submission', async () => {
    mockSimulateTransaction.mockRejectedValue(new Error('RPC timeout'));
    await expect(castVote(TEST_ADDRESS, 0, 'Yes')).rejects.toThrow('RPC timeout');
  });
});

// ---------------------------------------------------------------------------
// 5. Full proposal lifecycle flow
// ---------------------------------------------------------------------------

describe('Full proposal lifecycle — active → passed → rejected', () => {
  beforeEach(() => vi.clearAllMocks());

  it('active proposal is fetchable with correct state', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(activeProposal);
    const p = await fetchProposal(0);
    expect(p.state).toBe('Active');
    expect(p.votes_yes).toBe(1000n);
  });

  it('passed proposal has state Passed', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(passedProposal);
    const p = await fetchProposal(1);
    expect(p.state).toBe('Passed');
  });

  it('rejected proposal has state Rejected', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(rejectedProposal);
    const p = await fetchProposal(2);
    expect(p.state).toBe('Rejected');
  });

  it('wallet token balance is fetched after connect', async () => {
    mockIsConnected.mockResolvedValue(true);
    mockRequestAccess.mockResolvedValue(undefined);
    mockGetAddress.mockResolvedValue({ address: TEST_ADDRESS, error: null });
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('5000000');

    const TestComponent = () => {
      const { tokenBalance, connect } = useWallet();
      return (
        <div>
          <button onClick={() => connect('Freighter')}>Connect</button>
          <span data-testid="balance">{tokenBalance !== null ? String(tokenBalance) : 'null'}</span>
        </div>
      );
    };

    renderWithWallet(<TestComponent />);
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByTestId('balance').textContent).not.toBe('null')
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Retry / failure scenarios
// ---------------------------------------------------------------------------

describe('Retry and failure scenarios', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchProposal retries on transient failure via Promise.allSettled', async () => {
    // First call throws, second succeeds
    mockSimulateTransaction
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue(3);
    // fetchProposalCount uses the second (successful) call
    const count = await fetchProposalCount();
    expect(count).toBe(3);
  });

  it('fetchTokenBalance returns 0n for an address with no tokens', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('0');
    expect(await fetchTokenBalance(TEST_ADDRESS)).toBe(0n);
  });

  it('fetchTokenBalance returns correct balance', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    (scValToNative as ReturnType<typeof vi.fn>).mockReturnValue('10000000');
    expect(await fetchTokenBalance(TEST_ADDRESS)).toBe(10000000n);
  });

  it('castVote is called once per vote action', async () => {
    mockSimulateTransaction.mockResolvedValue({ result: { retval: 'ok' } });
    await castVote(TEST_ADDRESS, 0, 'Yes');
    expect(mockSimulateTransaction).toHaveBeenCalledTimes(1);
  });

  it('useWallet throws outside WalletProvider', () => {
    // Suppress React error boundary noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BadComponent = () => { useWallet(); return null; };
    expect(() => render(<BadComponent />)).toThrow(
      'useWallet must be used within a WalletProvider'
    );
    spy.mockRestore();
  });
});
