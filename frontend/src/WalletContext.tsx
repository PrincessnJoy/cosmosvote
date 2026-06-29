import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchTokenBalance } from './api';

interface WalletContextType {
  walletAddress: string | null;
  tokenBalance: bigint | null;
  isConnecting: boolean;
  walletError: string | null;
  connect: () => Promise<void>;
  retryConnect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function detectFreighterError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (typeof window !== 'undefined' && !('freighter' in window)) {
    return 'Freighter wallet extension not found. Please install it and refresh.';
  }
  if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied')) {
    return 'Connection rejected. Click "Retry" to try again.';
  }
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout')) {
    return 'Network error connecting to wallet. Check your connection and retry.';
  }
  return `Wallet connection failed: ${msg}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) { setTokenBalance(null); return; }
    fetchTokenBalance(walletAddress)
      .then(setTokenBalance)
      .catch(() => setTokenBalance(null));
  }, [walletAddress]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      // Freighter API: window.freighter.getPublicKey()
      // Fallback to prompt for non-Freighter environments
      let addr: string | null = null;
      if (typeof window !== 'undefined' && 'freighter' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addr = await (window as any).freighter.getPublicKey();
      } else {
        addr = prompt('Enter your Stellar address (G...):');
      }
      if (!addr?.startsWith('G')) throw new Error('Invalid or missing Stellar address.');
      setWalletAddress(addr);
    } catch (err) {
      setWalletError(detectFreighterError(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const retryConnect = useCallback(async () => {
    setWalletError(null);
    await connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletError(null);
  }, []);

  return (
    <WalletContext.Provider value={{ walletAddress, tokenBalance, isConnecting, walletError, connect, retryConnect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWallet must be used within a WalletProvider');
  return context;
}
