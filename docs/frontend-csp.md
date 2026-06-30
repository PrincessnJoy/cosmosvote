# Frontend Content Security Policy (CSP)

This document describes recommended CSP directives and how to apply them for development and production.

## Production

Add the following HTTP response header on your production web server (preferred) or use the equivalent `<meta http-equiv>` in the HTML:

Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; script-src 'self' 'strict-dynamic' https:; connect-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data:;

Notes:
- Use server headers where possible; they cannot be overridden by an attacker.
- Avoid `'unsafe-inline'` and `'unsafe-eval'` in production when feasible.

## Development (Vite)

Vite's dev server uses HMR which requires relaxed script rules. For local development, use a more permissive policy (only locally) such as:

Content-Security-Policy: default-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:5173 ws://localhost:5173;

Alternatively, keep the strict production meta tag in `index.html` and apply a development-only header replacement in your dev server configuration.

## Verifying

- Open the app in the browser and check the developer console for CSP violations.
- Test common flows: loading app, fetching proposals, connecting wallet.

## Wallet / XSS considerations

- Ensure any dynamic text (proposal titles, descriptions) is escaped before being injected into HTML contexts.
- Prefer rendering as text nodes in React instead of using `dangerouslySetInnerHTML`.
