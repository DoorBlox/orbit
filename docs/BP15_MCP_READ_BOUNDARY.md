# BP-15 — user-scoped MCP read boundary (source-only foundation)

**Status 12 November 2026: NOT A LIVE CONNECTOR.** This file describes a separately testable **Node.js policy module**, not an OAuth authorization server, publicly deployed MCP endpoint, browser feature, connected ChatGPT tool, or authorized hosted change. See [issue #32](https://github.com/DoorBlox/orbit/issues/32) and [single execution queue](../plans/ORBIT_POST_2_4_EXECUTION.md).

## Why this implementation exists

The user requires an ORBIT connector that reads **only the signed-in user's private branches and tasks**, without revealing journal/media automatically or bypassing Supabase RLS with a service-role key. We cannot safely wire a public endpoint to the existing `load_owner_snapshot` RPC and filter fields afterward: the full private journal and image-rich snapshot would unnecessarily cross the MCP service boundary. The new `server/mcp/read-boundary.mjs` explicitly **does not call the current cloud repository or expose a network listener**.

Implemented capabilities, initially all requiring `tasks:read`:

- `list_branches`: capped owner-bound branches, only `id`, `parentId`, `label`.
- `search_tasks`: strictly validated 2–100-character query and maximum 20 results; restricted fields `id`, `projectId`, `title`, `status`, `dueDate`, `urgency`, `effortMinutes`.
- `get_task`: exact single safe task ID, same fields plus `description` and `criteria`. A missing resource returns `null`.

The module validates **already cryptographically verified** access-token claims for trusted HTTPS issuer, exact OAuth resource/audience identifier, UUID owner identity, expiry/issued-at, authenticated role and granted `tasks:read` scope. Its constructor **requires an injected verifier**. It accepts a Bearer header only and refuses arbitrary `owner_id`, `email`, `path` or other query arguments. It demands every data-source row's owner ID match the verified token owner and maps an explicit output allowlist; malformed, oversized, cross-tenant or unexpected results fail closed to a single `MCP_DENIED` code without reflecting private data, SQL or token contents. No journal read, create/update/delete, bulk export, publishing, browser service-role credentials or HTTP handler exists in this slice.

**Critical limitation:** the provided token verifier and repository adapters are **dependency-injection ports**. A fake or incorrectly implemented verifier or RLS adapter would undermine real security. Six offline adversarial unit tests only prove the local policy properties with synthetic accounts and stub services; they are not end-to-end OAuth security assurance.

## REQUIRED before an actual connector can be exposed

1. Select/approve a real HTTPS remote MCP resource URI and OAuth authorization server. Follow the current [MCP authorization specification (2026-07-28)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/index.mdx): OAuth 2.1 authorization-code + PKCE S256/state, RFC 9728 protected resource metadata, RFC 8414 metadata, client metadata/registration, RFC 8707 `resource` parameter in authorization **and** token requests. Never treat the ordinary Supabase Google-sign-in ID token as an MCP access token. Revocation, expiry, audience-bound JWT signature/JWKS validation, expected scopes and rate limits must work at the network boundary.
2. Implement a **real crypto verifier** using trusted issuer signing keys and clock skew rules. The MCP client token must be issued for **this MCP resource**, never any other service. The MCP token must **not be passed through to Supabase**. Use a separately established user-delegated DB credential/RLS integration, not an app-global service-role client or attacker-selected `owner_id`.
3. Implement **tenant-scoped, bounded read queries** against the real schema (not the full private snapshot), with per-user RLS enforced in SQL and a verified user context. Verify two distinct controlled accounts and anonymous access; ensure lists/search/filter/order/limits are safe and no journal/media rows cross the response. Test tenant swaps at every operation. No public `published_content` projection confusion.
4. Add real HTTP MCP transport with JSON-RPC protocol-level schemas, OAuth discovery and WWW-Authenticate challenge, authenticated authorization and rate limiting, structured nonreflective errors, tracing without tokens or titles, resilient timeouts, and disable switch. Onboard a client only after user-reviewed consent, redirect allowlists, revocation/disconnect and audited live A/B tests.
5. Introduce `tasks:write` separately with fine-grained consent, idempotent create, server-checked revision/CAS on update and write audit history. `journals:read` needs a separately requested opt-in; public publishing/deletion are not implicitly part of tool scopes. Re-check owner acceptance, projected costs and rollback before hosted endpoint/provider/Production changes.

## Tests and dependency boundaries

`tests/bp15_mcp_read_boundary.test.mjs` asserts exact issuer/audience/scope/expiry, no user-supplied identity, missing/poisoned token failure, forbidden write/journal names, strict query limits, cross-owner and malformed response failure, and field stripping. All data are synthetic. The file `server/mcp/read-boundary.mjs` lives outside the client build allowlist and is never imported by the browser, so no extra sign-in payload or changed native spatial UI. Existing private V6 CAS, backup and ten themes are left intact. Offline examples are only policy fixtures, never proof a connected remote MCP server already exists.

References: [MCP OAuth security considerations](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/security-considerations.mdx), [RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700), [RFC 8707 Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707).
