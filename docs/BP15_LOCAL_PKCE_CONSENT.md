# BP-15 — Disposable S256 PKCE / consent / refresh / revoke acceptance

**Test-only source, not an OAuth HTTP authorization server and not a hosted connector.** The module `server/mcp/local-oauth-pkce.mjs` composes the already-merged `startLocalMcpFixture` synthetic RSA JWT/grant_epoch read boundary. No real account, credential, network OAuth provider, database, email, UI, public listener or paid service.

## Execute

`node --test tests/bp15_local_oauth_pkce.test.mjs`

Tests use two independent synthetic owners and POST signed bearer access tokens to the real 127.0.0.1 MCP fixture for read-only `tools/call`. They exercise explicit consent/deny, fixed client+loopback redirect, exact tasks:read, PKCE S256 SHA-256 verifier challenge, random authorization code, 60-second expiry, single-use code and client/redirect binding; issued access tokens are short-lived and still checked against active signed grant_epoch. Refresh credentials are random, SHA-256-keyed in memory, rotate on every use, and reuse of an older credential revokes the owner's current grant generation. Explicit owner disconnect immediately blocks subsequent MCP reads and refresh. Reconsent bumps the grant epoch so earlier tokens never revive. Foreign owner activity remains independent.

**Security boundary:** Only *trusted test code* may call `authorize({owner,consent:true,...})`; there is NO HTTP /authorize handler and NO proof of signed-in owner identity, browser CSRF/session validation, real consent UX or arbitrary registered client. The fixture uses a pinned synthetic client ID and redirect URI. Never expose the method as a remote endpoint or treat owner labels as authenticated identities. Client-side `state` validation is simulated by checking the exact returned state in tests; the server's echo alone cannot provide CSRF protection.

All errors use generic `OAUTH_FIXTURE_DENIED`; no code/token must be logged. No `service_role` or bypass of the downstream cryptographic/JTI/grant/owner projection is introduced. Tokens cannot be pasted into public clients. Source revert rolls everything back.

## Outstanding gates, explicitly NOT completed

A real provider remains unimplemented. It needs authenticated owner sessions, browser-verified state, redirect URI/client registration/CIMD, secure consent UI owned by W3, RFC 8414/9728 discovery, refresh-family persistence and expiry, atomic durable owner grant/revocation with transactional consistency (W1 SQL/RLS), CSRF/mix-up protection, structured OAuth errors, key rotation and independent signed-in A/B acceptance. Current refresh and code ledgers are **in-memory** and not durable across worker restarts. The next milestone is a disposable, fail-closed file/DB grant store and a real local HTTP token endpoint with appropriately authenticated owner-consent harness, before any owner-approved hosted project change.

Supabase OAuth 2.1 Public Beta does not automatically satisfy ORBIT's strict `RS256 typ=at+jwt`, `tasks:read`, resource audience, `grant_epoch`, and client_id-restricted RLS. See `docs/BP15_OAUTH_PROVIDER_DECISION.md`. Do not weaken issuer/scope/epoch checks or grant journal/media access to accommodate a provider token. W1 owns real SQL/RLS, W3 consent UI, W4 source security, Command HQ authorization of hosted activation.

Specifications: https://www.rfc-editor.org/rfc/rfc7636 ; https://www.rfc-editor.org/rfc/rfc9700 ; https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization .