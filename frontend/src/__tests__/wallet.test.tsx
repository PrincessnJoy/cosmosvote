import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalletProvider, useWallet } from '../WalletContext';
import * as api from '../api';

function TestConsumer() {
  const { walletAddress, tokenBalance, connect, disconnect } = useWallet();
  return (
    <div>
      <div data-testid="addr">{walletAddress ?? 'null'}</div>
      <div data-testid="bal">{tokenBalance !== null ? String(tokenBalance) : 'null'}</div>
      <button onClick={connect}>connect</button>
      <button onClick={disconnect}>disconnect</button>
    </div>
  );
}

describe('WalletContext', () => {
  it('connects and fetches token balance', async () => {
    const mockBalance = 5000n;
    vi.spyOn(api, 'fetchTokenBalance').mockResolvedValue(mockBalance as unknown as bigint);
    // mock prompt
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => 'GABC123');

    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>
    );

    // click connect
    await act(async () => {
      screen.getByText('connect').click();
    });

    expect(screen.getByTestId('addr').textContent).toBe('GABC123');

    // wait for effect to fetch balance
    await act(async () => Promise.resolve());

    expect(screen.getByTestId('bal').textContent).toBe(String(mockBalance));

    promptSpy.mockRestore();
  });
});
