import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProposalCard } from '../components/ProposalCard';
import { ProposalDetail } from '../components/ProposalDetail';
import type { Proposal } from '../types';

vi.mock('../api', () => ({
  fetchHasVoted: vi.fn().mockResolvedValue(false),
  fetchVoteRecord: vi.fn().mockResolvedValue(null),
}));

const baseProposal: Proposal = {
  id: 1n,
  proposer: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  title: 'Test Proposal',
  description: 'A test proposal description',
  votes_yes: 500n,
  votes_no: 200n,
  votes_abstain: 100n,
  quorum: 1000n,
  start_time: 1700000000n,
  end_time: 1700086400n,
  state: 'Active',
};

describe('ProposalCard snapshot regression', () => {
  it('matches snapshot — Active state', () => {
    const { container } = render(
      <ProposalCard proposal={baseProposal} decimals={0} onClick={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — Passed state', () => {
    const { container } = render(
      <ProposalCard proposal={{ ...baseProposal, state: 'Passed' }} decimals={0} onClick={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — Rejected state', () => {
    const { container } = render(
      <ProposalCard proposal={{ ...baseProposal, state: 'Rejected' }} decimals={0} onClick={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — Executed state', () => {
    const { container } = render(
      <ProposalCard proposal={{ ...baseProposal, state: 'Executed' }} decimals={0} onClick={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — Cancelled state', () => {
    const { container } = render(
      <ProposalCard proposal={{ ...baseProposal, state: 'Cancelled' }} decimals={0} onClick={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('ProposalDetail modal snapshot regression', () => {
  const detailProposal: Proposal = {
    ...baseProposal,
    id: 2n,
    title: 'Detail Proposal',
    description: 'Detail description',
    votes_yes: 300n,
    votes_no: 100n,
    votes_abstain: 50n,
    quorum: 500n,
  };

  it('matches snapshot — no wallet connected', () => {
    const { container } = render(
      <ProposalDetail proposal={detailProposal} decimals={0} walletAddress={null} onClose={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — wallet connected', () => {
    const { container } = render(
      <ProposalDetail
        proposal={detailProposal}
        decimals={0}
        walletAddress="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
        onClose={vi.fn()}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('matches snapshot — Passed state', () => {
    const { container } = render(
      <ProposalDetail
        proposal={{ ...detailProposal, state: 'Passed' }}
        decimals={0}
        walletAddress={null}
        onClose={vi.fn()}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
