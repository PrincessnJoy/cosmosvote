import type { Proposal } from '../types';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useRef, useState } from 'react';
import { formatTokenAmount } from '../utils';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  onClose: () => void;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus can be restored when the modal closes.
  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    const initialFocusTarget = focusable[0] ?? dialog;
    initialFocusTarget.focus();

    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  // Trap focus inside the dialog and close on Escape.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!focusable.length) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  const total = p.votes_yes + p.votes_no + p.votes_abstain;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Proposal ${String(p.id)}`}
        aria-labelledby="proposal-dialog-title"
        aria-describedby="proposal-dialog-desc"
        tabIndex={-1}
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 id="proposal-dialog-title" style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close proposal details"
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <h3 style={{ margin: '0 0 0.5rem' }}>{p.title}</h3>
        <p id="proposal-dialog-desc" style={{ color: '#555' }}>{p.description}</p>

        <table
          style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}
          aria-label="Proposal details"
        >
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

        <div
          role="group"
          aria-label="Vote controls"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}
        >
          {[
            { label: 'Yes', emoji: '✅', value: p.votes_yes, color: '#16a34a' },
            { label: 'No', emoji: '❌', value: p.votes_no, color: '#dc2626' },
            { label: 'Abstain', emoji: '⬜', value: p.votes_abstain, color: '#6b7280' },
          ].map(({ label, emoji, value, color }) => (
            <div
              key={label}
              aria-label={`${label}: ${formatTokenAmount(value, decimals)}`}
              style={{ textAlign: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: 8 }}
            >
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{emoji} {label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{formatTokenAmount(value, decimals).replace(' CVT', '')}</div>
            </div>
          ))}
        </div>

        {walletAddress && (
          <div
            role="status"
            aria-live="polite"
            style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: 8, fontSize: '0.875rem' }}
          >
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
