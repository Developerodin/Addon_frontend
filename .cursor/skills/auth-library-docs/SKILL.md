---
name: auth-library-docs
description: Grounds authentication work in official JWT, Passport.js, and NextAuth/Auth.js documentation and common security baselines. Use when implementing or reviewing login, sessions, JWTs, OAuth, API auth, middleware guards, token storage, or refresh flows; when the user mentions auth, JWT, Passport, NextAuth, Auth.js, cookies, or token security.
---

# Auth library docs and secure token handling

## Authority order

1. **Stack in use**: Match the project’s actual library (Passport, NextAuth/Auth.js, `jose`, `jsonwebtoken`, framework middleware, etc.) to its **current** official docs—not generic blog posts or copy-pasted snippets.
2. **JWT concepts**: Use [jwt.io/introduction](https://www.jwt.io/introduction) for structure and terminology; treat **jwt.io Debugger** as a *tool*, not a security spec.
3. **Passport**: [passportjs.org](https://www.passportjs.org/) (strategies, sessions, middleware ordering).
4. **NextAuth / Auth.js**: [next-auth.js.org](https://next-auth.js.org/) for the installed major version; **v5** aligns with [Auth.js](https://authjs.dev/)—use the version that matches `package.json`, not both interchangeably unless migrating.

When behavior is ambiguous, open the official page for that API instead of guessing.

## Security defaults (any stack)

- **Verify on the server**: JWTs must be **verified** (signature + allowed algorithms + issuer/audience as applicable) where trust is established—typically the API or server middleware. **Decoding without verification is not authentication.**
- **Secrets**: Never put signing secrets, client secrets, or private keys in client bundles, env vars exposed to the browser, or committed files. Use server-only configuration.
- **Algorithms**: Do not accept `"alg": "none"` or switch algorithms based on untrusted header fields. Prefer explicit allowlists (e.g. HS256 vs RS256) per library docs.
- **Storage tradeoffs**:
  - **HttpOnly, Secure, SameSite cookies** (often with CSRF protection for state-changing routes) are the usual choice for **browser** session or refresh tokens when XSS is a concern.
  - **`localStorage` / `sessionStorage` for access tokens** increases XSS blast radius; only use if the threat model and mitigations are intentional and documented.
- **Lifetime and rotation**: Prefer short-lived access tokens and **rotation** for refresh tokens where the stack supports it; follow the chosen library’s session/refresh patterns.
- **Claims**: Validate `exp`, and use `nbf`/`iat` when appropriate; never trust client-supplied role/permission claims without server-side checks.

## Anti-patterns to avoid

- “We checked the user” by **base64-decoding** the JWT payload on the client (or server) **without signature verification**.
- Storing **refresh tokens** in places readable by JS if the app is a typical SPA threatened by XSS.
- **Logging** full tokens, cookies, or secrets.
- Custom crypto (rolling your own JWT implementation) instead of maintained libraries.
- Mixing **NextAuth v4** and **Auth.js v5** patterns in the same codebase without a deliberate migration.

## When implementing

- After choosing the mechanism (session cookie vs JWT bearer vs OAuth), follow that library’s **recommended session/callback** and **middleware** placement (Passport: strategy order and `session()`; NextAuth: `auth()` / route handlers as per version docs).
- Add **JSDoc** to new auth helpers (parameters, return shape, side effects like cookie mutation).

## Additional reference

For link map, version notes, and a short verification checklist, see [reference.md](reference.md).
