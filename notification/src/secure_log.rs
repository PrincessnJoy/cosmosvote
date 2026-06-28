//! Secure logging utilities for the notification service.
//!
//! # PII Protection Policy
//!
//! The notification service processes on-chain events that may reference
//! wallet addresses and transaction details.  Raw values **must not** appear
//! in log output.  This module provides helpers to mask sensitive fields
//! before they reach any log sink.
//!
//! ## What counts as PII / sensitive data
//!
//! | Field | Classification | Treatment |
//! |---|---|---|
//! | Wallet address (full) | Pseudonymous identifier | Truncate to first 6 + last 4 chars |
//! | Transaction / ledger hash | Sensitive reference | Truncate to first 8 chars + `…` |
//! | Email address | PII | Replace with `[email]` |
//! | Webhook URL | Potentially sensitive | Log domain only, strip path/query |
//! | Error message containing address | Sensitive | Run through `mask_address` |
//!
//! ## Logging levels
//!
//! | Level | Guidance |
//! |---|---|
//! | `ERROR` | Dispatch failures (masked). No raw addresses. |
//! | `WARN`  | Retry attempts, unexpected HTTP status codes. |
//! | `INFO`  | One line per event processed (kind + masked id). |
//! | `DEBUG` | Disabled in production builds. |
//!
//! ## Audit trail
//!
//! Each processed event is recorded with its masked identifiers so that
//! failures can be investigated without exposing raw wallet addresses in
//! log files or monitoring dashboards.

// ---------------------------------------------------------------------------
// Address masking
// ---------------------------------------------------------------------------

/// Mask a Stellar/Soroban wallet address for safe logging.
///
/// Keeps the first 6 and last 4 characters, replacing the middle with `…`.
///
/// # Examples
/// ```
/// use cosmosvote_notification::secure_log::mask_address;
/// assert_eq!(mask_address("GABCDE1234567890FGHIJ"), "GABCDE…GHIJ");
/// assert_eq!(mask_address("SHORT"), "[masked]");
/// ```
pub fn mask_address(addr: &str) -> String {
    // Addresses shorter than 10 chars cannot be safely partially shown.
    if addr.len() < 10 {
        return "[masked]".into();
    }
    format!("{}…{}", &addr[..6], &addr[addr.len() - 4..])
}

// ---------------------------------------------------------------------------
// Transaction / hash masking
// ---------------------------------------------------------------------------

/// Truncate a transaction hash to its first 8 hex characters for log output.
pub fn mask_tx_hash(hash: &str) -> String {
    if hash.len() < 8 {
        return "[masked]".into();
    }
    format!("{}…", &hash[..8])
}

// ---------------------------------------------------------------------------
// Email masking
// ---------------------------------------------------------------------------

/// Replace an email address with a fixed placeholder.
pub fn mask_email(_email: &str) -> &'static str {
    "[email]"
}

// ---------------------------------------------------------------------------
// Webhook URL sanitisation
// ---------------------------------------------------------------------------

/// Extract only the scheme + host from a webhook URL, dropping path and query.
///
/// Returns the original string unchanged if it cannot be parsed.
pub fn sanitise_webhook_url(url: &str) -> String {
    // Simple split on '/' after the scheme — avoids pulling in a URL-parsing
    // crate to keep dependencies minimal.
    if let Some(rest) = url.strip_prefix("https://").or_else(|| url.strip_prefix("http://")) {
        let host = rest.split('/').next().unwrap_or(rest);
        let scheme = if url.starts_with("https://") { "https" } else { "http" };
        return format!("{scheme}://{host}");
    }
    url.into()
}

// ---------------------------------------------------------------------------
// Log-safe event representation
// ---------------------------------------------------------------------------

/// A log-safe view of a notification event.  All sensitive fields are masked
/// before this struct is constructed.
#[derive(Debug)]
pub struct SafeLogEntry {
    pub event_id: String,
    pub kind: &'static str,
    pub masked_actor: Option<String>,
    pub proposal_id: Option<u64>,
}

