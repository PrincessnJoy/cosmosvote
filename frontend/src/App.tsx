import { useState, useEffect, useMemo } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenBalance, fetchTokenDecimals } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalSkeleton } from './components/ProposalSkeleton';
import { ProposalDetail } from './components/ProposalDetail';
import { useI18n } from './I18nContext';
import { locales, type Locale } from './i18n';
import { ACTIVE_NETWORK } from './config';
import { formatTokenAmount } from './utils';

const ALL_STATES: ProposalState[] = ['Active', 'Passed', 'Rejected', 'Executed', 'Cancelled'];

export default function App() {
  const { locale, setLocale, t } = useI18n();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<ProposalState | 'All'>('All');
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(0);

  function connect() {
    const addr = prompt(t('connectWallet') + ':');
    if (addr?.startsWith('G')) setWalletAddress(addr);
  }

  useEffect(() => {
    if (!walletAddress) { setTokenBalance(null); return; }
    fetchTokenBalance(walletAddress).then(setTokenBalance).catch(() => setTokenBalance(null));
  }, [walletAddress]);

  useEffect(() => {
    Promise.all([fetchAllProposals(), fetchTokenDecimals()])
      .then(([props, decs]) => { setProposals(props); setDecimals(decs); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => proposals.filter(p => {
    const matchState = stateFilter === 'All' || p.state === stateFilter;
    const q = search.toLowerCase();
    return matchState && (!q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }), [proposals, search, stateFilter]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#1e293b', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t('appTitle')}</h1>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('appSubtitle')} · {ACTIVE_NETWORK}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Language selector */}
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            aria-label="Select language"
            style={{ background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {(Object.entries(locales) as [Locale, string][]).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          {walletAddress ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
              {tokenBalance !== null && (
                <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{formatTokenAmount(tokenBalance, decimals)}</div>
              )}
              <button onClick={() => setWalletAddress(null)} style={{ marginTop: 4, background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                {t('disconnect')}
              </button>
            </div>
          ) : (
            <button onClick={connect} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}>
              {t('connectWallet')}
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label={t('searchPlaceholder')}
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value as ProposalState | 'All')}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
            aria-label={t('filterByState')}
          >
            <option value="All">{t('allStates')}</option>
            {ALL_STATES.map(s => <option key={s} value={s}>{t(s.toLowerCase() as Parameters<typeof t>[0])}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {([
            { labelKey: 'total', count: proposals.length, color: '#1e293b' },
            { labelKey: 'active', count: proposals.filter(p => p.state === 'Active').length, color: '#2563eb' },
            { labelKey: 'passed', count: proposals.filter(p => p.state === 'Passed').length, color: '#16a34a' },
            { labelKey: 'executed', count: proposals.filter(p => p.state === 'Executed').length, color: '#7c3aed' },
          ] as const).map(({ labelKey, count, color }) => (
            <div key={labelKey} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{t(labelKey)}</div>
            </div>
          ))}
        </div>

        {error && <p style={{ textAlign: 'center', color: '#dc2626', marginBottom: '1rem' }}>Error: {error}</p>}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {loading && <><ProposalSkeleton /><ProposalSkeleton /><ProposalSkeleton /></>}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#888' }}>{t('noProposals')}</p>
          )}
          {!loading && filtered.map(p => (
            <ProposalCard key={String(p.id)} proposal={p} decimals={decimals} onClick={() => setSelected(p)} />
          ))}
        </div>
      </main>

      {selected && (
        <ProposalDetail proposal={selected} decimals={decimals} walletAddress={walletAddress} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
