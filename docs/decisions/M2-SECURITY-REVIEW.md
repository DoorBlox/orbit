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

## Confirmed review issues

**P1 — reentrant snapshot application could drop a newer edit (fixed and retested).** In the initial sync controller, `discardPendingAndReload()` called `onSnapshot` before clearing the old draft. If that callback queued a new edit, later `pending = null` silently removed it and status became `saved`. A Node fixture reproduced `saved`, `hasPending:false`, `draft:null` after the callback queued a new task. `refresh()` could also label a callback-queued draft saved. The controller now establishes the replacement revision before invoking its consumer, preserves callback-queued edits and only reports saved when no pending edit exists. Independent direct-file rerun: all 17 sync tests passed, including both reentrant regression cases.

**P1 — uncommitted journal input versus logout/refresh (source fix reviewed; browser retest delegated).** The initial cloud integration debounced journal-model updates for 500ms as well as debouncing cloud writes. During that first window the sync controller had no pending draft: a remote refresh could replace the DOM and cancel the journal timer, and immediate logout could skip the unsaved confirmation. The initial logout preparation called a snapshot getter that did not commit the editor. Cloud input now commits the model immediately while retaining the sync-controller save debounce; logout explicitly flushes the editor before checking pending writes. Browser specialist added immediate-logout, in-flight-refresh and old-ACK regression cases; their execution result must be recorded separately.

**P1 — privileged-key misconfiguration guard (fixed and independently retested).** The initial runtime client rejected modern `sb_secret_` keys but the shared config resolver accepted any nonblank key, including a legacy JWT with `role:service_role`. Build/runtime now allow modern `sb_publishable_` or legacy JWT `role:anon` only. Independent inline runtime assertions rejected modern secret, service-role, authenticated-role and malformed key fixtures; accepted public fixtures; and confirmed resolver rejection. Build-owner tests cover pre-artifact validation. No actual key was read or printed.

**P2 — asynchronous import after disposal (source fix reviewed).** An import handler awaited `file.text()` without rechecking its disposed state afterward. Logout/re-mount during that read could allow the old callback to mutate stale state and reach global selectors in the new view. The handler now checks disposed/read-only immediately after the await; synchronization also stops after disposal.

**P1 — publication versus source-deletion race (source fix reviewed; SQL specialist retested).** The initial publication RPC read the private source without taking the shared workspace revision lock. A publish transaction could read a source title, a second transaction could delete the source and complete deferred cleanup, and the first transaction could then commit a new publication after cleanup. The RPC now takes the same owner revision-row lock before source lookup; source deletes take that lock before changing rows, and deferred cleanup removes genuinely deleted source projections. The SQL specialist reports passing genuine two-session publish/delete tests, alongside snapshot/snapshot and direct-DML/snapshot concurrency tests.

**P1 — publication could disclose an unreviewed newer source title (fixed contract reviewed).** Initial source options could remain stale while the model changed, and the RPC copied the database's current title rather than the reviewed title. The form now refreshes its source preview before confirmation. SQL additionally requires a reviewed expected title and compares it under the shared workspace lock, rejecting mismatches with `40001` instead of publishing a newer private title. The final UI sends the exact confirmed option text, including the `Untitled` fallback; repository validation accepts the same 180-character limit as the public table. Repository tests were rerun after the signature change: 15 passed.

## Root integration pass

- Cloud bootstrapping hides and makes the app inert before client construction, mounts private records only from verified owner hydration, and checks the owner lifetime after both asynchronous snapshot loading and module imports.
- Clearing a private view aborts reads, disposes synchronization, owner tools and app modules, removes private DOM and the debug reference, and returns to the gate. The cloud mount supplies complete snapshot/layout/journal inputs and disables local persistence; it does not implicitly hydrate the old local diary.
- Local import reads known legacy keys only after the owner requests review. Confirmation names journal/page counts, explains cloud replacement and retention of local originals, and is blocked while a draft is pending. Cloud failure retains the imported session draft for export/retry.
- Imported layout keys are accumulated in a null-prototype dictionary before validation, so hostile object-key names cannot change the staging object's prototype or disappear from the widget allowlist check.
- Visitor models use only explicit publication fields; journal excerpts are escaped into text before allowable paragraph/line-break markup, and task/branch/milestone views use text assignment. Read-only mutation guards supplement disabled controls. They are presentation constraints, not authorization substitutes.
- Safe publication copies title, explicit excerpt and optional public date. It does not copy journal body, task criteria/descriptions/resources, layout or owner/source identifiers. New private edits are not automatically republished. Development configuration keeps public viewing disabled.

## Executed review checks

Run with Node 22.23.4:

- `node tests/cloud_repository.test.mjs`: PASS, 15 tests.
- `node tests/cloud_sync.test.mjs`: PASS, initially 15 pre-fix tests; subsequent correction rerun passed 17 including both reentrancy regressions.
- `node tests/auth.test.mjs`: PASS, 29 tests.
- `node tests/cloud_bootstrap.test.mjs`: PASS, four public-projection/escaping and immutability tests.
- `node tests/cloud_mappers.test.mjs`: PASS, five compatibility/config tests.
- Inline runtime public-key guard assertions: PASS; no credentials printed.
- `node --test tests/auth.test.mjs tests/cloud_repository.test.mjs tests/cloud_sync.test.mjs`: PASS; the restricted command runner reported three file-level results. Direct-file execution above exposes the full subtest totals.
- Inline Node reentrancy diagnostic: reproduced the defect. No browser or remote service was used.

The migration/test SQL was inspected; this reviewer has not independently executed a database. SQL specialist reports 133 behavioral pgTAP checks, 14 structural checks and three genuine concurrency scenarios passing on disposable PostgreSQL. Full all-table anon/nonowner CRUD denial, valid-owner operations, immutable allowlist, public gate off/on, late-failure seven-entity/revision/publication rollback and deleted-source unpublication are covered in that execution. Central verification should retain those logs; this report attributes rather than duplicates that run.

This M2 review has not independently run browser tests. Browser and database evidence must be attributed to the specialist/central runs that actually execute them.

## Remaining review gates

1. Retain final browser regression evidence for immediate input/logout, in-flight refresh versus typing, old acknowledgements, owner cleanup/nonowner gating and publication confirmation.
2. Final-check the exact confirmed publication-title/fallback contract across UI, repository and SQL; review generated protected-build artifact contents and credential guards.
3. Hosted migration execution, actual owner provisioning, real Google OAuth/PKCE, exact redirect settings, direct Data API probes and incognito deployment protection require their own execution evidence. Disposable PostgreSQL and mocked Auth tests do not establish live-provider success.
4. Local journal/backups remain sensitive plaintext device data; cloud session drafts are retained only in memory and may be lost on browser crash/refresh before acknowledgement. Export before intentionally discarding a draft. Never upload legacy content automatically or include it in public fixtures.

## Source-review verdict

No remaining concrete owner-isolation bypass, private-field publication leak or unaddressed P1 data-loss issue was found in the reviewed final contracts. The issues above were reported during development and addressed in the shared implementation. This verdict is limited to the code and attributed local evidence; it does not approve a production release or replace the outstanding hosted/provider/browser verification gates.
