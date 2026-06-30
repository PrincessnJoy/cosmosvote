import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProposalDetail } from '../components/ProposalDetail';
import type { Proposal } from '../types';

vi.mock('../api', () => ({
  fetchHasVoted: vi.fn().mockResolvedValue(false),
  fetchVoteRecord: vi.fn().mockResolvedValue(null),
}));

const mockProposal: Proposal = {
  id: 2n,
  proposer: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  title: 'Detail Proposal',
  description: 'Detail description',
  votes_yes: 300n,
  votes_no: 100n,
  votes_abstain: 50n,
  quorum: 500n,
  start_time: 1700000000n,
  end_time: 1700086400n,
  state: 'Active',
};

describe('ProposalDetail snapshots', () => {
  it('matches snapshot without wallet', () => {
    const { container } = render(
      <ProposalDetail proposal={mockProposal} decimals={0} walletAddress={null} onClose={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot with wallet connected', () => {
    const { container } = render(
      <ProposalDetail
        proposal={mockProposal}
        decimals={0}
        walletAddress="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
        onClose={vi.fn()}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
