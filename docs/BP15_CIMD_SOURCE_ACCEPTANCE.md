# BP-15 — HTTPS URL Client ID Metadata Documents: pinned zero-egress source acceptance

**Source-only; not a hosted OAuth authorization server or general-purpose CIMD URL fetcher.** This document supersedes the older "CIMD not implemented" limitation only for an explicitly configured disposable test fixture. General public client registration and Production hosting remain out of scope.

## Standards and implementation choice

Reference: [MCP 2026-07-28 Client Registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration), [MCP authorization security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations), [OAuth Client ID Metadata Document draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document).

CIMD's client identifier **is the full HTTPS URL**, not an opaque alias. A client using the published official MCP TypeScript SDK v2.4.0 may set `OAuthClientProvider.clientMetadataUrl` without pre-registering its identity. The auth server must fetch and verify that the JSON document's `client_id` string equals the requested URL and that `redirect_uris` contains the **exact** requested callback. MCP auth-server metadata advertises `client_id_metadata_document_supported:true` only when CIMD is genuinely available. PKCE S256 and `tasks:read` remain mandatory; owner and resource trust decisions are independent of the remote client name.

This experiment uses **only an in-process Map** keyed by exact trusted HTTPS client URLs. `createPinnedCimdRegistry({documents,trustedOrigins,allowedRedirectUris})` refuses non-HTTPS IDs, literal IPs, localhost/loopback URLs, fragments, queries, credentials, ports, arbitrary origins and unexpected document fields. It performs **no fetch**, DNS resolution, proxy, sockets, network redirect or network access at all. The test harness models a trusted HTTPS-hosted document's JSON without implying it was fetched over a live TLS connection. The allowed domains, documents and redirect URIs must be supplied by trusted test setup. The registry's positive result is a per-request validation, not a security approval of all URLs on that domain.

## Local test wiring

- `startLocalMcpFixture({loopbackDiscovery:true,trustedGrantStore,cimdClientId})` selects the opted-in genuine HTTPS client ID for the synthetic read-only MCP fixture. It still binds only `127.0.0.1:<ephemeral>` and publishes a local HTTP issuer and `/mcp` resource. This local issuer is **not** being described as a hosted HTTPS authorization server.
- `createDisposableGrantLedger({allowLoopbackHttp:true,allowCimdClientIds:true,...})` and the JWT/grant verifier enable that exact URL-form identifier only by explicit local configuration. Normal consumers still reject URL IDs by default. The token's `client_id`, ledger owner/client row and JTI authorization all use the **same exact string**.
- `startLocalOAuthHttpFixture({fixture,ledger,cimdRegistry,...})` advertises CIMD support only in URL-client mode, reads and validates the pinned JSON document before consent and again before approval/token redemption, uses the exact configured callback, and displays the client name and localhost callback host. Existing static-client flow continues to advertise CIMD false.
- There is no DCR endpoint, registration database, network metadata downloader or Supabase service access.

## Security tests and claim limits

Run offline unit tests:

```bash
node --test tests/bp15_cimd_registry.test.mjs
```

The separate pinned `mcp-sdk-v2` CI workflow transiently installs `@modelcontextprotocol/client@2.4.0` and runs `tests/sdk/bp15_official_cimd_v2.test.mjs` with the existing official SDK suites. It verifies SDK-supplied URL client ID, automatic 401 discovery, RFC 8414 and RFC 9728 metadata, S256 authorization, host-checked state/iss before `finishAuth`, signed JWT client ID, A/B tasks-only isolation, refresh and revocation. Adversarial tests replace trusted JSON with mismatched identities/redirects and probe private/foreign URLs, wrong scope and mid-consent metadata changes. These are synthetic tests, not a real-world provider conformance certificate.

**Production blockers:** A real HTTPS client-document network adapter still needs a purpose-built, independently audited SSRF policy: resolve and block **all** special-use IPv4/IPv6 addresses at each connection, resist DNS rebinding by binding the verified address to TLS while retaining hostname/SNI/certificate verification, disable redirects and proxy bypass, enforce origin+port and maximum response size/content-type, bound timeouts/concurrency, and use a strict egress firewall. Trust-policy, cache-staleness and client-document changes before refresh need authorization-server design. Full owner browser auth, secure cookies, persistent signed sessions/PKCE codes/keys, durable user-delegated SQL/RLS/Storage and actual account/device acceptance require separately scoped owner approval.

**Never expose the fixture's `mintSyntheticSession`, test signing keys or memory document registry as a public/hosted OAuth service.** Owner, W1 delegated RLS and W3 consent UX gates remain in [issue #32](https://github.com/DoorBlox/orbit/issues/32).
