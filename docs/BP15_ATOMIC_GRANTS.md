# BP-15 — Atomic, owner-private MCP consent and revocation decision

**Source-only contract, 12 November 2026. NOT a database implementation, active OAuth connector, Production release, or permission migration.** W4 source: `server/mcp/grant-authorization.mjs`; integrated verifier: `server/mcp/jwt-access-verifier.mjs`; synthetic regression: `tests/bp15_atomic_grant_authorization.test.mjs`.

## Why a single decision matters

The initial BP-15 JWT verifier (PR #131) supported independent asynchronous `isRevoked` and `hasConsent` hooks. If these read different committed revisions during a grant revocation or rescope, both may return apparently favorable booleans even though their combination was never authorized in one state. The new optional `authorizeGrant(context)` path replaces the **pair** with one fail-closed decision. Mixed or partially configured modes are rejected at verifier construction. The original split mode remains for previous offline synthetic callers; **do not deploy it for persistent, concurrently mutable permissions**.

This contract requires additional issuer-signed OAuth access-token extension claims `orbit_grant_id` (RFC 4122-shaped UUID) and `orbit_grant_epoch` (strict positive integer) ONLY in atomic mode. They are consumed **only after** RS256 signature, token type, issuer, audience, identity, expiry and read-only scope verification. Ordinary 15-minute Bearer access tokens remain reusable. They are not converted into one-time tokens, and DPoP `cnf` tokens still fail closed in the Bearer verifier.

## Durable adapter interface for W1 review

`createAtomicMcpGrantAuthorizer({readSnapshot,clock})` returns an `authorizeGrant` hook to inject into `createMcpJwtAccessVerifier({issuer,resource,loadJwks,authorizeGrant,clock})`. The `readSnapshot` function receives only a frozen, verified query:

```js
{issuer, subject, clientId, resource, grantId, jti}
```

It MUST resolve from a **single transactionally consistent committed snapshot** (such as a locked/serializable read or one atomic query with coherently joined grant and token-revocation data) to this normalized projection:

```js
{
  decisionRevision: 9,
  grant: {
    issuer: "https://auth.example.test/",
    ownerId: "12345678-1234-4123-8123-123456789abc",
    clientId: "orbit-test-client",
    resource: "https://orbit-mcp.example.test/mcp",
    grantId: "87654321-4321-4321-8321-123456789abc",
    epoch: 3,
    scopes: ["tasks:read"],
    consentedAt: 1799999900,
    expiresAt: 1800000900,
    revokedAt: null
  },
  token: {jti: "grant-jti-123456789", revoked: false}
}
```

The adapter verifies exact values against the already-signed claims and the trusted resource, including owner, issuer, client, grant ID and current epoch; strict singleton `tasks:read`; consent time no later than token issuance; unexpired grant; revocation timestamp strictly null; exact token JTI and false revocation flag; positive revision. Missing rows, malformed data, incomplete JTI state, database outage, non-boolean substitutions or any mismatch deny without revealing grant or user identifiers. No in-process grant cache or fake production persistence is provided.

**Required future transaction and RLS behaviors (W1 ownership, NOT implemented):** consent grant storage keyed by **issuer, owner ID, client ID, resource, grant ID**; issue grant epochs atomically, and ensure revocation, rescope or disconnect commits a higher epoch and/or revoked timestamp before acknowledging success. JTI revocations must use issuer/owner/grant-scoped IDs. All read/write paths must enforce tenant RLS without a service-role shortcut. Apply least-privilege projection and parameterized queries. Store audit events without bearer tokens or private task data. Single-snapshot decisions are linearizable at their read point only: a task read already authorized **before** a revoke commits might finish. Stronger no-in-flight access would require read+data transactions or request cancellation and explicit new design/release acceptance.

**Consent UI requirements (W3 ownership, NOT implemented):** owner sees identified client, read-only task/branch capability, exact resource audience, expiry, active/revoked state, and controls to disconnect/revoke. Changes must be understandable and accessible, with no journal scope, task writes, publication, or data deletion implied. Reauthorization must create/bump an epoch such that pre-revoke tokens never regain permission merely because consent is later restored.

## Verification performed by synthetic tests

Signed RSA-2048 JWTs exercise actual `createMcpJwtAccessVerifier` and `createPrivateMcpReadBoundary`. Tests confirm per-use atomic authorizer, forbidden owner override/write tools, cross-owner/client/resource/grant substitution, expired or revoked grant, wrong JTI/revocation, signed missing or invalid grant claims, legacy compatibility but no mixed modes, invalid-signature short-circuit, persistence-outage non-reflection, repeated Bearer use, concurrent read vs serializable revoke decision, and separate tenant grants. No hosted SQL, tokens, accounts, URL fetch, or Production dispatch occurs.

The atomic decision path is a *backend dependency contract*, **not proof** that any future Supabase/postgres adapter meets transactional or cross-account RLS properties. Hosted schema, RLS policy, Auth/provider, consent UI, connector registration and Production require separately scoped owner approval and true signed-in two-account evaluation. W1/W3 coordination is recorded on [BP-15 issue #32](https://github.com/DoorBlox/orbit/issues/32).

Rollback: revert the W4 source PR. No hosted data migration or release identity change.