impl SafeLogEntry {
    pub fn from_proposal_created(event_id: &str, proposal_id: u64) -> Self {
        Self {
            event_id: mask_tx_hash(event_id),
            kind: "proposal_created",
            masked_actor: None,
            proposal_id: Some(proposal_id),
        }
    }

    pub fn from_vote_cast(event_id: &str, proposal_id: u64, voter: &str) -> Self {
        Self {
            event_id: mask_tx_hash(event_id),
            kind: "vote_cast",
            masked_actor: Some(mask_address(voter)),
            proposal_id: Some(proposal_id),
        }
    }

    pub fn from_proposal_finalised(event_id: &str, proposal_id: u64) -> Self {
        Self {
            event_id: mask_tx_hash(event_id),
            kind: "proposal_finalised",
            masked_actor: None,
            proposal_id: Some(proposal_id),
        }
    }

    /// Format as a single log line (INFO level).
    pub fn to_log_line(&self) -> String {
        let actor = self
            .masked_actor
            .as_deref()
            .map(|a| format!(" actor={a}"))
            .unwrap_or_default();
        let pid = self
            .proposal_id
            .map(|p| format!(" proposal_id={p}"))
            .unwrap_or_default();
        format!("[INFO] event={} kind={}{}{}", self.event_id, self.kind, pid, actor)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_address_standard() {
        assert_eq!(mask_address("GABCDE1234567890FGHIJ"), "GABCDE…GHIJ");
    }

    #[test]
    fn test_mask_address_too_short() {
        assert_eq!(mask_address("SHORT"), "[masked]");
        assert_eq!(mask_address(""), "[masked]");
    }

    #[test]
    fn test_mask_address_exact_boundary() {
        // Exactly 10 chars — last 4 overlap but should still work.
        let addr = "ABCDEFGHIJ";
        let masked = mask_address(addr);
        assert!(masked.starts_with("ABCDEF"));
        assert!(masked.ends_with("GHIJ"));
    }

    #[test]
    fn test_mask_tx_hash() {
        assert_eq!(mask_tx_hash("abcdef1234567890"), "abcdef12…");
    }

    #[test]
    fn test_mask_tx_hash_short() {
        assert_eq!(mask_tx_hash("abc"), "[masked]");
    }

    #[test]
    fn test_mask_email() {
        assert_eq!(mask_email("user@example.com"), "[email]");
    }

    #[test]
    fn test_sanitise_webhook_url_strips_path() {
        assert_eq!(
            sanitise_webhook_url("https://hooks.example.com/gov/proposals?token=secret"),
            "https://hooks.example.com"
        );
    }

    #[test]
    fn test_sanitise_webhook_url_http() {
        assert_eq!(
            sanitise_webhook_url("http://internal.corp/webhook"),
            "http://internal.corp"
        );
    }

    #[test]
    fn test_sanitise_webhook_url_no_scheme() {
        let raw = "not-a-url";
        assert_eq!(sanitise_webhook_url(raw), raw);
    }

    #[test]
    fn test_safe_log_entry_proposal_created_no_actor() {
        let entry = SafeLogEntry::from_proposal_created("abcdef1234567890", 1);
        let line = entry.to_log_line();
        assert!(line.contains("proposal_created"));
        assert!(line.contains("proposal_id=1"));
        assert!(!line.contains("actor="));
        // Raw hash must not appear in the log line.
        assert!(!line.contains("abcdef1234567890"));
    }

    #[test]
    fn test_safe_log_entry_vote_cast_masks_voter() {
        let voter = "GABCDE1234567890FGHIJ";
        let entry = SafeLogEntry::from_vote_cast("txhash12345678", 2, voter);
        let line = entry.to_log_line();
        // Full address must not appear.
        assert!(!line.contains(voter));
        // Masked form must appear.
        assert!(line.contains("GABCDE…GHIJ"));
    }

    #[test]
    fn test_safe_log_entry_finalised() {
        let entry = SafeLogEntry::from_proposal_finalised("deadbeef12345678", 5);
        let line = entry.to_log_line();
        assert!(line.contains("proposal_finalised"));
        assert!(line.contains("proposal_id=5"));
        assert!(!line.contains("deadbeef12345678"));
    }
}
