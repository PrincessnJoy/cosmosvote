import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchTokenBalance } from './api';

type WalletStatus = 'disconnected' | 'connected' | 'error';

interface WalletContextType {
  walletAddress: string | null;
  tokenBalance: bigint | null;
  status: WalletStatus;
  pendingTx: boolean;
  connect: () => void;
  disconnect: () => void;
  setPendingTx: (v: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [pendingTx, setPendingTx] = useState(false);

  // Refresh balance and detect disconnection
  const refreshBalance = useCallback(async (address: string) => {
    try {
      const bal = await fetchTokenBalance(address);
      setTokenBalance(bal);
      setStatus('connected');
    } catch {
      // Balance fetch failure = treat as disconnection
      handleDisconnect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDisconnect() {
    // Cancel any pending transaction gracefully
    setPendingTx(false);
    setWalletAddress(null);
    setTokenBalance(null);
    setStatus('error');
  }

  useEffect(() => {
    if (!walletAddress) {
      setTokenBalance(null);
      return;
    }
    refreshBalance(walletAddress);
    // Poll to detect disconnection every 30s while connected
    const interval = setInterval(() => refreshBalance(walletAddress), 30_000);
    return () => clearInterval(interval);
  }, [walletAddress, refreshBalance]);

  const connect = () => {
    const addr = prompt('Enter your Stellar address (G...):');
    if (addr?.startsWith('G')) {
      setWalletAddress(addr);
      setStatus('connected');
    }
  };

  const disconnect = () => {
    setPendingTx(false);
    setWalletAddress(null);
    setTokenBalance(null);
    setStatus('disconnected');
  };

  return (
    <WalletContext.Provider value={{ walletAddress, tokenBalance, status, pendingTx, connect, disconnect, setPendingTx }}>
      {children}
      {status === 'error' && (
        <div
          role="alert"
          style={{
            position: 'fixed', bottom: 24, right: 24, background: '#fee2e2',
            border: '1px solid #f87171', borderRadius: 8, padding: '1rem 1.25rem',
            maxWidth: 320, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <strong style={{ color: '#b91c1c', display: 'block', marginBottom: 6 }}>
            ⚠️ Wallet Disconnected
          </strong>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#7f1d1d' }}>
            Your wallet was disconnected. Any pending transaction has been cancelled.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={connect}
              style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Reconnect
            </button>
            <button
              onClick={() => setStatus('disconnected')}
              style={{ background: 'none', border: '1px solid #f87171', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: '#b91c1c' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWallet must be used within a WalletProvider');
  return context;
}
