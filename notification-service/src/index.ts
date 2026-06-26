/** Notification service entry point — listens for on-chain governance events. */

export interface GovernanceEvent {
  type: 'proposal_created' | 'vote_cast' | 'proposal_finalized' | 'proposal_executed';
  proposalId: number;
  timestamp: number;
}

export function handleEvent(event: GovernanceEvent): void {
  console.log(`[notification-service] Event: ${event.type} for proposal #${event.proposalId}`);
}
