import { useEffect, useState } from 'react';
import type { Proposal, VoteRecord, VoteType } from '../types';
import { fetchVoteRecord, fetchHasVoted } from '../api';

interface VotedEntry {
  proposal: Proposal;
  record: VoteRecord;
}

interface Props {
  walletAddress: string;
  tokenBalance: bigint | null;
  proposals: Proposal[];
  onDisconnect: () => void;
  onConnect: () => void;
  onCreateProposal: () => void;
}

const VOTE_COLORS: Record<VoteType, string> = {
  Yes: '#16a34a',
  No: '#dc2626',
  Abstain: '#6b7280',
};

const VOTE_ICONS: Record<VoteType, string> = {
  Yes: '✅',
  No: '❌',
  Abstain: '⬜',
};

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UserDashboard({
  walletAddress,
  tokenBalance,
  proposals,
  onDisconnect,
  onConnect,
  onCreateProposal,
}: Props) {
  const [votedEntries, setVotedEntries] = useState<VotedEntry[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeProposals = proposals.filter(p => p.state === 'Active');

  // Load all proposals the user has voted on
  useEffect(() => {
    if (proposals.length === 0) {
      setLoadingVotes(false);
      return;
    }

    let cancelled = false;
    setLoadingVotes(true);

    Promise.all(
      proposals.map(async (p) => {
        try {
          const hasVoted = await fetchHasVoted(Number(p.id), walletAddress);
          if (!hasVoted) return null;
          const record = await fetchVoteRecord(Number(p.id), walletAddress);
          if (!record) return null;
          return { proposal: p, record } as VotedEntry;
        } catch {
          return null;
        }
      })
    ).then(results => {
      if (cancelled) return;
      setVotedEntries(results.filter((r): r is VotedEntry => r !== null));
      setLoadingVotes(false);
    });

    return () => { cancelled = true; };
  }, [proposals, walletAddress]);

  function handleCopyAddress() {
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const formattedBalance = tokenBalance !== null
    ? Number(tokenBalance).toLocaleString()
    : '—';

  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '2rem' }}>

      {/* Wallet Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#1e293b' }}>My Wallet</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.875rem', color: '#334155', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                {truncateAddress(walletAddress)}
              </code>
              <button
                onClick={handleCopyAddress}
                title="Copy full address"
                aria-label="Copy wallet address"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b', padding: '2px 4px' }}
              >
                {copied ? '✓ Copied' : '📋'}
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={onCreateProposal}
              aria-label="Create new proposal"
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.45rem 0.9rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              + New Proposal
            </button>
            <button
              onClick={onDisconnect}
              aria-label="Disconnect wallet"
              style={{
                background: 'none',
                color: '#64748b',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '0.45rem 0.9rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
            <button
              onClick={onConnect}
              aria-label="Reconnect wallet"
              style={{
                background: 'none',
                color: '#2563eb',
                border: '1px solid #2563eb',
                borderRadius: 6,
                padding: '0.45rem 0.9rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      </div>

      {/* Voting Power Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Voting Power
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
          {formattedBalance}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.25rem' }}>CVT tokens</div>
        {tokenBalance === null && (
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
            ⚠ Unable to load balance
          </div>
        )}
      </div>

      {/* Active Proposals Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Proposals
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb', lineHeight: 1.2 }}>
          {activeProposals.length}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
          {activeProposals.length === 1 ? '1 proposal needs your vote' : `${activeProposals.length} proposals need your vote`}
        </div>
      </div>

      {/* Votes Cast Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Votes Cast
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed', lineHeight: 1.2 }}>
          {loadingVotes ? '…' : votedEntries.length}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
          across all proposals
        </div>
      </div>

      {/* Voting History */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', gridColumn: '1 / -1' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#1e293b' }}>My Voting History</h3>

        {loadingVotes ? (
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>Loading votes…</p>
        ) : votedEntries.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
            You have not voted on any proposals yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {votedEntries.map(({ proposal, record }) => {
              const voteType = record.vote as VoteType;
              const color = VOTE_COLORS[voteType] ?? '#6b7280';
              const icon = VOTE_ICONS[voteType] ?? '⬜';
              return (
                <div
                  key={String(proposal.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    background: '#f8fafc',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.4rem' }}>
                      #{String(proposal.id)}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {proposal.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{
                      background: color,
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {icon} {voteType}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {Number(record.weight).toLocaleString()} CVT
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      color: '#fff',
                      background: proposal.state === 'Active' ? '#2563eb' : '#6b7280',
                      borderRadius: 4,
                      padding: '1px 6px',
                    }}>
                      {proposal.state}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
