import type { Proposal } from '../types';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useState } from 'react';
import { formatTokenAmount } from '../utils';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  adminAddress?: string | null;
  onClose: () => void;
  onRefresh?: () => void;
  onAnnounce?: (msg: string) => void;
  onError?: (msg: string) => void;
}

type PendingAction = 'finalize' | 'execute' | 'cancel' | null;

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

function isExpired(p: Proposal): boolean {
  return Date.now() / 1000 > Number(p.end_time);
}

const ACTION_CONFIG = {
  finalize: {
    label: 'Finalize',
    color: '#2563eb',
    confirmTitle: 'Finalize Proposal',
    confirmMsg: 'This will finalize the proposal and determine its outcome. This action cannot be undone.',
    confirmLabel: 'Finalize',
    confirmColor: '#2563eb',
  },
  execute: {
    label: 'Execute',
    color: '#16a34a',
    confirmTitle: 'Execute Proposal',
    confirmMsg: 'This will execute the passed proposal on-chain. This action cannot be undone.',
    confirmLabel: 'Execute',
    confirmColor: '#16a34a',
  },
  cancel: {
    label: 'Cancel Proposal',
    color: '#dc2626',
    confirmTitle: 'Cancel Proposal',
    confirmMsg: 'This will permanently cancel the proposal. This action cannot be undone.',
    confirmLabel: 'Cancel Proposal',
    confirmColor: '#dc2626',
  },
};

export function ProposalDetail({ proposal: p, decimals, walletAddress, adminAddress, onClose, onRefresh, onAnnounce, onError }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [acting, setActing] = useState(false);

  const isAdmin = !!(walletAddress && adminAddress && walletAddress === adminAddress);
  const expired = isExpired(p);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  const handleAction = async (action: PendingAction) => {
    if (!action) return;
    setPendingAction(null);
    setActing(true);
    onAnnounce?.(`Submitting ${action} transaction…`);
    try {
      // Placeholder: replace with real signed transactions when wallet integration is complete
      await new Promise(r => setTimeout(r, 800));
      onAnnounce?.(`Proposal ${action}d successfully.`);
      onRefresh?.();
      onClose();
    } catch (err) {
      onError?.(String(err));
    } finally {
      setActing(false);
    }
  };

  const total = p.votes_yes + p.votes_no + p.votes_abstain;

  const showFinalize = walletAddress && p.state === 'Active' && expired;
  const showExecute = isAdmin && p.state === 'Passed';
  const showCancel = isAdmin && (p.state === 'Active' || p.state === 'Passed');

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}
        onClick={onClose}
      >
        <div
          style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 id="detail-title" style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} aria-label="Close">×</button>
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
            <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem' }}>
              {hasVoted === null ? 'Checking vote status...' :
                hasVoted && voteRecord
                  ? `You voted ${voteRecord.vote} with weight ${formatTokenAmount(voteRecord.weight, decimals)}`
                  : 'You have not voted on this proposal'}
            </div>
          )}

          {/* Action buttons */}
          {(showFinalize || showExecute || showCancel) && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              {showFinalize && (
                <button
                  onClick={() => setPendingAction('finalize')}
                  disabled={acting}
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer' }}
                >
                  Finalize
                </button>
              )}
              {showExecute && (
                <button
                  onClick={() => setPendingAction('execute')}
                  disabled={acting}
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 6, background: '#16a34a', color: '#fff', cursor: 'pointer' }}
                >
                  Execute
                </button>
              )}
              {showCancel && (
                <button
                  onClick={() => setPendingAction('cancel')}
                  disabled={acting}
                  style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff', cursor: 'pointer' }}
                >
                  Cancel Proposal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingAction && (
        <ConfirmModal
          title={ACTION_CONFIG[pendingAction].confirmTitle}
          message={ACTION_CONFIG[pendingAction].confirmMsg}
          confirmLabel={ACTION_CONFIG[pendingAction].confirmLabel}
          confirmColor={ACTION_CONFIG[pendingAction].confirmColor}
          onConfirm={() => handleAction(pendingAction)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </>
  );
}
