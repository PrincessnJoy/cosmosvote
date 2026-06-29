import { useState, useEffect, useMemo } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenDecimals } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalSkeleton } from './components/ProposalSkeleton';
import { ProposalDetail } from './components/ProposalDetail';
import { ACTIVE_NETWORK } from './config';
import { formatTokenAmount } from './utils';
import { useWallet } from './WalletContext';

const ALL_STATES: ProposalState[] = ['Active', 'Passed', 'Rejected', 'Executed', 'Cancelled'];

export default function App() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ProposalState | 'All'>('All');
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [decimals, setDecimals] = useState<number>(0);

  const { walletAddress, tokenBalance, isConnecting, walletError, connect, retryConnect } = useWallet();

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#1e293b', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🌌 CosmosVote</h1>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>On-chain governance · {ACTIVE_NETWORK}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {walletAddress ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
              {tokenBalance !== null && (
                <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{formatTokenAmount(tokenBalance, decimals)}</div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={connect}
                disabled={isConnecting}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: isConnecting ? 'not-allowed' : 'pointer', opacity: isConnecting ? 0.7 : 1 }}
              >
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
              {walletError && (
                <div style={{ marginTop: '0.5rem', maxWidth: 260 }}>
                  <div role="alert" style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.25rem' }}>{walletError}</div>
                  <button
                    onClick={retryConnect}
                    disabled={isConnecting}
                    style={{ fontSize: '0.75rem', background: 'transparent', color: '#93c5fd', border: '1px solid #93c5fd', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search proposals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label="Search proposals"
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value as ProposalState | 'All')}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label="Filter by state"
          >
            <option value="All">All States</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: proposals.length, color: '#1e293b' },
            { label: 'Active', count: proposals.filter(p => p.state === 'Active').length, color: '#2563eb' },
            { label: 'Passed', count: proposals.filter(p => p.state === 'Passed').length, color: '#16a34a' },
            { label: 'Executed', count: proposals.filter(p => p.state === 'Executed').length, color: '#7c3aed' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        {error && <p style={{ textAlign: 'center', color: '#dc2626', marginBottom: '1rem' }}>Error: {error}</p>}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading && (
            <>
              <ProposalSkeleton />
              <ProposalSkeleton />
              <ProposalSkeleton />
            </>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#888' }}>No proposals found.</p>
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
