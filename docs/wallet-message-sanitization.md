# Wallet message sanitization

This project renders proposal titles and descriptions as React text nodes (not HTML), so consumer-supplied strings are escaped and cannot inject markup into the DOM.

Guidance:
- Avoid using `dangerouslySetInnerHTML` unless you explicitly sanitize input with a robust HTML sanitizer (e.g., DOMPurify).
- Wallet payloads should treat titles/descriptions as plain text when building prompts or transactions.
