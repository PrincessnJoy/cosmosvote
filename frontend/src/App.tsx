import { useState, useEffect, useMemo } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenDecimals } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalSkeleton } from './components/ProposalSkeleton';
import { ProposalDetail } from './components/ProposalDetail';
import { ACTIVE_NETWORK } from './config';
import { formatTokenAmount } from './utils';
import { WalletProvider, useWallet } from './WalletContext';
import styles from './App.module.css';
import './styles/tokens.css';

const ALL_STATES: ProposalState[] = ['Active', 'Passed', 'Rejected', 'Executed', 'Cancelled'];
const STAT_COLORS: Record<string, string> = {
  Total: 'var(--color-text-primary)',
  Active: 'var(--color-state-active)',
  Passed: 'var(--color-state-passed)',
  Executed: 'var(--color-state-executed)',
};

function AppInner() {
  const { walletAddress, tokenBalance, connect, disconnect } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ProposalState | 'All'>('All');
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [decimals, setDecimals] = useState<number>(0);

  useEffect(() => {
    Promise.all([fetchAllProposals(), fetchTokenDecimals()])
      .then(([props, decs]) => {
        setProposals(props);
        setDecimals(decs);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      const matchState = stateFilter === 'All' || p.state === stateFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchState && matchSearch;
    });
  }, [proposals, search, stateFilter]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>🌌 CosmosVote</h1>
          <span className={styles.headerSubtitle}>On-chain governance · {ACTIVE_NETWORK}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {walletAddress ? (
            <div>
              <div className={styles.headerWalletAddress}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
              {tokenBalance !== null && (
                <div className={styles.headerBalance}>{formatTokenAmount(tokenBalance, decimals)}</div>
              )}
              <button className={styles.connectBtn} onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className={styles.connectBtn} onClick={connect}>Connect Wallet</button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Search proposals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search proposals"
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value as ProposalState | 'All')}
            className={styles.stateSelect}
            aria-label="Filter by state"
          >
            <option value="All">All States</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.statsBar}>
          {[
            { label: 'Total', count: proposals.length },
            { label: 'Active', count: proposals.filter(p => p.state === 'Active').length },
            { label: 'Passed', count: proposals.filter(p => p.state === 'Passed').length },
            { label: 'Executed', count: proposals.filter(p => p.state === 'Executed').length },
          ].map(({ label, count }) => (
            <div key={label} className={styles.statCard}>
              <div className={styles.statCount} style={{ color: STAT_COLORS[label] }}>{count}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {error && <p className={styles.errorMsg}>Error: {error}</p>}

        <div className={styles.grid}>
          {loading && (
            <>
              <ProposalSkeleton />
              <ProposalSkeleton />
              <ProposalSkeleton />
            </>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className={styles.emptyMsg}>No proposals found.</p>
          )}
          {!loading && filtered.map(p => (
            <ProposalCard key={String(p.id)} proposal={p} decimals={decimals} onClick={() => setSelected(p)} />
          ))}
        </div>
      </main>

      {selected && (
        <ProposalDetail
          proposal={selected}
          decimals={decimals}
          walletAddress={walletAddress}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  );
}
