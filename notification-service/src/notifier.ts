/**
 * CosmosVote Notification Service – Notifier
 *
 * Issue #284 – multi-channel support
 *
 * Dispatches a governance event to all configured channels for a subscriber.
 * Channel logic is delegated to the plugin registry in channels.ts.
 */

import type { GovernanceEvent, ChannelResult, Subscriber } from './types';
import { CHANNELS } from './channels';

/**
 * Deliver a governance event to every channel the subscriber has configured.
 *
 * All channels are attempted concurrently. Failures in one channel do NOT
 * prevent delivery on other channels. Results are returned for logging.
 */
export async function notify(
  subscriber: Subscriber,
  event: GovernanceEvent,
): Promise<ChannelResult[]> {
  const tasks = CHANNELS
    .filter((ch) => ch.isConfigured(subscriber))
    .map(async (ch): Promise<ChannelResult> => {
      try {
        await ch.send(subscriber, event);
        return { channel: ch.name, success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[notifier] Channel "${ch.name}" failed for subscriber ${subscriber.id}: ${message}`);
        return { channel: ch.name, success: false, error: message };
      }
    });

  return Promise.all(tasks);
}
