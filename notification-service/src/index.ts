/**
 * CosmosVote Notification Service – CLI entry point
 *
 * Issue #284 – multi-channel support
 *
 * Usage:
 *   npx ts-node src/index.ts start
 *
 *   # Subscribe via email
 *   npx ts-node src/index.ts subscribe --email user@example.com --events created,final
 *
 *   # Subscribe via generic webhook
 *   npx ts-node src/index.ts subscribe --webhook https://example.com/hook --events created,voted,final,exec,cancel
 *
 *   # Subscribe via Slack Incoming Webhook
 *   npx ts-node src/index.ts subscribe --slack https://hooks.slack.com/services/... --events created,final
 *
 *   # Subscribe via Discord Webhook
 *   npx ts-node src/index.ts subscribe --discord https://discord.com/api/webhooks/... --events final,exec
 *
 *   # Mix channels in a single subscriber
 *   npx ts-node src/index.ts subscribe \
 *     --email alert@example.com \
 *     --slack https://hooks.slack.com/services/... \
 *     --events created,final
 *
 *   # Filter by proposal
 *   npx ts-node src/index.ts subscribe --email user@example.com --proposal-id 42 --events final
 *
 *   npx ts-node src/index.ts unsubscribe <id>
 *   npx ts-node src/index.ts list
 */

import 'fs'; // ensure Node built-ins are available before dotenv

// Load .env if present
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  // dotenv is optional
}

import { startWatcher } from './watcher';
import { addSubscriber, removeSubscriber, listSubscribers } from './subscriptions';
import { GovernanceEventType } from './types';

const ALL_EVENTS: GovernanceEventType[] = ['created', 'voted', 'final', 'exec', 'cancel'];

function parseArgs(): { cmd: string; args: string[] } {
  const [, , cmd = 'start', ...args] = process.argv;
  return { cmd, args };
}

function flag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function parseEvents(raw?: string): GovernanceEventType[] {
  if (!raw) return ALL_EVENTS;
  return raw.split(',').map((e) => e.trim() as GovernanceEventType);
}

async function main(): Promise<void> {
  const { cmd, args } = parseArgs();

  switch (cmd) {
    case 'start':
      await startWatcher();
      break;

    case 'subscribe': {
      const email          = flag(args, 'email');
      const webhookUrl     = flag(args, 'webhook');
      const slackWebhookUrl   = flag(args, 'slack');
      const discordWebhookUrl = flag(args, 'discord');
      const proposalId     = flag(args, 'proposal-id');
      const events         = parseEvents(flag(args, 'events'));

      if (!email && !webhookUrl && !slackWebhookUrl && !discordWebhookUrl) {
        console.error(
          'Error: at least one channel is required.\n' +
          'Use: --email <addr>, --webhook <url>, --slack <url>, or --discord <url>',
        );
        process.exit(1);
      }

      const subscriber = addSubscriber({
        email,
        webhookUrl,
        slackWebhookUrl,
        discordWebhookUrl,
        proposalId,
        events,
      });
      console.log('Subscriber added:');
      console.log(JSON.stringify(subscriber, null, 2));
      break;
    }

    case 'unsubscribe': {
      const id = args[0];
      if (!id) { console.error('Usage: unsubscribe <id>'); process.exit(1); }
      const removed = removeSubscriber(id);
      console.log(removed ? `Removed subscriber ${id}` : `No subscriber found with id ${id}`);
      break;
    }

    case 'list':
      console.log(JSON.stringify(listSubscribers(), null, 2));
      break;

    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
