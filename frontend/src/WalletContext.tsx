/**
 * WalletContext — backward-compatible shim.
 *
 * State is now managed by the Zustand walletStore. This file re-exports
 * the hook and a no-op provider so that existing component imports continue
 * to work without modification.
 *
 * Issue #379: centralized state management migration with Zustand.
 */
import React from 'react';
import { useWalletStore } from './store/walletStore';

// Re-export the hook under the original name for component compatibility
export function useWallet() {
  return useWalletStore();
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
  return <>{children}</>;
}
