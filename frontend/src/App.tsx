import { useState, useEffect, useMemo } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenBalance } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalDetail } from './components/ProposalDetail';
import { ACTIVE_NETWORK } from './config';
import { t } from './i18n';

const ALL_STATES: ProposalState[] = ['Active', 'Passed', 'Rejected', 'Executed', 'Cancelled'];

export default function App() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ProposalState | 'All'>('All');
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  useEffect(() => {
    fetchAllProposals()
      .then(setProposals)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    fetchTokenBalance(walletAddress).then(setTokenBalance).catch(() => setTokenBalance(null));
  }, [walletAddress]);

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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t.app_title}</h1>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.app_subtitle} · {ACTIVE_NETWORK}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {walletAddress ? (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
              {tokenBalance !== null && (
                <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{String(tokenBalance)} CVT</div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                const addr = prompt(t.connect_wallet_prompt);
                if (addr?.startsWith('G')) setWalletAddress(addr);
              }}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              {t.connect_wallet}
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder={t.search_placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label={t.search_aria_label}
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value as ProposalState | 'All')}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label={t.filter_aria_label}
          >
            <option value="All">{t.filter_all_states}</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: t.stat_total, count: proposals.length, color: '#1e293b' },
            { label: t.stat_active, count: proposals.filter(p => p.state === 'Active').length, color: '#2563eb' },
            { label: t.stat_passed, count: proposals.filter(p => p.state === 'Passed').length, color: '#16a34a' },
            { label: t.stat_executed, count: proposals.filter(p => p.state === 'Executed').length, color: '#7c3aed' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        {loading && <p style={{ textAlign: 'center', color: '#888' }}>{t.loading_proposals}</p>}
        {error && <p style={{ textAlign: 'center', color: '#dc2626' }}>Error: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888' }}>{t.no_proposals}</p>
        )}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(p => (
            <ProposalCard key={String(p.id)} proposal={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      </main>

      {selected && (
        <ProposalDetail
          proposal={selected}
          walletAddress={walletAddress}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
