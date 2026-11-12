# BP-15 — Pinned OAuth authorization-server metadata and JWKS rotation

Status: SOURCE ONLY. Neither a live authorization service nor remotely deployed MCP. New Node module: server/mcp/trusted-jwks.mjs. Synthetic test: tests/bp15_trusted_jwks.test.mjs. Built on BP-15 PR #131's cryptographic access-token verifier.

## Explicit issuer and key-location pins

The future owner-approved deployment must configure the exact canonical HTTPS authorization-server issuer and an independently reviewed exact JWKS URI. The loader derives the RFC 8414 /.well-known/oauth-authorization-server metadata path before the issuer's optional tenant path and requires that the returned metadata issuer and jwks_uri match the pinned configuration, character-for-character. It rejects signed_metadata because this adapter does not verify signatures on that optional metadata. JWT headers, including kid, jku and x5u, cannot determine a URL.

## Restricted transport and key validation

The default Node fetch is dormant until loadJwks is called. The adapter requires HTTPS, no IP literals, localhost, .local or .internal hosts, userinfo, query, fragment or non-default port. GET disables redirects, credentials and HTTP cache and uses a bounded deadline, exact response URL when present, status 200 and JSON content type. Metadata is capped at 16 KiB and JWKS at 64 KiB WHILE streaming, not just via Content-Length. Every JWK (including unselected keys) must be unique-kid, public RSA, RS256, signing-only, exponent AQAB, and 2048–8192 bits; secret fields and duplicate kids are denied. Key sets are frozen and the generic error MCP_JWKS_DENIED never leaks URLs, claims or keys.

Hostname checks cannot exclude DNS rebinding. Any future hosted network adapter MUST additionally prohibit private/reserved IP resolutions and unauthorized egress at the network level. Mock tests do not establish production DNS, DNS pinning or TLS acceptance.

## Cache freshness and rotation

A verified metadata plus JWKS pair is cached together for a bounded TTL (default 60s; max 5min); concurrent first-use or refresh requests share a single in-flight fetch. On expiry or failed refreshing, NO stale-key fallback is accepted. An unknown pre-auth kid may trigger one pinned refresh per cooldown (default 60s, min 1s), never arbitrary URLs or fetch storms. A signing-key removal can remain effective in a previously verified cache until TTL; emergency key compromise may require invalidating the cache or taking the endpoint offline. Regular short-lived OAuth Bearer access tokens remain reusable until expiry/revocation, while one-time proof replay checks remain separate.

## Composition and remaining approvals

The existing issuer and resource-bound createMcpJwtAccessVerifier receives createPinnedIssuerJwksLoader(...).loadJwks. Its verified claims feed the existing read-only createPrivateMcpReadBoundary, which already rejects owner-ID overrides and fields from unrelated tenants. Durable consent/revocation store adapters are NOT implemented here and remain mandatory. No remote fetch is invoked by this PR or CI; synthetic Response mocks exercise all transport contracts.

Before a live connector: separate owner approval of issuer/resource, OAuth 2.1 PKCE S256 and RFC 8707 resource parameters, RFC 9728 protected-resource metadata, RFC 8414 discovery and TLS/egress, grant consent UI and revocation, multi-instance durable token and proof state, real delegated RLS data access, two-account isolation, rate limiting, staging and rollback. No Supabase service-role key or direct token passthrough.

Tests: Node synthetic issuer metadata including tenant path, signed JWT through the existing read boundary, concurrent first-use single flight, bounded unknown-kid rotation, TTL expiry, failed metadata or JWKS, mismatched issuer and URI, redirects/oversize/bad MIME, private and duplicate keys, owner override denial and non-reflective error. Verify through all four required exact-head GitHub checks.

References: RFC 8414 https://www.rfc-editor.org/rfc/rfc8414 ; RFC 9068 https://www.rfc-editor.org/rfc/rfc9068 ; RFC 8725 https://www.rfc-editor.org/rfc/rfc8725 ; RFC 8707 https://www.rfc-editor.org/rfc/rfc8707 .

Rollback: revert this source PR. No hosted data, secret, production, staging or version migration.
