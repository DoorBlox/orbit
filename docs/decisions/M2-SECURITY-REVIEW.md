# M2 security review

Review date: 1 November 2026 (Asia/Jakarta). Scope: the owner-allowlist migration, private snapshot RPCs, public projection, `src/auth/controller.js`, cloud repository/sync and their integration. This is a focused source and regression review, not a claim of production security or a live OAuth/RLS audit.

Skills applied: `ecc-security-review` and its detailed guide (input validation, sensitive data, auth/authorization, XSS and dependency boundaries); `ecc-coding-standards` and its guide (error handling, single responsibility, maintainable state transitions). Existing vanilla architecture is retained; no generic example framework/security package was added.

## Authorization and exposure findings

- The new allowlist is server-maintained in `private.orbit_configuration`. Authenticated clients cannot read or update it. No signup/email/provider metadata or public owner-ID configuration grants ownership.
- Original per-row owner policies remain in force; new restrictive policies additionally require the configured owner UUID on all seven private tables. `USING` and `WITH CHECK` apply to owner reads and writes. The profile owner field uses `user_id`; other tables use `owner_id`.
- Only two private, read-only boolean helpers use SECURITY DEFINER, with an empty `search_path`. Public RPCs use SECURITY INVOKER. The helpers expose neither configuration rows nor private payloads. A local executable policy/grant test remains necessary; source declarations alone do not prove effective roles/grants.
- Public material is copied only through an explicit publication operation into a separate table whose columns are `id`, `kind`, `title`, `excerpt`, `published_date`, `updated_at`. The private source mapping is separate and unexposed. Public reads default off; enabling the publication gate does not grant access to private tables or mapping rows. An owner must review the source title as well as the chosen excerpt before confirming publication.
- Client repository operations verify Auth with `getUser()`. The root must bind repository `ownerId` to the verified user and keep AuthController's `isCurrent()` lifetime check after asynchronous hydration. Client verification supplements server RLS; it cannot replace RLS.
- Repository errors use generic codes/messages instead of provider errors or private payloads. Unknown public response fields are dropped. Public text must still be rendered with `textContent`, never interpreted as HTML. Journal HTML must be sanitized on every private load/save/import boundary; database storage alone is not sanitization proof.
- `save_owner_snapshot` locks a workspace revision and performs changes in one database transaction. Deferred FK validation is forced before return; errors should roll all table/publication/revision changes back. Direct owner DML also increments revision. Real two-session concurrency and rollback tests are needed in addition to mocked controller tests.

## Confirmed review issue

**P1 — reentrant snapshot application could drop a newer edit.** In the initial sync controller, `discardPendingAndReload()` called `onSnapshot` before clearing the old draft. If that callback queued a new edit, later `pending = null` silently removed it and status became `saved`. A Node fixture reproduced `saved`, `hasPending:false`, `draft:null` after the callback queued a new task. `refresh()` could also label a callback-queued draft saved. Reported to the implementation owner for correction and regression tests; final resolution evidence must be recorded before declaring the queue complete.

## Executed review checks

Run with Node 22.23.4:

- `node tests/cloud_repository.test.mjs`: PASS, 15 tests.
- `node tests/cloud_sync.test.mjs`: PASS, 15 pre-fix tests; they did not cover the reentrancy defect above.
- `node tests/auth.test.mjs`: PASS, 29 tests.
- `node --test tests/auth.test.mjs tests/cloud_repository.test.mjs tests/cloud_sync.test.mjs`: PASS; the restricted command runner reported three file-level results. Direct-file execution above exposes the full subtest totals.
- Inline Node reentrancy diagnostic: reproduced the defect. No browser or remote service was used.

The migration/test SQL was inspected; this reviewer has not executed a database. Local SQL tests, hosted migration authorization, owner provisioning, real Google OAuth, redirect configuration, live anonymous/nonowner probes and Vercel incognito protection are separate gates to be reported by their execution owners.

An earlier synthetic browser clipboard probe was not executed: automatic approval review failed because the workspace was out of credits. This was a review infrastructure failure, not a determination that the local test was unsafe. It does not establish any current browser result; no bypass or retry of that rejected action occurred.

## Remaining review gates

1. Confirm and retest the sync reentrancy correction.
2. Review final root mounting/cleanup, private draft handling, explicit import consent, publication confirmation and public `textContent` rendering when integration is present.
3. Execute all-table anon/nonowner deny, valid-owner CRUD, forged owner reassignment, public gate off/on, safe projection and failed snapshot rollback tests on disposable Postgres; test genuine concurrent snapshot writes.
4. Keep Google OAuth/deployment claims provisional until exact project/redirect/protection checks run. Local journal/backups remain sensitive, plaintext device data; never upload them automatically or include them in public preview fixtures.
