# BP-15 — Runnable read-only localhost MCP vertical slice

**Source/local only — not deployed, not an OAuth provider, not connected to ChatGPT.** This milestone responds to [issue #32](https://github.com/DoorBlox/orbit/issues/32) Command HQ direction to produce a working read-only MCP flow instead of another isolated RFC.

## Reproduce

From the repository root (Node 22+):

```sh
node scripts/demo-local-mcp.mjs
node --test tests/bp15_local_mcp_http.test.mjs
```

The demo starts a synthetic MCP HTTP service bound **only** to `127.0.0.1` on an operating-system-assigned ephemeral port, sends real HTTP requests for `server/discover`, `tools/list`, and `tools/call` (`search_tasks`), prints sanitized tool names and a synthetic result count, and shuts the listener down. It never displays or persists its throwaway bearer token, changes user data, or contacts Supabase. The tests start a fresh server per case and close all listeners.

## Implemented vertical path

- `server/mcp/http-admission.mjs` extends the previously reviewed strict 2026-07-28 raw-header parser with a validated, authenticated **inspect** method for `server/discover` and `tools/list`. Its original `invoke` remains restricted to three private read-only `tools/call` names. The parser still checks exact supplied Origin, mirrored version/method/name, JSON grammar and duplicate keys, bounded sizes, required Accept/Content-Type and Bearer syntax.
- `server/mcp/mcp-http-handler.mjs` produces MCP 2026-07-28 JSON-RPC response envelopes with `resultType:complete`, `supportedVersions`, `capabilities.tools`, `tools` definitions with JSON schemas, and read-only text-content results. Metadata requests MUST still cryptographically verify the JWT and the current atomic `grant_epoch` consent/JTI decision; they never expose private task rows. Tool calls additionally route through the verified `createPrivateMcpReadBoundary` immediately before the read. Errors have bounded nonreflective JSON-RPC shapes and no tokens/SQL/rows.
- `server/mcp/local-fixture.mjs` generates ephemeral RSA-2048 keys, two isolated synthetic UUID owners, private synthetic branches/tasks, matching short-lived `at+jwt` credentials, two coherent in-memory synthetic grant/JTI projections, owner/client-specific request quota and actual Node HTTP transport. Host must be the exact loopback address and ephemeral port. No externally accessible listener or stored private user data is involved.
- `tests/bp15_local_mcp_http.test.mjs` sends real wire-level MCP 2026-07-28 POST requests through `fetch`, with request metadata and mirrored headers. Tests cover discovery, three tool descriptions, A/B private reads, access token invalidation after revoke/regrant, per-token revocation, forged/missing credentials, Origin/Host spoofing, wrong version/method, GET/unsupported RPC, arbitrary owner arguments, malformed/oversized requests and per-owner rate limits.
- `scripts/demo-local-mcp.mjs` is the one-command reproducible synthetic demonstration. It binds only loopback and never prints credentials.

**Important caveat:** the network tests use a *hand-authored standards-shaped HTTP test client*, not a successful connection with the published MCP SDK v2, MCP Inspector, or ChatGPT. End-to-end third-party interoperability remains to be verified; the published SDK v2 is the preferred integration target. This proof deliberately avoids new package and lockfile dependencies while exercising the real HTTP and cryptographic boundary. A live server must use a maintained SDK or obtain independent complete protocol compatibility verification.

## Remaining hosted integration gates

Supabase's currently documented OAuth 2.1 Server (Public Beta) offers authorization-code + PKCE and refresh flows, but its **documented custom scopes are not supported**; OAuth access tokens can inherit normal user data access until RLS rules bound client access. ORBIT's current signed `at+jwt`, exact resource audience, `tasks:read` and `grant_epoch` contract is therefore NOT automatically compatible with a Supabase OAuth token. Do not relax these checks to make live login pass. See [BP15_OAUTH_PROVIDER_DECISION.md](BP15_OAUTH_PROVIDER_DECISION.md).

Next source milestone should use an official modern MCP v2 client against the loopback path, and finalize real per-user Supabase JWT/RLS adapter and consent UX contracts with W1/W3. Hosted OAuth enablement, signing-key settings, dynamic registration, consent UI, SQL/RLS, hosted Functions, public HTTPS/ChatGPT connector, protected staging and Production remain separate owner approvals. A disposable test does not satisfy signed-in two-account privacy acceptance.

References: [MCP Streamable HTTP 2026-07-28](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx); [MCP server discovery](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/discover.mdx); [MCP tools](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx).

Rollback: revert this source PR; ephemeral in-memory fixture state is discarded when the process exits.
