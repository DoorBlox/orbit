# BP-15 — MCP Streamable HTTP 2026-07-28 request admission

**SOURCE ONLY. Not a live HTTP endpoint, remotely usable MCP connector or deployed service.** Module: server/mcp/http-admission.mjs. Synthetic tests: tests/bp15_http_admission.test.mjs.

Primary specification: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/streamable-http.mdx
Error codes and request metadata schema: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts

## Exact read-only subset

The offline gate handles only POST JSON-RPC tools/call requests for the three existing MCP_READ_TOOLS names: list_branches, search_tasks, get_task. It deliberately does not claim full MCP interoperability. Full server/discover, tools/list, response/SSE streams, subscriptions, capability metadata, resources, prompts, notifications and tool writes need separate implementation and security review. No HTTP listener, route, token issuer or background network request was added.

The 2026-07-28 transport removed the standalone GET stream endpoint, protocol-level sessions and Last-Event-ID resumability. Legacy GET/DELETE and other methods fail HTTP 405; obsolete incoming Mcp-Session-Id and Last-Event-ID fields are ignored, never used as session or resume state.

## Admission-and-dispatch interface

Construct createMcpStreamableReadAdmission({allowedOrigins,invokeReadBoundary,endpointPath:'/mcp',maxBodyBytes:65536}). Supply the already-configured createPrivateMcpReadBoundary(...).invoke function as the dispatcher. It MUST in turn invoke the merged issuer/audience-bound RSA JWT verifier and atomic grant_epoch consent/revocation authorizer. The gate is not itself a signature verifier and must never be connected to a raw dataSource.

Invoke with {method:'POST',path:'/mcp',headers:[['Header','raw value'], ...],body:Uint8Array}. The future HTTP host MUST preserve raw uncombined header pairs; already-normalized Headers/Map/plain objects are rejected because duplicates can be collapsed into ambiguous comma-separated values. The body must be the exact incoming bytes. Success passes only a frozen authorization/name/arguments tuple to the verified owner-private read boundary; no bearer token or private row is printed.

Origin allowlist is exact canonical HTTPS origins only. A supplied invalid origin, including null or lookalike hosts, fails HTTP 403, even on a GET. Missing Origin is allowed for authenticated non-browser clients (as the official specification permits), but does NOT bypass Bearer signature verification or fresh grant/revocation checks. Host, proxy forwarding, TLS and DNS-rebinding egress protections remain obligations of any future real HTTP adapter.

Every POST must list both application/json and text/event-stream in Accept with positive quality, and use application/json Content-Type (optional UTF-8 charset). Compressed and transfer-encoded bodies are not supported by this narrow raw-byte contract. The gate limits body bytes to at most 64 KiB, verifies optional Content-Length against raw bytes, disallows duplicate HTTP headers by case-insensitive name, requires valid field characters and rejects malformed UTF-8.

Version header MCP-Protocol-Version must be exactly 2026-07-28 and match params._meta['io.modelcontextprotocol/protocolVersion']. Mcp-Method must equal the JSON-RPC method, and Mcp-Name must equal params.name after decoding a canonical, bounded UTF-8 Base64 sentinel of the form =?base64?...?= when present. The read tool definitions have no x-mcp-header annotations, so unsolicited Mcp-Param-* fields are rejected. Any future annotated parameter tools need a separate spec-conformant mirrored-field validation change.

A bounded lexical scan rejects duplicate decoded JSON member names at every object depth before JSON.parse checks syntax; this includes Unicode escape aliases. Array/batch payloads, JSON-RPC results, notifications (none are defined as client-sent by the core 2026-07-28 HTTP revision), malformed IDs/params, unsupported methods, task writes and journal names are denied.

## Non-reflective error contract

McpHttpAdmissionError exposes message MCP_HTTP_DENIED, numeric httpStatus and rpcCode, and only the supported/requested version pair for unsupported versions. The future HTTP adapter must construct JSON-RPC error envelopes without reflecting JWTs, body fragments, owners or SQL errors. Invalid Origin -> 403. Unsupported verb -> 405. Missing/mismatched required mirrored fields -> HTTP 400 HeaderMismatch -32020. Unsupported version -> HTTP 400 UnsupportedProtocolVersion -32022 with supported list. Unknown RPC method -> HTTP 404 Method not found -32601. Credential and read-boundary errors fail generically.

## Tests and remaining approval gates

Fourteen synthetic test groups include real ephemeral RSA-2048 access-token validation through the existing atomic grant and read-only projection, repeated Bearer reads, Origin/no-Origin policy, disallowed methods, version/header mismatches, encoded Mcp-Name, case-insensitive duplicate headers, status/media-types/byte limits, hostile and Unicode-aliased JSON members, wrong RPC shapes, foreign-owner JWT, and non-reflective downstream errors. Run node --test tests/bp15_http_admission.test.mjs and require all four exact-head CI checks before any source merge.

Before activation, separately obtain owner approval for full OAuth 2.1 PKCE/consent/client registration, real delegated RLS and persistent multi-instance grant/revocation, hosted egress and request limits, fully interoperable MCP discovery and response/SSE handling, signed-in two-account private-data tests, protected staging and Production deployment. No hosted Auth/SQL/Storage mutation, service-role client, paid service or Production release is authorized by this source change.

Rollback: revert the focused source PR; no customer data, hosted settings or deployment identity was changed.
