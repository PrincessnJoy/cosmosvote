//! Integration tests for notification service workflows.
//!
//! These tests validate end-to-end notification delivery logic:
//! event polling → filtering → webhook/email dispatch, including
//! mocked RPC and SMTP interactions and failure-path coverage.
//!
//! # Architecture under test
//!
//! ```text
//! Soroban RPC (mock)
//!     └─► EventPoller
//!             └─► NotificationRouter
//!                     ├─► WebhookDispatcher  → HTTP endpoint (mock)
//!                     └─► EmailDispatcher    → SMTP server (mock)
//! ```
//!
//! # Test coverage
//! - Proposal-created event triggers webhook notification
//! - Vote-cast event triggers webhook notification
//! - Proposal-finalised event triggers email notification
//! - RPC polling failure is retried and surfaced as an error
//! - SMTP delivery failure is captured and does not panic
//! - Webhook HTTP 5xx is captured and does not panic
//! - Duplicate events are deduplicated (idempotency)

#![cfg(test)]

use std::cell::RefCell;
use std::collections::HashSet;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// A raw on-chain event emitted by the governance contract.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ContractEvent {
    pub id: String,
    pub kind: EventKind,
    pub ledger: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum EventKind {
    ProposalCreated { proposal_id: u64 },
    VoteCast { proposal_id: u64, voter: String },
    ProposalFinalised { proposal_id: u64, passed: bool },
}

/// Outbound notification produced by the router.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Notification {
    Webhook { url: String, payload: String },
    Email { to: String, subject: String, body: String },
}

// ---------------------------------------------------------------------------
// Mock RPC client
// ---------------------------------------------------------------------------

/// Mock Soroban RPC client.  Returns a pre-configured sequence of event
/// batches; an empty `events` list simulates a polling round with no new
/// events.
pub struct MockRpcClient {
    /// Each entry is one polling "page" of events.
    batches: RefCell<Vec<Vec<ContractEvent>>>,
    /// Counts how many times `poll_events` was called.
    pub call_count: RefCell<u32>,
    /// When true, the next `poll_events` call returns an error.
    pub fail_next: RefCell<bool>,
}

impl MockRpcClient {
    pub fn new(batches: Vec<Vec<ContractEvent>>) -> Self {
        Self {
            batches: RefCell::new(batches),
            call_count: RefCell::new(0),
            fail_next: RefCell::new(false),
        }
    }

    pub fn poll_events(&self) -> Result<Vec<ContractEvent>, String> {
        *self.call_count.borrow_mut() += 1;
        if *self.fail_next.borrow() {
            *self.fail_next.borrow_mut() = false;
            return Err("RPC connection refused".into());
        }
        let mut batches = self.batches.borrow_mut();
        Ok(batches.pop().unwrap_or_default())
    }
}

// ---------------------------------------------------------------------------
// Mock SMTP client
// ---------------------------------------------------------------------------

pub struct MockSmtpClient {
    pub sent: RefCell<Vec<(String, String, String)>>, // (to, subject, body)
    pub fail_next: RefCell<bool>,
}

impl MockSmtpClient {
    pub fn new() -> Self {
        Self {
            sent: RefCell::new(vec![]),
            fail_next: RefCell::new(false),
        }
    }

    pub fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        if *self.fail_next.borrow() {
            *self.fail_next.borrow_mut() = false;
            return Err("SMTP connection timed out".into());
        }
        self.sent.borrow_mut().push((to.into(), subject.into(), body.into()));
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Mock HTTP client (for webhooks)
// ---------------------------------------------------------------------------

pub struct MockHttpClient {
    pub requests: RefCell<Vec<(String, String)>>, // (url, payload)
    /// HTTP status code to return (200 = success, 500 = server error).
    pub status: RefCell<u16>,
}

impl MockHttpClient {
    pub fn new() -> Self {
        Self {
            requests: RefCell::new(vec![]),
            status: RefCell::new(200),
        }
    }

