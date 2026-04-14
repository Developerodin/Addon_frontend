# Auth docs — reference map

## Official entry points

| Topic | URL | Notes |
|--------|-----|--------|
| JWT intro | https://www.jwt.io/introduction | Claims, structure, when to use |
| JWT debugger | https://www.jwt.io/ | Decode/verify *with a known secret* for debugging only |
| Passport.js | https://www.passportjs.org/ | Strategies, `authenticate`, sessions |
| NextAuth.js | https://next-auth.js.org/ | Match installed major version |
| Auth.js (NextAuth v5 lineage) | https://authjs.dev/ | Use when the project uses `next-auth@5` / `@auth/*` |

## Related hardening (when threat modeling)

- OWASP **JWT Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html  
- OWASP **Session Management**: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html  

## Quick verification checklist (server)

- [ ] Signature verified with correct secret/key and **allowed algs**
- [ ] `exp` enforced; clock skew considered if documented for the library
- [ ] `iss` / `aud` checked when the issuer defines them
- [ ] Authorization (roles/scopes) enforced **after** authentication, using server-trusted data

## Frontend vs backend

- **Browser**: Minimize secret and long-lived credential exposure; prefer patterns from NextAuth/Auth.js or your BFF/API layer docs.
- **API**: Centralize verification in middleware or a single auth module; avoid duplicating fragile parse logic across routes.
