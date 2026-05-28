import type { Proposal, ProposalState } from '../types';
import { formatTokenAmount } from '../utils';
import styles from './ProposalCard.module.css';

const STATE_COLORS: Record<ProposalState, string> = {
  Active: 'var(--color-state-active)',
  Passed: 'var(--color-state-passed)',
  Rejected: 'var(--color-state-rejected)',
  Executed: 'var(--color-state-executed)',
  Cancelled: 'var(--color-state-cancelled)',
};

interface Props {
  proposal: Proposal;
  decimals: number;
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

export function ProposalCard({ proposal: p, decimals, onClick }: Props) {
  const color = STATE_COLORS[p.state];
  const pct = quorumPct(p);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Proposal #${p.id}: ${p.title}`}
      className={styles.card}
      style={{ borderColor: color }}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>#{String(p.id)} — {p.title}</h3>
        <span className={styles.stateBadge} style={{ background: color }}>
          {p.state}
        </span>
      </div>

      <p className={styles.description}>{p.description}</p>

      <div className={styles.meta}>
        Ends {formatDate(p.end_time)} · Quorum {formatTokenAmount(p.quorum, decimals)}
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressBar} style={{ background: color, width: `${pct}%` }} />
      </div>
      <div className={styles.voteCounts}>
        {pct}% of quorum · ✅ {formatTokenAmount(p.votes_yes, decimals)} · ❌ {formatTokenAmount(p.votes_no, decimals)} · ⬜ {formatTokenAmount(p.votes_abstain, decimals)}
      </div>
    </article>
  );
}