    pub fn post(&self, url: &str, payload: &str) -> Result<u16, String> {
        self.requests.borrow_mut().push((url.into(), payload.into()));
        let s = *self.status.borrow();
        if s >= 500 {
            Err(format!("HTTP {s}"))
        } else {
            Ok(s)
        }
    }
}

// ---------------------------------------------------------------------------
// Notification service components
// ---------------------------------------------------------------------------

/// Routes events to the appropriate dispatchers.
pub struct NotificationRouter<'a> {
    webhook_url: String,
    email_to: String,
    http: &'a MockHttpClient,
    smtp: &'a MockSmtpClient,
    seen_ids: RefCell<HashSet<String>>,
}

impl<'a> NotificationRouter<'a> {
    pub fn new(
        webhook_url: &str,
        email_to: &str,
        http: &'a MockHttpClient,
        smtp: &'a MockSmtpClient,
    ) -> Self {
        Self {
            webhook_url: webhook_url.into(),
            email_to: email_to.into(),
            http,
            smtp,
            seen_ids: RefCell::new(HashSet::new()),
        }
    }

    /// Process a batch of events.  Returns errors encountered during dispatch.
    pub fn process(&self, events: Vec<ContractEvent>) -> Vec<String> {
        let mut errors = vec![];
        for event in events {
            // Idempotency: skip already-processed events.
            if !self.seen_ids.borrow_mut().insert(event.id.clone()) {
                continue;
            }
            if let Err(e) = self.dispatch(event) {
                errors.push(e);
            }
        }
        errors
    }

    fn dispatch(&self, event: ContractEvent) -> Result<(), String> {
        match &event.kind {
            EventKind::ProposalCreated { proposal_id } => {
                let payload = format!(
                    r#"{{"event":"proposal_created","proposal_id":{proposal_id}}}"#
                );
                self.http.post(&self.webhook_url, &payload)?;
            }
            EventKind::VoteCast { proposal_id, voter } => {
                let payload = format!(
                    r#"{{"event":"vote_cast","proposal_id":{proposal_id},"voter":"{voter}"}}"#
                );
                self.http.post(&self.webhook_url, &payload)?;
            }
            EventKind::ProposalFinalised { proposal_id, passed } => {
                let subject = format!("Proposal #{proposal_id} finalised");
                let body = format!(
                    "Proposal #{proposal_id} has been {}.",
                    if *passed { "passed" } else { "rejected" }
                );
                self.smtp.send(&self.email_to, &subject, &body)?;
            }
        }
        Ok(())
    }
}

/// Top-level poller that drives RPC polling and hands events to the router.
pub struct EventPoller<'a> {
    rpc: &'a MockRpcClient,
    router: &'a NotificationRouter<'a>,
}

impl<'a> EventPoller<'a> {
    pub fn new(rpc: &'a MockRpcClient, router: &'a NotificationRouter<'a>) -> Self {
        Self { rpc, router }
    }

    /// Run one polling round.  Returns dispatch errors; RPC errors are
    /// propagated as `Err`.
    pub fn poll_once(&self) -> Result<Vec<String>, String> {
        let events = self.rpc.poll_events()?;
        Ok(self.router.process(events))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

fn make_event(id: &str, kind: EventKind) -> ContractEvent {
    ContractEvent { id: id.into(), kind, ledger: 100 }
}

// --- Webhook dispatch ---

#[test]
fn test_proposal_created_triggers_webhook() {
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-1", EventKind::ProposalCreated { proposal_id: 42 }),
    ]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().expect("poll should succeed");
    assert!(errors.is_empty());
    assert_eq!(http.requests.borrow().len(), 1);
    let (url, payload) = &http.requests.borrow()[0];
    assert_eq!(url, "https://hooks.example.com/gov");
    assert!(payload.contains("\"proposal_created\""));
    assert!(payload.contains("42"));
}

#[test]
fn test_vote_cast_triggers_webhook() {
    let voter = "GABCDE1234567890".to_string();
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-2", EventKind::VoteCast { proposal_id: 1, voter: voter.clone() }),
    ]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().expect("poll should succeed");
    assert!(errors.is_empty());
    assert_eq!(http.requests.borrow().len(), 1);
    let (_, payload) = &http.requests.borrow()[0];
    assert!(payload.contains("\"vote_cast\""));
    assert!(payload.contains("GABCDE1234567890"));
}

