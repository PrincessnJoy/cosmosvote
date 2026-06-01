import type { Proposal } from '../types';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useRef, useState } from 'react';
import { formatTokenAmount } from '../utils';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose, triggerRef }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  // Focus the close button on open
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Return focus to trigger on unmount
  useEffect(() => {
    return () => {
      triggerRef?.current?.focus();
    };
  }, [triggerRef]);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusable));
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const total = p.votes_yes + p.votes_no + p.votes_abstain;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-dialog-title"
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 id="proposal-dialog-title" style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
          >×</button>
        </div>

        <h3 style={{ margin: '0 0 0.5rem' }}>{p.title}</h3>
        <p style={{ color: '#555' }}>{p.description}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <tbody>
            {[
              ['State', p.state],
              ['Proposer', `${p.proposer.slice(0, 8)}...${p.proposer.slice(-4)}`],
              ['Start', formatDate(p.start_time)],
              ['End', formatDate(p.end_time)],
              ['Quorum', formatTokenAmount(p.quorum, decimals)],
              ['Total Votes', formatTokenAmount(total, decimals)],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.4rem 0', color: '#888', width: '40%' }}>{k}</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { label: '✅ Yes', value: p.votes_yes, color: '#16a34a' },
            { label: '❌ No', value: p.votes_no, color: '#dc2626' },
            { label: '⬜ Abstain', value: p.votes_abstain, color: '#6b7280' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{formatTokenAmount(value, decimals).replace(' CVT', '')}</div>
            </div>
          ))}
        </div>

        {walletAddress && (
          <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: 8, fontSize: '0.875rem' }}>
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
