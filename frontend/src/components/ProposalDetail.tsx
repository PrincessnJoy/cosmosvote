import type { Proposal } from '../types';
import { fetchHasVoted, fetchVoteRecord, castVote } from '../api';
import { useEffect, useState } from 'react';
import { formatTokenAmount } from '../utils';

interface Props {
  proposal: Proposal;
  decimals: number;
  walletAddress: string | null;
  onClose: () => void;
  onVoteSuccess?: () => void;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function ProposalDetail({ proposal: p, decimals, walletAddress, onClose, onVoteSuccess }: Props) {
  const [hasVoted, setHasVoted] = useState<boolean | null>(null);
  const [voteRecord, setVoteRecord] = useState<{ vote: string; weight: bigint } | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [votingMessage, setVotingMessage] = useState<string | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    fetchHasVoted(Number(p.id), walletAddress).then(setHasVoted);
    fetchVoteRecord(Number(p.id), walletAddress).then(setVoteRecord);
  }, [p.id, walletAddress]);

  const handleVote = async (vote: 'Yes' | 'No' | 'Abstain') => {
    if (!walletAddress) {
      setVotingError('Wallet not connected');
      return;
    }

    setIsVoting(true);
    setVotingMessage(null);
    setVotingError(null);

    try {
      const result = await castVote(walletAddress, Number(p.id), vote);
      setVotingMessage(`✅ Vote submitted successfully! Transaction: ${String(result).slice(0, 16)}...`);
      
      // Refresh vote status
      const voted = await fetchHasVoted(Number(p.id), walletAddress);
      const record = await fetchVoteRecord(Number(p.id), walletAddress);
      setHasVoted(voted);
      setVoteRecord(record);
      
      // Call callback to refresh proposal data
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      setVotingError(`❌ Voting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsVoting(false);
    }
  };

  const total = p.votes_yes + p.votes_no + p.votes_abstain;
  const isProposalActive = p.state === 'Active';
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const votingOpen = currentTime >= p.start_time && currentTime <= p.end_time;
  const canVote = isProposalActive && votingOpen && walletAddress && !hasVoted;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Proposal #{String(p.id)}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
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

        {votingMessage && (
          <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem', color: '#166534' }}>
            {votingMessage}
          </div>
        )}

        {votingError && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem', color: '#991b1b' }}>
            {votingError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Vote Yes', vote: 'Yes' as const, color: '#16a34a', disabled: !canVote },
            { label: 'Vote No', vote: 'No' as const, color: '#dc2626', disabled: !canVote },
            { label: 'Abstain', vote: 'Abstain' as const, color: '#6b7280', disabled: !canVote },
          ].map(({ label, vote, color, disabled }) => (
            <button
              key={vote}
              onClick={() => handleVote(vote)}
              disabled={disabled || isVoting}
              style={{
                padding: '0.75rem',
                background: disabled || isVoting ? '#e5e7eb' : color,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: disabled || isVoting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                opacity: disabled || isVoting ? 0.6 : 1,
              }}
            >
              {isVoting ? 'Submitting...' : label}
            </button>
          ))}
        </div>

        {!walletAddress && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: 8, fontSize: '0.875rem', color: '#92400e' }}>
            ℹ️ Connect your wallet to vote on this proposal
          </div>
        )}

        {walletAddress && hasVoted && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#e0e7ff', borderRadius: 8, fontSize: '0.875rem', color: '#3730a3' }}>
            ✓ You have already voted on this proposal
          </div>
        )}

        {walletAddress && !isProposalActive && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3e8ff', borderRadius: 8, fontSize: '0.875rem', color: '#6b21a8' }}>
            ℹ️ This proposal is not active and cannot receive new votes
          </div>
        )}

        {walletAddress && isProposalActive && !votingOpen && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3e8ff', borderRadius: 8, fontSize: '0.875rem', color: '#6b21a8' }}>
            ℹ️ Voting is not open yet or has ended for this proposal
          </div>
        )}
      </div>
    </div>
  );
}
