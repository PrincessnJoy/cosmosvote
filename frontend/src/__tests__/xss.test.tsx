import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProposalCard } from '../components/ProposalCard';
import type { Proposal } from '../types';

const sampleProposal = (title: string): Proposal => ({
  id: 1n,
  proposer: 'GABC',
  title,
  description: 'desc',
  votes_yes: 0n,
  votes_no: 0n,
  votes_abstain: 0n,
  quorum: 1000n,
  start_time: 0n,
  end_time: 0n,
  state: 'Active'
});

describe('XSS protection for proposal rendering', () => {
  it('does not render HTML from proposal titles as elements', () => {
    const malicious = '<script>alert("x")</script>';
    const { container } = render(<ProposalCard proposal={sampleProposal(malicious)} decimals={2} onClick={() => {}} />);

    // There should be no script element created
    expect(container.querySelector('script')).toBeNull();

    // The visible text should include the raw angle-bracket content (rendered as text)
    expect(screen.getByText(/<script>alert\("x"\)<\/script>/)).toBeTruthy();
  });
});
