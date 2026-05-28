import type { Proposal } from '../types';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useState } from 'react';
import { formatTokenAmount } from '../utils';
import styles from './ProposalDetail.module.css';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  onClose: () => void;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  const total = p.votes_yes + p.votes_no + p.votes_abstain;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className={styles.dialogHeader}>
          <h2 id="detail-title" className={styles.dialogTitle}>Proposal #{String(p.id)}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">×</button>
        </div>

        <h3 className={styles.proposalTitle}>{p.title}</h3>
        <p className={styles.description}>{p.description}</p>

        <table className={styles.table}>
          <tbody>
            {[
              ['State', p.state],
              ['Proposer', `${p.proposer.slice(0, 8)}...${p.proposer.slice(-4)}`],
              ['Start', formatDate(p.start_time)],
              ['End', formatDate(p.end_time)],
              ['Quorum', formatTokenAmount(p.quorum, decimals)],
              ['Total Votes', formatTokenAmount(total, decimals)],
            ].map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.voteGrid}>
          {[
            { label: '✅ Yes', value: p.votes_yes, color: 'var(--color-green)' },
            { label: '❌ No', value: p.votes_no, color: 'var(--color-red)' },
            { label: '⬜ Abstain', value: p.votes_abstain, color: 'var(--color-gray)' },
          ].map(({ label, value, color }) => (
            <div key={label} className={styles.voteBox}>
              <div className={styles.voteLabel}>{label}</div>
              <div className={styles.voteCount} style={{ color }}>{formatTokenAmount(value, decimals).replace(' CVT', '')}</div>
            </div>
          ))}
        </div>

        {walletAddress && (
          <div className={styles.voteStatus}>
            {hasVoted === null ? 'Checking vote status...' :
              hasVoted && voteRecord
                ? `You voted ${voteRecord.vote} with weight ${formatTokenAmount(voteRecord.weight, decimals)}`
                : 'You have not voted on this proposal'}
          </div>
        )}
      </div>
    </div>
  );
}
