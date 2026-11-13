# BP-15 — Loopback OAuth HTTP acceptance (not a hosted authorization service)

This is a **source-only, disposable synthetic integration** implementing an OAuth authorization-code/PKCE HTTP flow over 127.0.0.1. It composes merged BP-15 signed-JWT/JWKS/MCP boundary, persistent owner grant/refresh ledger (#167), and the S256 PKCE helper (#172). Nothing uses a live user account, Supabase, credentials, paid service or public domain.

## Run

```bash
node --test tests/bp15_local_oauth_http.test.mjs tests/bp15_disposable_grant_ledger.test.mjs tests/bp15_oauth_identifiers.test.mjs
```

The separate `mcp-sdk-v2` GitHub Actions job installs pinned `@modelcontextprotocol/client@2.4.0` in ephemeral CI and runs **both** `tests/sdk/bp15_official_client_v2.test.mjs` and `tests/sdk/bp15_official_http_oauth_v2.test.mjs`. No application package or lockfile is changed.

## Exact test trust contract

`startLocalOAuthHttpFixture({fixture,ledger,refreshBindingKey,clock})` binds only `127.0.0.1` on an ephemeral port; the **only way to create an owner session** is the in-process, trusted test-only `mintSyntheticSession('ownerA'|'ownerB')`. No HTTP login, owner-selector header/query/body, client-supplied subject claim or privileged data source exists. The returned random cookie is a fixture input; it is not evidence of browser authentication. The source documents Strict/HttpOnly flags but the fixture does **not** deliver a real HTTPS browser cookie or implement a hosted login.

- `GET /authorize`: requires a valid unguessable owner session, exact registered `fixture-local-client`, `response_type=code`, `tasks:read`, configured MCP resource, fixed loopback callback, 43-character S256 challenge and `state`. It renders a small, inert HTML form showing the read-only grant and explicit allow/deny. An authorization GET never writes a grant.
- `POST /consent`: requires the same owner session, exact local `Origin`, a single-use unguessable pending-request ID, matching CSRF token and explicit allow/deny. Owner swapping and forged requests fail closed. Denial redirects only `error=access_denied` and the original state. Approval commits a new persisted `grant_epoch`, then redirects with a signed, one-use authorization-code envelope. The client separately compares returned state to its original random state.
- `POST /token`: form-encoded, unique and strictly enumerated parameters. Authorization-code exchange verifies fixed redirect and S256 proof, consumes the code once, and issues a signed RS256 `at+jwt` with exact audience, issuer, client and `tasks:read`. `refresh_token` exchange uses only a server-MAC-bound owner identity and the durable ledger's hash-only refresh rotation, never a client-provided owner. A correctly signed token envelope is a **bearer credential**, not additional authorization beyond the backing ledger.
- `POST /revoke`: given the registered synthetic client ID and a signed refresh-token envelope, calls **atomic** `ledger.revokeRefresh` against the *currently active* owner/client/resource refresh hash. Stale or already rotated refresh credentials cannot revoke a later consent. Response does not disclose whether a token existed; a true storage outage returns an error rather than a false success. No untrusted owner-selection input is accepted.

All endpoints reject wrong Host/Origin and duplicated security headers, enforce a bounded request body, return no CORS permission, set `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, and use generic OAuth error codes. The fixture has a bounded per-minute request quota; credentials are never printed. The server does not accept remote connections and has no startup script or Vercel mapping.

## Verified acceptance scope and remaining gaps

Seven real Node HTTP test groups cover A/B JWT private branches, missing owner sessions, wrong Origin/Host, CSRF/session swap, denied consent, duplicate parameters, wrong client/resource/redirect/scope/PKCE/state, single-use authorization code, refresh rotation after **reopening the OAuth HTTP listener and ledger adapter**, refresh replay revoke, and current/stale bearer revocation. Two official MCP SDK v2 client groups use **real OAuth HTTP-issued bearer credentials** to call only the three private read-only MCP tools and observe revocation. These validate bearer interoperability, **not** the SDK's fully automatic `OAuthClientProvider` discovery/redirect/re-registration behavior.

Still required before a real connector: conformant HTTPS issuer and protected-resource metadata discovery (RFC 8414, RFC 9728), Client ID Metadata Documents, official SDK `OAuthClientProvider` browser callback/automatic refresh testing, production-grade owner login/session/Cookie Secure/CSRF, real client registration and redirect allowlist, durable authorization-code/session replay state, persistent signing keys and independent key rotation, distributed atomic SQL grants and client_id-aware RLS/Storage user delegation, replay/DPoP decisions, revocation history/audit, real two-account owner acceptance and Command HQ security/release approval.

The original standalone fixture's issuer remains `https://synthetic-auth.example.test/tenant`; this is historical behavior and must not be presented as localhost metadata. The new, opt-in `loopbackDiscovery:true` fixture explicitly uses the **same** dynamically bound `http://127.0.0.1:<port>/` issuer and protected `/mcp` resource; the test-only HTTP exception never removes exact JWT issuer/audience validation.

**Rollback:** revert this source PR. All tests remove only their own `mkdtemp` fixtures. No hosted state exists.


## 13 November — localhost discovery and official SDK v2 proof (SOURCE ONLY)

The new opt-in `loopbackDiscovery:true` MCP fixture creates the issuer
`http://127.0.0.1:<ephemeral-port>/` and protected resource
`http://127.0.0.1:<ephemeral-port>/mcp` on the **same** listener.
The signed RS256 token's `iss` and `aud` remain exact strings; a separate
`allowLoopbackHttp:true` switch is required by the disposable ledger.
Default OAuth JWT, grant-decision and read-boundary constructors still reject
non-HTTPS identifiers. There is no global HTTP allowance or hostname aliasing.

The companion `startLocalOAuthHttpFixture` attaches routes only through the
trusted in-process `attachLocalOAuthRoutes` hook. The local-only RFC 8414
`/.well-known/oauth-authorization-server` advertises code + S256,
token/authorization/revoke endpoints, fixed `tasks:read`, and RFC 9207
`iss` callback handling. RFC 9728 protected-resource metadata at
`/.well-known/oauth-protected-resource/mcp` advertises only the exact
local MCP resource and loopback authorization server. An HTTP 401 includes
a Bearer `resource_metadata` challenge for the official client. All
metadata are request-bound to the pinned 127.0.0.1 Host, emitted with
`no-store` and no CORS enablement. No SSRF/dynamic metadata URL exists.

**Client registration decision:** The fixture intentionally uses one
pre-registered, public test client ID `fixture-local-client` and the single
`http://127.0.0.1:8765/oauth/callback` redirect URI, enforced byte-for-byte.
It advertises `client_id_metadata_document_supported:false` and does
**not** claim support for remotely fetched Client ID Metadata Documents.
Implementing CIMD requires a separately verified HTTPS client-document
fetch policy, SSRF-resistant trust model and exact permitted redirects; this
is not being silently replaced by unrestricted dynamic registration.

Actual official SDK v2 `OAuthClientProvider` integration is wired into
`tests/sdk/bp15_official_discovery_oauth_v2.test.mjs`, with initial 401,
discovery, issuer-verified AS metadata, SDK-generated S256 and state, simulated
trusted owner consent, callback state comparison before `finishAuth`,
`iss` callback verification, token exchange, owner A/B isolation, 401-based
refresh and revocation. The official `mcp-sdk-v2` job [43337129344](https://github.com/DoorBlox/orbit/actions/runs/43337129344) completed successfully on exact source head `8ceb389d27760eafa2af99b869455aa0c3cb7ad4`: **12/12 official SDK tests pass**. This is evidence for the disposable local flow only, not real browser login, HTTPS, hosted RLS or owner acceptance. Any subsequent documentation commit requires a fresh exact-head CI check before merge.

Security nonclaims: HTTP loopback is accepted only by explicitly configured
disposable source fixtures and does not establish a production authorization
server, full CIMD client registration, cookie-backed identity provider,
distributed token/code persistence, client_id-constrained Supabase RLS,
owner/device acceptance or a remotely connected ChatGPT MCP integration.
Issue #32 remains OPEN.
