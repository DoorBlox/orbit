# BP-15 — Tenant-bound durable consent/revocation decision contract

**Source-only, no hosted database changes or OAuth connector activation.** This implementation composes the previously merged signed JWT verifier with a single-store-read grant authorization contract. Files: `server/mcp/grant-decision.mjs`, `server/mcp/jwt-access-verifier.mjs`, and `tests/bp15_consent_revocation.test.mjs`.

## Security decision model

The original BP-15 verifier accepted two callback ports, `isRevoked` and `hasConsent`. Those remain supported for source compatibility, but separate reads can observe inconsistent states across a simultaneous consent withdrawal, token revocation, or reconsent. The **recommended future hosted mode** is `createMcpJwtAccessVerifier({issuer,resource,loadJwks,authorizeGrant})` where `authorizeGrant=createMcpGrantAuthorizer({readAuthorizationSnapshot})` provides one boolean result from one committed authorization snapshot.

A token in this mode MUST carry a **signature-verified integer `grant_epoch`** in the range 1–2,147,483,647. The issuer has to mint it from a durable monotonically incremented grant generation. The new verifier rejects tokens missing or forging the epoch, and rejects simultaneously configuring the old two-hook mode. Bearer tokens remain reusable until expiry/revocation; token ID (`jti`) is not consumed on the first read. All other JWT cryptographic, issuer, audience, role, scope, short expiry, DPoP `cnf` rejection and native read-only tool policies remain unchanged.

## Persisted decision read contract — proposed, not a migration

The trusted `readAuthorizationSnapshot` adapter receives ONLY the tuple `{issuer,resource,ownerId,clientId,tokenId}` taken from verified JWT context; never a request argument or arbitrary owner filter. It MUST read the matching owner grant and token-specific revocation status from **one strongly consistent committed store snapshot/transaction**, returning precisely the following scalar projection (no user/private content, raw tokens, rows from other tenants or secrets):

`{issuer,resource,ownerId,clientId,tokenId,grantEpoch,status,scopes,grantedAt,consentExpiresAt,consentRevokedAt,tokenRevokedAt}`.

Expected types: `grantEpoch` a positive monotonically incremented int; `status='active'`; `scopes=['tasks:read']` exactly; `grantedAt` and `consentExpiresAt` Unix seconds; `consentRevokedAt` and `tokenRevokedAt` either NULL or a revocation timestamp. A valid authorization must still be active, not expired, not withdrawn and not individually revoked, and its epoch must match the signed token's epoch. A grant reauthorized after withdrawal **increments** its epoch; it never reactivates old tokens. Revoking one `jti` does not revoke another token, but revoking the consent denies every token under the grant. A different issuer/owner/client/resource/token tuple or extra/missing projected field denies access.

This module does **not** create tables, migrations, Supabase clients, RLS policies, writes, token storage, authorization sessions or a real adapter. W1 must review the future table/index/RLS design. It must enforce a uniquely keyed tuple per issuer+resource+owner+client and token-specific status; any RPC/query must be parameterized, owner-delegated and keep revocation+consent in one database snapshot. W4 must verify actual hosted isolation only after separate owner approval.

## Concurrency and revocation ordering

The decision function fetches a new committed snapshot **on every request** (no positive caching), validates the entire result and returns strictly boolean true or false. Missing rows, malformed projections, expired grants and errors are fail-closed. The outer JWT verifier emits only `MCP_TOKEN_DENIED`, not internal storage/owner details.

**Linearization assumption:** If a revoke commits before the snapshot is acquired, that request is denied. A request that was authorized from an earlier committed snapshot may complete *after* revocation; this is not a guarantee of immediate cancellation of in-flight reads. For a stronger requirement, the future read-only data fetch must be protected by RLS/owner authorization and ideally performed in the **same database transaction** as the grant read or rechecked at response time. A distributed storage/cache adapter that does stale eventual-consistent reads violates the source contract, even if these synthetic tests pass.

## Tests and rollout

Synthetic tests generate ephemeral RSA-2048 JWTs and cover signed grant epochs, backward-compatible legacy mode, tuple isolation across two owner IDs, exact scopes, grant expiry, consent revocation, token-specific revocation, epoch invalidation after reconsent, read consistency under concurrent revoke, invalid storage responses and generic errors, signature/role/scope attacks and integration through the existing read-only MCP boundary.

Test-first: PR #140 initially opened in draft with failing tests before implementation. CI on the **final** exact head must pass all four required checks. No production/staging/cloud migrations or user data access. Rollback independently reverts this source PR without altering user backup data or Production.

**Remaining approval gates:** OAuth 2.1 PKCE with owner consent UI (W3), durable grant/revocation implementation and multi-tenant RLS (coordinate W1), anonymous/private denial on real two-account staging, hosted egress and JWKS DNS policy, HTTP MCP request replay/rate limiting, protected staging approval and Production promotion require separately scoped owner consent. Do not use Supabase service-role credentials for owner data.

References: RFC 9068 https://www.rfc-editor.org/rfc/rfc9068 ; RFC 9700 OAuth security BCP https://www.rfc-editor.org/rfc/rfc9700 ; RFC 8707 resource indicators https://www.rfc-editor.org/rfc/rfc8707 .
