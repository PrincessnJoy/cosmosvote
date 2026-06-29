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

// Provider is now a passthrough — Zustand needs no React context wrapper.
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
