import type { Proposal, ProposalState } from '../types';

const STATE_COLORS: Record<ProposalState, string> = {
  Active: '#2563eb',
  Passed: '#16a34a',
  Rejected: '#dc2626',
  Executed: '#7c3aed',
  Cancelled: '#6b7280',
};

interface Props {
  proposal: Proposal;
  onClick: () => void;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString();
}

function totalVotes(p: Proposal): bigint {
  return p.votes_yes + p.votes_no + p.votes_abstain;
}

function quorumPct(p: Proposal): number {
  if (p.quorum === 0n) return 0;
  return Math.min(100, Number((totalVotes(p) * 100n) / p.quorum));
}

export function ProposalCard({ proposal: p, onClick }: Props) {
  const color = STATE_COLORS[p.state];
  const pct = quorumPct(p);

  return (
    <article
      onClick={onClick}
      style={{
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '1rem',
        cursor: 'pointer',
        background: '#fff',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 12px ${color}44`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>#{String(p.id)} — {p.title}</h3>
        <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {p.state}
        </span>
      </div>

      <p style={{ margin: '0.5rem 0', color: '#555', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.description}
      </p>

      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
        Ends {formatDate(p.end_time)} · Quorum {String(p.quorum).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      </div>

      {/* Quorum progress bar */}
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>
        {pct}% of quorum · ✅ {String(p.votes_yes)} · ❌ {String(p.votes_no)} · ⬜ {String(p.votes_abstain)}
      </div>
    </article>
  );
}
