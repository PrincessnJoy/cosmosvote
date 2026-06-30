import { useState, useEffect, useMemo } from 'react';
import type { Proposal, ProposalState } from './types';
import { fetchAllProposals, fetchTokenBalance } from './api';
import { ProposalCard } from './components/ProposalCard';
import { ProposalDetail } from './components/ProposalDetail';
import { UserDashboard } from './components/UserDashboard';
import { VoteHistory } from './components/VoteHistory';
import { TreasuryPanel } from './components/TreasuryPanel';
import { CreateProposalForm } from './components/CreateProposalForm';
import { ACTIVE_NETWORK } from './config';

type ActiveTab = 'proposals' | 'dashboard' | 'treasury';

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
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('proposals');

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

  function handleConnect() {
    const addr = prompt('Enter your Stellar address (G...):');
    if (addr?.startsWith('G')) setWalletAddress(addr);
  }

  function handleDisconnect() {
    setWalletAddress(null);
    setTokenBalance(null);
    setActiveTab('proposals');
  }

  function handleProposalCreated(_proposalId: number) {
    setShowCreateProposal(false);
    // Refresh proposals list
    fetchAllProposals().then(setProposals).catch(() => {});
  }

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      const matchState = stateFilter === 'All' || p.state === stateFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchState && matchSearch;
    });
  }, [proposals, search, stateFilter]);

  const navTabs: { id: ActiveTab; label: string; icon: string; requiresWallet?: boolean }[] = [
    { id: 'proposals', label: 'Proposals', icon: '📋' },
    { id: 'dashboard', label: 'My Dashboard', icon: '📊', requiresWallet: true },
    { id: 'treasury', label: 'Treasury', icon: '💰' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: '#1e293b', color: '#fff',
        padding: '1rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🌌 CosmosVote</h1>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>On-chain governance · {ACTIVE_NETWORK}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {walletAddress ? (
            <>
              {/* Vote History button */}
              <button
                onClick={() => setShowVoteHistory(true)}
                style={{
                  background: '#334155', color: '#e2e8f0',
                  border: '1px solid #475569', borderRadius: 6,
                  padding: '0.4rem 0.85rem', cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
                aria-label="View vote history"
              >
                🗳️ Vote History
              </button>

              {/* New Proposal button */}
              <button
                onClick={() => setShowCreateProposal(true)}
                style={{
                  background: '#3b82f6', color: '#fff',
                  border: 'none', borderRadius: 6,
                  padding: '0.4rem 0.85rem', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 600,
                }}
                aria-label="Create new proposal"
              >
                + New Proposal
              </button>

              {/* Wallet info */}
              <div style={{ textAlign: 'right', borderLeft: '1px solid #334155', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                {tokenBalance !== null && (
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                    {Number(tokenBalance).toLocaleString()} CVT
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={handleConnect}
              style={{
                background: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: 6,
                padding: '0.5rem 1rem', cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Navigation tabs */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 0 }}>
          {navTabs.map(tab => {
            const isDisabled = tab.requiresWallet && !walletAddress;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  color: isDisabled ? '#d1d5db' : isActive ? '#2563eb' : '#64748b',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}
                title={isDisabled ? 'Connect wallet to access' : undefined}
              >
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* ── Dashboard tab ── */}
        {activeTab === 'dashboard' && walletAddress && (
          <UserDashboard
            walletAddress={walletAddress}
            tokenBalance={tokenBalance}
            proposals={proposals}
            onDisconnect={handleDisconnect}
            onConnect={handleConnect}
            onCreateProposal={() => setShowCreateProposal(true)}
          />
        )}

        {/* ── Treasury tab ── */}
        {activeTab === 'treasury' && (
          <TreasuryPanel
            proposals={proposals}
            walletAddress={walletAddress}
            onExecute={proposalId => {
              console.info('[Treasury] Execute proposal', String(proposalId));
            }}
          />
        )}

        {/* ── Proposals tab ── */}
        {activeTab === 'proposals' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="search"
                placeholder="Search proposals..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 200,
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem',
                }}
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
                <div key={label} style={{
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Proposal list */}
            {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading proposals...</p>}
            {error && <p style={{ textAlign: 'center', color: '#dc2626' }}>Error: {error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888' }}>No proposals found.</p>
            )}
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filtered.map(p => (
                <ProposalCard key={String(p.id)} proposal={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Modals ── */}

      {selected && (
        <ProposalDetail
          proposal={selected}
          walletAddress={walletAddress}
          onClose={() => setSelected(null)}
        />
      )}

      {showVoteHistory && walletAddress && (
        <VoteHistory
          walletAddress={walletAddress}
          proposals={proposals}
          onClose={() => setShowVoteHistory(false)}
        />
      )}

      {showCreateProposal && walletAddress && (
        <CreateProposalForm
          walletAddress={walletAddress}
          onSuccess={handleProposalCreated}
          onCancel={() => setShowCreateProposal(false)}
        />
      )}
    </div>
  );
}
