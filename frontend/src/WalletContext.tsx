import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchTokenBalance } from './api';

interface WalletContextType {
  walletAddress: string | null;
  tokenBalance: bigint | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setTokenBalance(null);
      return;
    }
    fetchTokenBalance(walletAddress)
      .then(setTokenBalance)
      .catch(() => setTokenBalance(null));
  }, [walletAddress]);

  const connect = () => {
    const addr = prompt('Enter your Stellar address (G...):');
    if (addr?.startsWith('G')) setWalletAddress(addr);
  };

  const disconnect = () => {
    setWalletAddress(null);
  };

  return (
    <WalletContext.Provider value={{ walletAddress, tokenBalance, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
