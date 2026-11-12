# BP-15 — Disposable persistent owner-grant + refresh adapter

**Source/local synthetic only. Not a hosted OAuth grant database, not a live Supabase policy, and not suitable for Production.** This implements the persistence contract requested in [issue #32](https://github.com/DoorBlox/orbit/issues/32) as an executable fail-closed filesystem prototype without adding npm packages or touching real users.

## Run

```sh
node --test tests/bp15_disposable_grant_ledger.test.mjs
```

The suite creates its own temporary 0700 directories, random HMAC keys and synthetic owner UUIDs; its only deletions are those exact temporary fixtures. No hosted service, database, Vercel release or project secret is accessed.

## Security and durability contract

`createDisposableGrantLedger({directory,macKey,clock})` uses a **pre-created private 0700 POSIX directory** and **externally supplied 32-byte random HMAC key** (never written to the ledger). `initialize()` writes a one-time signed initialization marker and a signed state file. Every subsequent read or mutation acquires the same cross-instance lock via atomic `mkdir`, verifies file privacy, a separate marker, the complete state MAC and version, and rejects any missing/truncated/corrupted/oversized/wrong-key data. Reads never recreate missing data or return cached positive grants. An abandoned lock denies progress instead of guessing that the prior writer died.

Writes use an exclusive private temporary file, `fsync` the file, atomically rename it over the state, and `fsync` the parent directory before returning. A crash may leave an unreferenced temporary file, which is ignored. The lock intentionally remains if a process crashes while holding it; recovery requires **explicit local operator investigation** and clearing that disposable lock, never an automatic potentially unsafe stale-lock break. Filesystem durability assumes a local POSIX filesystem with reliable atomic same-directory rename and fsync (not NFS/cluster/shared ephemeral serverless storage).

Grant identities are bound to exact `issuer`, `resource`, `ownerId` (UUID), and `clientId`. The only scope is `tasks:read`. `consent()` increments a persisted epoch and invalidates older refresh family/JTI state; `revoke()` increments the epoch on the first disconnect and disables current access and refresh. `revokeToken()` stores only the exact JTI. `readAuthorizationSnapshot()` returns the **12-field coherent** projection expected by `createMcpGrantAuthorizer` from PR #140; it never separately reads grant status and JTI. The authorizer verifies signed `grant_epoch` and denies stale epochs, expired consent and per-token revocation.

Refresh credentials are random opaque 256-bit values and **only SHA-256 digests are stored**. `issueRefresh()` allows one active synthetic family. `rotateRefresh()` serializes exchange under the lock and stores consumed hashes; concurrent duplicate/replay reuse revokes the currently active owner grant via epoch bump, without affecting a different owner. A stale refresh from an earlier re-consent is denied but cannot revoke the newer consent. Bounds on file size, refresh history, JTI history, scope and epoch prevent unlimited growth or integer wrap. Token response values are never logged.

## Limitations and required follow-up

This adapter's caller is a **trusted test harness**, not an authenticated browser session. None of its methods should be mounted directly on a publicly callable HTTP handler. The HMAC validates file integrity against accidental corruption/unauthorized modification **only if the secret remains external**; it does not prevent rollback to a previously valid signed ledger by a privileged filesystem actor. The process mutex is scoped to one local directory and is not a distributed database transaction. Refresh response loss after commit may consume a token without delivering its replacement (fail closed rather than issue again). No claims of live OAuth/PCKE, user session cookies, client registration, redirect management, external signing keys, real Supabase delegated RLS, full recovery/HA or Production are made.

**Next W4 source step:** adapt the already-merged `local-oauth-pkce.mjs` plus `local-fixture.mjs` to consume a suitable durable grant/refresh provider, test crash/restart across real loopback HTTP with the official MCP SDK v2.4.0, then add a loopback-only OAuth token/callback fixture with trusted synthetic session identity. Coordinate W1 durable SQL/RLS and W3 explicit consent/disconnect UX in issue #32. Do not weaken RS256 `at+jwt`, exact issuer/audience/client/scope/`grant_epoch`, per-owner private data projection, or the read-only tool allowlist for Supabase OAuth compatibility.

**Rollback:** revert this source PR. No migrations or hosted state exist.
