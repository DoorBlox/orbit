# BP-15 — Persistent-grant bridge into synthetic PKCE and real localhost MCP

**Source-only, disposable acceptance — NOT a remotely usable OAuth server, hosted grant DB, real user session, OAuth consent UI or Production deployment.** This milestone builds on merged [#167](https://github.com/DoorBlox/orbit/pull/167) and [#162](https://github.com/DoorBlox/orbit/pull/162).

## Reproduce

`node --test tests/bp15_durable_pkce_mcp_integration.test.mjs`

Five integration suites create private `mkdtemp` directories and random HMAC keys, open the real `createDisposableGrantLedger`, start the real loopback-only `startLocalMcpFixture({trustedGrantStore:ledger})`, and exercise PKCE S256 code exchange plus rotated refresh through **actual HTTP POST** to the existing owner-private MCP read boundary.

## Bridge contracts

`startLocalMcpFixture({trustedGrantStore})` uses only the injected committed `readAuthorizationSnapshot` instead of its default in-memory mock. This is opt-in: all existing tests continue using the old synthetic fixture. When the trusted store is injected, pre-minted demo tokens are **disabled**, legacy in-memory `revoke`/`regrant`/`tokenFor` helpers explicitly throw, and the fixture exposes test-only `trustedIssueForEpoch(ownerLabel,committedEpoch)` and immutable `grantIdentity` for a **trusted local harness only**. The signer can mint a JWT for a passed epoch, but the downstream independent ledger verifier will reject it unless that exact epoch is current and authorized. Never let an HTTP client select the label, epoch or signing key.

`createDurableLocalPkce({fixture,ledger})` provides **asynchronous trusted-harness methods** `authorize`, `exchange`, `refresh` and `disconnect`. Authorize requires explicit synthetic consent, pinned client ID and loopback callback URI, exactly `tasks:read`, random `state` and S256 code challenge. It commits consent and the incremented epoch before issuing a 60-second, one-use code. Exchange consumes code before verification, requires matching fixed client/redirect and constant-time S256 proof, checks the current committed grant snapshot, atomically creates a hashed persisted refresh token, and only then signs the RSA short-lived access token for that committed epoch. Refresh rotates **in the persisted ledger** and signs a token for the returned epoch. Disconnection commits a revoke/epoch bump. Failures return only `OAUTH_FIXTURE_DENIED`; no bearer codes or token contents are emitted by logging.

The integration checks two independent synthetic owners, private tasks/branches and foreign task-ID isolation; epoch revoke/reconsent; refresh rotation **after opening a second adapter**, replay attack invalidating only the correct owner's current epoch; simultaneous use of one refresh credential across two adapters; missing/bad proof and client/redirect/scope escalation; and fail-closed real MCP requests and refresh when the store is locked/outage. Filesystem cleanup is restricted to the exact test-owned temp directory.

## Unimplemented / owner gates

- The authorization decision receives a **trusted test-supplied owner label**, not a verified signed-in browser session. No `/authorize` or `/token` HTTP endpoint is activated or exposed; browser session, CSRF-bound consent, redirect registration and client identity proof are absent.
- Auth codes are ephemeral in-memory and intentionally invalid across PKCE helper restart. Refresh and grant state do survive adapter reopening, but the local RSA signer is generated per `startLocalMcpFixture` start. No process-wide key rotation/signing-key durability or distributed HA is demonstrated. Reopening a ledger during a running fixture is not the same as restarting the full MCP process.
- The store is a single-machine POSIX/HMAC/fsync proof and not Supabase SQL/RLS. A hosted connector must have an atomic owner/client/resource/JTI and refresh schema, proper delegated user RLS and client restriction across every table/Storage path, and secure deletion/recovery policies. Coordinate W1 database work and W3 accessible consent/revoke UI; never use a service-role bypass.
- Future W4 work: synthetic **authenticated owner session** and a loopback OAuth HTTP token/consent route; full RFC 8414/9728 and real official MCP SDK OAuth provider/Inspector integration; standalone process restart with explicit key rotation and persistence. Separately gate hosted OAuth, credentials, public endpoints, paid services, staging and Production.

**Rollback:** revert source PR. No hosted persistent state or real user data was changed.
