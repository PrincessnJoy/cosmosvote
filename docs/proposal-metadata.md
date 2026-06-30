# Proposal Metadata Links / IPFS References

Proposals can include an optional `link` field that points to off-chain content
such as a forum post, an IPFS document, or any other external reference.

## Why Off-Chain Storage

Soroban persistent storage has a per-byte cost, making it impractical to store
large bodies of text on-chain. The `link` field solves this by keeping heavy
content off-chain while anchoring a verifiable reference on-chain.

## Field Specification

| Field | Type | Constraints |
|-------|------|-------------|
| `link` | `Option<String>` | 1–256 characters when present |

If omitted (`None`), the proposal is valid and the field is simply absent.

## Accepted URL Schemes

The contract validates only the byte length (1–256). Off-chain consumers
**should** validate the scheme themselves. Recommended schemes:

- `https://` — hosted content (forum post, governance forum, Arweave gateway)
- `ipfs://` — IPFS CID reference (e.g. `ipfs://Qm…`)
- `ar://` — Arweave transaction ID

### Examples

```
https://forum.cosmosvote.io/t/proposal-title/123
ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
ar://tx-id-here
```

## On-Chain Event

The `proposal_created` event is emitted by `create_proposal` and carries:

```
topics: ("gov", "created")
data:   (id, proposer, title, quorum, end_time)
```

The `link` is not included in the event payload — off-chain indexers should
call `get_proposal(id)` to retrieve the full `Proposal` struct including the
`link` field after observing the event.

## Validation Errors

| Error | Code | Condition |
|-------|------|-----------|
| `InvalidLink` | 37 | `link` is `Some("")` or longer than 256 bytes |

## Frontend Integration

When displaying a proposal, render the `link` field as a clickable anchor:

```typescript
{proposal.link && (
  <a href={proposal.link} target="_blank" rel="noopener noreferrer">
    View full proposal
  </a>
)}
```

Always use `rel="noopener noreferrer"` to prevent tab-napping and avoid
leaking the referrer to external sites.

For IPFS links, resolve through a public gateway if needed:

```typescript
function resolveLink(link: string): string {
  if (link.startsWith('ipfs://')) {
    return link.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return link;
}
```

## Security Considerations

- The contract does **not** validate URL scheme or domain — any 1–256 byte
  string is accepted. Frontend code must sanitize before rendering.
- Never use `dangerouslySetInnerHTML` with user-supplied URLs.
- Use an allowlist of trusted IPFS gateways or self-host a gateway for
  production deployments.
- Content at the linked URL is off-chain and mutable. For tamper-evident
  references, use IPFS CIDs (content-addressed, immutable by design).
