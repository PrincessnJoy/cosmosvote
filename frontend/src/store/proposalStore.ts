import { create } from 'zustand';
import type { Proposal, VoteRecord } from '../types';
import { fetchAllProposals, fetchTokenDecimals, fetchHasVoted, fetchVoteRecord } from '../api';

interface ProposalState {
  proposals: Proposal[];
  decimals: number;
  loading: boolean;
  error: string | null;
  progress: { loaded: number; total: number } | null;
  /** Map from proposal id (as string) to the connected user's vote record */
  votedMap: Map<string, VoteRecord>;

  // Actions
  loadProposals: () => Promise<void>;
  loadVotesForUser: (walletAddress: string) => Promise<void>;
  clearVotes: () => void;
}

export const useProposalStore = create<ProposalState>((set, get) => ({
  proposals: [],
  decimals: 0,
  loading: false,
  error: null,
  progress: null,
  votedMap: new Map(),

  loadProposals: async () => {
    set({ loading: true, error: null, progress: null });
    try {
      const [proposals, decimals] = await Promise.all([
        fetchAllProposals((loaded, total) => set({ progress: { loaded, total } })),
        fetchTokenDecimals(),
      ]);
      set({ proposals, decimals, loading: false, progress: null });
    } catch (err) {
      set({ error: String(err), loading: false, progress: null });
    }
  },

  loadVotesForUser: async (walletAddress) => {
    const { proposals } = get();
    const entries = await Promise.all(
      proposals.map(async (p) => {
        const voted = await fetchHasVoted(Number(p.id), walletAddress).catch(() => false);
        if (!voted) return null;
        const record = await fetchVoteRecord(Number(p.id), walletAddress).catch(() => null);
        return record ? [String(p.id), record] as [string, VoteRecord] : null;
      })
    );
    const votedMap = new Map<string, VoteRecord>(
      entries.filter((e): e is [string, VoteRecord] => e !== null)
    );
    set({ votedMap });
  },

  clearVotes: () => set({ votedMap: new Map() }),
}));
