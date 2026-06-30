/** Governance event types emitted by the CosmosVote contract. */
export type GovernanceEventType =
  | 'created'  // (gov, created) — proposal created
  | 'voted'    // (gov, voted)   — vote cast
  | 'final'    // (gov, final)   — proposal finalized
  | 'exec'     // (gov, exec)    — proposal executed
  | 'cancel';  // (gov, cancel)  — proposal cancelled

export interface GovernanceEvent {
  type: GovernanceEventType;
  proposalId?: string;
  ledger: number;
  raw: unknown;
}

/**
 * A subscriber who wants notifications via one or more channels.
 *
 * Issue #284 – multi-channel support
 * Available channels: email, webhook (generic HTTP), slack, discord
 */
export interface Subscriber {
  /** Unique identifier */
  id: string;
  /** Optional: only notify for this proposal ID. Undefined = all proposals. */
  proposalId?: string;
  /** Which event types to receive */
  events: GovernanceEventType[];

  // ── Notification channels ──────────────────────────────────────────────
  /** Email address for SMTP notifications */
  email?: string;
  /** Generic HTTP webhook URL (POST with JSON body) */
  webhookUrl?: string;
  /** Slack incoming webhook URL */
  slackWebhookUrl?: string;
  /** Discord incoming webhook URL */
  discordWebhookUrl?: string;
}

/** Persisted state: list of subscribers + last processed Horizon paging token. */
export interface SubscriptionStore {
  subscribers: Subscriber[];
  /** Horizon event paging token — used to resume polling without replaying events. */
  cursor: string;
}

/** Result of a single channel dispatch. */
export interface ChannelResult {
  channel: string;
  success: boolean;
  error?: string;
}
