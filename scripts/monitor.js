#!/usr/bin/env node
/**
 * CosmosVote — Runtime Anomaly Monitor
 *
 * Polls Soroban contract events and emits alerts when anomalous
 * governance or token activity is detected.
 *
 * Usage:
 *   node monitor.js
 *   STELLAR_RPC_URL=https://... GOVERNANCE_CONTRACT_ID=C... node monitor.js
 */

"use strict";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CONFIG = {
  rpcUrl: process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
  governanceContractId: process.env.GOVERNANCE_CONTRACT_ID || "",
  tokenContractId: process.env.TOKEN_CONTRACT_ID || "",
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "30000", 10),

  thresholds: {
    // Token transfer amount that triggers a large-transfer alert (in base units)
    largeTransferAmount: BigInt(process.env.LARGE_TRANSFER_THRESHOLD || "1000000000000"),
    // Minimum votes to flag a rapid-voting burst (votes within a single poll window)
    rapidVoteBurst: parseInt(process.env.RAPID_VOTE_BURST || "50", 10),
    // Number of consecutive admin-change events before alerting
    adminChangeCount: parseInt(process.env.ADMIN_CHANGE_COUNT || "2", 10),
  },
};

// ---------------------------------------------------------------------------
// Logging / alerting hooks
// ---------------------------------------------------------------------------
function log(level, event, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  console.log(JSON.stringify(entry));
}

function alert(event, details) {
  log("ALERT", event, details);
  // Hook: extend this function to send to PagerDuty, Slack, email, etc.
  // Example:
  //   fetch(process.env.SLACK_WEBHOOK_URL, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ text: `[ALERT] ${event}: ${JSON.stringify(details)}` }),
  //   });
}

function info(event, details) {
  log("INFO", event, details);
}

// ---------------------------------------------------------------------------
// Anomaly detection rules
// ---------------------------------------------------------------------------

/**
 * Detect anomalies in a batch of events fetched from the contract.
 * @param {Array} events - Raw Soroban contract events (parsed)
 */
function detectAnomalies(events) {
  let adminChanges = 0;
  let voteCount = 0;

  for (const ev of events) {
    const { type: evType, contractId, topics, value } = ev;

    // --- Admin / config changes -----------------------------------------
    if (topics.includes("set_admin") || topics.includes("update_config")) {
      adminChanges++;
      info("admin_change_detected", { contractId, topics });
      if (adminChanges >= CONFIG.thresholds.adminChangeCount) {
        alert("SUSPICIOUS_ADMIN_CHANGES", {
          contractId,
          count: adminChanges,
          topics,
          message: `${adminChanges} admin-change events detected in a single window`,
        });
      }
    }

    // --- Large token transfers -------------------------------------------
    if (topics.includes("transfer") && value?.amount !== undefined) {
      const amount = BigInt(value.amount);
      if (amount >= CONFIG.thresholds.largeTransferAmount) {
        alert("LARGE_TOKEN_TRANSFER", {
          contractId,
          from: value.from,
          to: value.to,
          amount: amount.toString(),
          threshold: CONFIG.thresholds.largeTransferAmount.toString(),
        });
      }
    }

    // --- Rapid voting bursts ---------------------------------------------
    if (topics.includes("vote_cast")) {
      voteCount++;
    }

    // --- Proposal cancellation by admin ----------------------------------
    if (topics.includes("proposal_cancelled")) {
      alert("PROPOSAL_CANCELLED", {
        contractId,
        proposalId: value?.proposal_id,
        cancelledBy: value?.admin,
      });
    }

    // --- Contract paused -------------------------------------------------
    if (topics.includes("contract_paused")) {
      alert("CONTRACT_PAUSED", {
        contractId,
        pausedBy: value?.admin,
        message: "Governance contract has been paused",
      });
    }

    // --- Mint event (unexpected supply increase) -------------------------
    if (topics.includes("mint")) {
      alert("TOKEN_MINTED", {
        contractId,
        to: value?.to,
        amount: value?.amount,
        message: "Token mint event detected — verify this is authorised",
      });
    }
  }

  if (voteCount >= CONFIG.thresholds.rapidVoteBurst) {
    alert("RAPID_VOTE_BURST", {
      count: voteCount,
      threshold: CONFIG.thresholds.rapidVoteBurst,
      message: `${voteCount} vote_cast events in a single poll window`,
    });
  }
}

// ---------------------------------------------------------------------------
// Soroban event polling (stub — replace with actual RPC calls)
// ---------------------------------------------------------------------------

/**
 * Fetch recent contract events via Soroban RPC getEvents.
 * Returns a normalised array of { type, contractId, topics, value }.
 */
async function fetchEvents(contractId, cursor) {
  if (!contractId) return { events: [], cursor };

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getEvents",
    params: {
      startLedger: cursor || undefined,
      filters: [{ type: "contract", contractIds: [contractId] }],
      pagination: { limit: 200 },
    },
  };

  const res = await fetch(CONFIG.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RPC error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const rawEvents = json?.result?.events ?? [];
  const nextCursor = json?.result?.cursor ?? cursor;

  const events = rawEvents.map((e) => ({
    type: e.type,
    contractId: e.contractId,
    topics: e.topic?.map((t) => t?.sym ?? t) ?? [],
    value: e.value,
  }));

  return { events, cursor: nextCursor };
}

// ---------------------------------------------------------------------------
// Main polling loop
// ---------------------------------------------------------------------------
async function main() {
  info("monitor_started", {
    rpcUrl: CONFIG.rpcUrl,
    governanceContractId: CONFIG.governanceContractId,
    tokenContractId: CONFIG.tokenContractId,
    pollIntervalMs: CONFIG.pollIntervalMs,
    thresholds: {
      largeTransferAmount: CONFIG.thresholds.largeTransferAmount.toString(),
      rapidVoteBurst: CONFIG.thresholds.rapidVoteBurst,
      adminChangeCount: CONFIG.thresholds.adminChangeCount,
    },
  });

  let govCursor;
  let tokenCursor;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const [govResult, tokenResult] = await Promise.all([
        fetchEvents(CONFIG.governanceContractId, govCursor),
        fetchEvents(CONFIG.tokenContractId, tokenCursor),
      ]);

      govCursor = govResult.cursor;
      tokenCursor = tokenResult.cursor;

      const allEvents = [...govResult.events, ...tokenResult.events];
      if (allEvents.length > 0) {
        info("events_fetched", { count: allEvents.length });
        detectAnomalies(allEvents);
      }
    } catch (err) {
      log("ERROR", "poll_failed", { message: err.message });
    }

    await new Promise((resolve) => setTimeout(resolve, CONFIG.pollIntervalMs));
  }
}

main();