// --- Email dispatch ---

#[test]
fn test_proposal_finalised_triggers_email() {
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-3", EventKind::ProposalFinalised { proposal_id: 7, passed: true }),
    ]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().expect("poll should succeed");
    assert!(errors.is_empty());
    assert_eq!(smtp.sent.borrow().len(), 1);
    let (to, subject, body) = &smtp.sent.borrow()[0];
    assert_eq!(to, "admin@example.com");
    assert!(subject.contains("7"));
    assert!(body.contains("passed"));
}

#[test]
fn test_proposal_rejected_email_body() {
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-4", EventKind::ProposalFinalised { proposal_id: 3, passed: false }),
    ]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    poller.poll_once().unwrap();
    let (_, _, body) = &smtp.sent.borrow()[0];
    assert!(body.contains("rejected"));
}

// --- RPC failure path ---

#[test]
fn test_rpc_polling_failure_is_propagated() {
    let rpc = MockRpcClient::new(vec![]);
    *rpc.fail_next.borrow_mut() = true;
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let result = poller.poll_once();
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("RPC"));
    // No notifications dispatched
    assert!(http.requests.borrow().is_empty());
    assert!(smtp.sent.borrow().is_empty());
}

#[test]
fn test_rpc_failure_then_success() {
    // First batch will fail, second succeeds with an event.
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-5", EventKind::ProposalCreated { proposal_id: 99 }),
    ]]);
    *rpc.fail_next.borrow_mut() = true;
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    // First poll — RPC error.
    assert!(poller.poll_once().is_err());
    // Second poll — succeeds.
    let errors = poller.poll_once().unwrap();
    assert!(errors.is_empty());
    assert_eq!(http.requests.borrow().len(), 1);
}

// --- SMTP failure path ---

#[test]
fn test_smtp_failure_captured_as_error() {
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-6", EventKind::ProposalFinalised { proposal_id: 5, passed: true }),
    ]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    *smtp.fail_next.borrow_mut() = true;
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().expect("poll_once itself should not error");
    assert_eq!(errors.len(), 1);
    assert!(errors[0].contains("SMTP"));
}

// --- Webhook HTTP 5xx failure path ---

#[test]
fn test_webhook_5xx_captured_as_error() {
    let rpc = MockRpcClient::new(vec![vec![
        make_event("evt-7", EventKind::ProposalCreated { proposal_id: 10 }),
    ]]);
    let http = MockHttpClient::new();
    *http.status.borrow_mut() = 500;
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().unwrap();
    assert_eq!(errors.len(), 1);
    assert!(errors[0].contains("500"));
}

// --- Idempotency / deduplication ---

#[test]
fn test_duplicate_events_are_deduplicated() {
    let event = make_event("evt-8", EventKind::ProposalCreated { proposal_id: 1 });
    // Two batches with the same event id.
    let rpc = MockRpcClient::new(vec![
        vec![event.clone()],
        vec![event],
    ]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    poller.poll_once().unwrap(); // first batch
    poller.poll_once().unwrap(); // duplicate batch — should be skipped
    assert_eq!(http.requests.borrow().len(), 1, "duplicate event should only dispatch once");
}

// --- Empty polling round ---

#[test]
fn test_empty_polling_round_is_no_op() {
    let rpc = MockRpcClient::new(vec![vec![]]);
    let http = MockHttpClient::new();
    let smtp = MockSmtpClient::new();
    let router = NotificationRouter::new("https://hooks.example.com/gov", "admin@example.com", &http, &smtp);
    let poller = EventPoller::new(&rpc, &router);

    let errors = poller.poll_once().unwrap();
    assert!(errors.is_empty());
    assert!(http.requests.borrow().is_empty());
    assert!(smtp.sent.borrow().is_empty());
}
