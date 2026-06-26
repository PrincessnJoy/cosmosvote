import type { Proposal } from '../types';
import type { ToastType } from './Toast';
import { fetchHasVoted, fetchVoteRecord } from '../api';
import { useEffect, useState } from 'react';
import { formatTokenAmount } from '../utils';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  onClose: () => void;
  onToast?: (type: ToastType, message: string) => number;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose, onToast }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  const total = p.votes_yes + p.votes_no + p.votes_abstain;

  // Simulated vote submission — real implementation would call castVote via SDK
  async function handleVote(voteType: string) {
    if (!walletAddress || !onToast) return;
    const pendingId = onToast('pending', `Submitting ${voteType} vote — confirm in wallet…`);
    try {
      // Placeholder: actual SDK call would go here
      await new Promise(res => setTimeout(res, 1000));
      onToast('success', `Vote "${voteType}" submitted on proposal #${String(p.id)}.`);
    } catch (e) {
      onToast('error', `Vote failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      // dismiss pending (the success/error toast replaced it)
      void pendingId;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Proposal #${String(p.id)} details`}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <h3 style={{ margin: '0 0 0.5rem' }}>{p.title}</h3>
        <p style={{ color: '#555' }}>{p.description}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <tbody>
            {([
              ['State', p.state],
              ['Proposer', `${p.proposer.slice(0, 8)}...${p.proposer.slice(-4)}`],
              ['Start', formatDate(p.start_time)],
              ['End', formatDate(p.end_time)],
              ['Quorum', formatTokenAmount(p.quorum, decimals)],
              ['Total Votes', formatTokenAmount(total, decimals)],
            ] as [string, string][]).map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.4rem 0', color: '#888', width: '40%' }}>{k}</td>
                <td style={{ padding: '0.4rem 0', fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {([
            { label: '✅ Yes',     value: p.votes_yes,     color: '#16a34a' },
            { label: '❌ No',      value: p.votes_no,      color: '#dc2626' },
            { label: '⬜ Abstain', value: p.votes_abstain, color: '#6b7280' },
          ] as { label: string; value: bigint; color: string }[]).map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{formatTokenAmount(value, decimals).replace(' CVT', '')}</div>
            </div>
          ))}
        </div>

        {walletAddress && (
          <div style={{ padding: '0.75rem', background: '#f0f9ff', borderRadius: 8, fontSize: '0.875rem' }}>
            {hasVoted === null
              ? 'Checking vote status…'
              : hasVoted && voteRecord
                ? `You voted ${voteRecord.vote} with weight ${formatTokenAmount(voteRecord.weight, decimals)}`
                : p.state === 'Active'
                  ? (
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>Cast your vote:</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Yes', 'No', 'Abstain'].map(v => (
                          <button
                            key={v}
                            onClick={() => handleVote(v)}
                            style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.8rem' }}
                          >
                            {v === 'Yes' ? '✅' : v === 'No' ? '❌' : '⬜'} {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                  : 'You have not voted on this proposal.'}
          </div>
        )}
      </div>
    </div>
  );
}
