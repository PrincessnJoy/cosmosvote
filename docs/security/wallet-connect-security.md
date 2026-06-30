# Wallet-Connect Fraud and Phishing Mitigation

Wallet interactions are the highest-risk surface in any dApp. This document
describes how CosmosVote mitigates fraud and phishing, what users should
verify before signing, and what contributors must follow when modifying
wallet-related code.

---

## 1. Safe Wallet Connection Practices

### For Users

**Before connecting your wallet:**

1. **Verify the URL.** Only connect at the official domain. Bookmark it and
   navigate from your bookmark — never from a link in Discord, email, or a
   search engine ad.
2. **Check the browser address bar.** The site must use HTTPS with a valid
   certificate. A padlock icon alone is not enough — confirm the exact domain.
3. **Use a dedicated browser profile** for dApp interactions, separate from
   your everyday browsing, to reduce exposure to malicious extensions.
4. **Never enter your seed phrase in any website field.** No legitimate dApp
   — including CosmosVote — ever asks for your seed phrase.

**Supported wallets:**

| Wallet | Connection method | Notes |
|--------|------------------|-------|
| Freighter | Browser extension (`@stellar/freighter-api`) | Official Stellar wallet |
| xBull | Browser extension (`window.xBullSDK`) | Injected by the extension |

Only connect through the official in-app modal. If a wallet prompt appears
outside of clicking "Connect Wallet", close it immediately.

### For Contributors

- Wallet connection logic lives in `frontend/src/WalletContext.tsx` and
  `frontend/src/components/ConnectWalletModal.tsx`.
- Never persist or log wallet addresses to external services.
- Never read `window.xBullSDK` or any wallet-injected object outside of the
  `connect()` function in `WalletContext.tsx`.
- Gate all wallet API calls behind explicit user actions (button clicks) — do
  not auto-connect on page load.

---

## 2. What Happens When You Sign a Transaction

Every on-chain action (casting a vote, creating a proposal) follows this flow:

```
User clicks "Vote Yes"
  → Frontend builds a Soroban transaction (read-only simulation first)
  → Transaction is passed to your wallet for signing
  → Wallet displays the transaction details — you review and approve
  → Signed transaction is submitted to the Soroban RPC
  → Contract executes; result is shown in the UI
```

### What Your Wallet Will Show

Your wallet extension will display the contract invocation before you sign.
Verify each field:

| Field | What to check |
|-------|--------------|
| **Contract address** | Must match the published `GOVERNANCE_CONTRACT_ID` |
| **Function name** | `cast_vote`, `create_proposal`, or `finalise` — nothing else |
| **Network** | Testnet or Mainnet — matches the network you intend to use |
| **Fee** | A small XLM fee for transaction processing; no large token transfers |

**Red flags — reject the transaction if you see:**

- A token `transfer` or `approve` operation you did not initiate
- A contract address you cannot verify against the official deployment
- A request to sign on a network different from the current page
- Any prompt asking you to "unlock" your wallet with a seed phrase or key

### Simulation Before Signing

CosmosVote always simulates the transaction via `simulateTransaction` before
presenting the signature request. A simulation failure (e.g. `VotingPeriodEnded`,
`AlreadyVoted`) is caught and shown as an error message — the wallet signature
request is never shown for a transaction that will fail on-chain.

---

## 3. Phishing Attack Vectors and Mitigations

### 3.1 Fake dApp Sites

**Attack:** An attacker clones the CosmosVote frontend and hosts it at a
lookalike domain (e.g. `cosm0svote.io`, `cosmosvvote.app`).

**Mitigations:**
- The official domain is published in the README and SECURITY.md.
- The Content Security Policy (see `docs/security/csp.md`) is enforced by the
  official deployment — fake sites cannot replicate it.
- Subresource Integrity (SRI) on production builds ensures script integrity.

### 3.2 Malicious Browser Extensions

**Attack:** A malicious extension modifies the page DOM or intercepts wallet
API calls to replace the contract address or vote parameter.

**Mitigations:**
- Transaction parameters are built from the contract address stored in
  `frontend/src/config.ts`, which is bundled at build time.
- Users should verify the function name and contract address in their wallet
  extension's signing prompt before approving.
- Use a dedicated browser profile without untrusted extensions for dApp use.

### 3.3 Social Engineering / Urgency Scams

**Attack:** An attacker sends a message claiming there is an "emergency
proposal" requiring immediate signing via a link.

**Mitigations:**
- Governance proposals have a `duration` of 60 seconds to 30 days. Legitimate
  proposals are never instant — you always have time to verify.
- CosmosVote will never contact users via DM, email, or social media asking
  them to sign a transaction.
- `finalise()` is permissionless and called by off-chain bots — users are
  never required to manually finalize a proposal under time pressure.

### 3.4 Allowance / Approval Hijacking

**Attack:** A malicious site requests a large token `approve` disguised as a
routine operation.

**Mitigations:**
- CosmosVote does **not** require token `approve` for voting. Voting uses the
  token balance directly — no allowance is requested.
- If a site prompts you for a token `approve` or `transfer` when you expected
  to vote, reject and report it.

---

## 4. Guidance for App Users

**Quick safety checklist before every session:**

- [ ] URL is the official domain and uses HTTPS
- [ ] You navigated to the site from a bookmark, not a link
- [ ] Your wallet extension shows the correct network (Testnet / Mainnet)
- [ ] The signing prompt shows only `cast_vote`, `create_proposal`, or `finalise`
- [ ] No token transfer or approval is in the transaction
- [ ] You are not being asked for your seed phrase anywhere

**If something looks wrong:**

1. Close the tab.
2. Report the suspicious URL or transaction to the project maintainers via the
   [security disclosure process](../../SECURITY.md).
3. If you signed a transaction you did not intend to, check your transaction
   history on [Stellar Expert](https://stellar.expert) immediately.

---

## 5. Guidance for Contributors

When modifying wallet or transaction code:

1. **Never log transaction XDR or wallet addresses** to the console in
   production builds. Use `import.meta.env.DEV` guards.
2. **Keep wallet API surface minimal.** Only call `isConnected`, `requestAccess`,
   and `getAddress` — do not request permissions beyond what is needed.
3. **Build transactions server-side if possible.** When parameters come from
   the blockchain (proposal ID, contract address), fetch them from the RPC;
   do not interpolate user-supplied strings into contract invocations.
4. **Sanitize all URL fields** (proposal `link`) before rendering as anchors.
   Use `rel="noopener noreferrer"` on all external links.
5. **Run `make lint`** after any change to `WalletContext.tsx` or
   `ConnectWalletModal.tsx`. The ESLint config enforces no-`dangerouslySetInnerHTML`
   and other XSS-prevention rules.
6. **Write a test** in `frontend/src/test/` for any new wallet interaction path.
   See `frontend/src/test/api.test.ts` for the mock pattern.

---

## Related Documentation

- [Content Security Policy](./csp.md)
- [Threat Model](./threat-model.md)
- [Key Management](./key-management.md)
- [SECURITY.md](../../SECURITY.md)
