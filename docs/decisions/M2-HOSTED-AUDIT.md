# M2 hosted acceptance implementation audit

6 November 2026 (Asia/Jakarta). Baseline: `DoorBlox/orbit`,
`f2719f3b83c3ce906bee826576c134de15b35f6d`, matching remote main.
Scope: authentication, owner authorization, RLS and snapshot synchronization.
Applied skill: `ecc-security-review` and its authentication, RLS, input handling,
secret handling and XSS guidance, adapted to the existing static ES-module app.

## Current hosted state

The user explicitly reports the authorized assignment committed and an independent
SQL query confirmed owner `20daa320-348a-4991-a844-f27569dbc2b3` and public reads
false. The user personally opened the private workspace through the protected
preview. These are accepted user-provided hosted observations; the agent did not
repeat the assignment or independently query the database. Owner assignment is
closed, not a remaining blocker. The earlier unexecuted assignment draft was removed.

Latest user evidence: all eight hosted browser observations are enumerated and
passed, including a
successfully authenticated nonowner receiving the private-space denial message.
The user independently inspected live metadata: RLS enabled on all eight public
app tables, restrictive owner policies on all seven private workspace tables,
public viewing disabled. The temporary nonowner is now available and must not be
deleted without authorization. This supersedes the earlier account-unavailable
blocker. Direct authenticated nonowner read isolation subsequently passed all 10
checks at 2026-11-06T08:26:03.218Z (user execution). Snapshot denial was HTTP 403/42501;
all eight selected tables had zero accessible rows. No hosted write test ran.

No live Supabase tool is available in this session; no Supabase binding/credential
is configured. The exact preview's read-only HEAD request failed at the proxy
CONNECT stage with 403. No Vercel response was observed. Consequently the audit
does not attest the deployed bundle/schema parity or hosted RLS execution. No
network policy change or access-control workaround was attempted.

## Reviewed implementation and conclusions

| Area | Evidence in baseline | Conclusion and practical limit |
| --- | --- | --- |
| Password authentication | `src/auth/controller.js`, `signInWithPassword` and `verify` | Uses SDK password login, then server `getUser()` and strictly boolean `orbit_owner_access()`. User metadata/email is not owner authority. Generic errors avoid account enumeration details; no password state/log persistence is introduced. |
| Auth lifecycle | Controller generation/owner epoch, deferred SDK auth callbacks; `src/bootstrap.js` hydration guards | Stale hydration is ignored after logout/account switch; cleanup disposes sync, aborts reads and clears private DOM. Same-owner refresh preserves the mounted draft. |
| Browser session | `src/cloud/client.js` | PKCE, refresh and persistence use `sessionStorage`, not an HttpOnly cookie or durable localStorage login. Same-tab reload is supported; independent contexts must authenticate independently. Script-readable session storage remains dependent on preventing XSS; this audit does not propose an unrequested server/cookie rewrite. |
| Application mount | `src/bootstrap.js` | Private app stays hidden/inert until verified owner snapshot hydration; cloud mode disables legacy local persistence. Legacy import is explicit and warns it replaces cloud data. |
| Server owner gate | `20261101140001_orbit_owner_snapshots_publication.sql` | Private config has no anon/authenticated privileges. Two fixed-search-path read-only boolean helpers are definers; public data RPCs are invokers and check the configured UID. Effective hosted definitions/grants still require read-only inspection. |
| Seven private tables | Initial migration ownership policies plus M2 restrictive `orbit_single_owner` policies | Per-row UID checks AND configured-owner checks apply to reads/writes. Profiles use `user_id`; other private app tables use `owner_id`. Authenticated nonowners must not even create their own rows. Source declarations are not hosted RLS proof. |
| Data integrity | Composite owner/branch FKs, schema checks and deferred validation | Prevents cross-owner references and rolls back invalid snapshots. Triggers serialize direct DML with snapshots and bump revisions. Private schema nonexposure and actual trigger installation remain hosted gates. |
| Snapshot transactions | Latest `20261102053522_orbit_business_conflict_http_status.sql` | Owner checked before mutation; revision locked before full replacement; stale expected revision raises `PT409`. Confirm latest function exists remotely: an older `40001` implementation can hang under PostgREST business-conflict retries. No reapplication is proposed without evidence of mismatch. |
| Client synchronization | `src/cloud/sync.js` | Serial save queue, 500ms debounce, revision checks, 15s polling and focus refresh. Pending drafts block refresh; a change-version guard rejects stale read results. New edits survive earlier save ACKs. Conflict retains draft until explicit reload; no automatic merge. |
| Failure behavior | Sync error mapping and bootstrap auth refresh | Network failures retain session draft; retry/reconnect can retry it. Auth-required/forbidden errors trigger re-verification and private-view cleanup. Unsaved data is not durable across tab closure/logout; export before discarding. Aborting a browser request cannot prove its server transaction did not already commit: re-read before retrying uncertain saves. |
| Publication/XSS | Separate publication projection; journal sanitizer on load/save/render/import | Public reads remain false. Projections contain only reviewed fields; private mapping is separate. Journal HTML is sanitized at the browser boundary, not made safe merely by storage. No public gate toggle or hosted publication test is required to verify private persistence. |

No newly confirmed exploitable authorization bypass or synchronization defect was
identified in the reviewed source. No application, schema, dependency, protection
or deployment change was made. This is a focused audit, not a blanket security or
hosted readiness certification.

## Focused local verification

Executed the three existing test files directly with the retained Node 22.22.0
binary (no reinstall/build/onboarding):

- `node tests/auth.test.mjs`: 51 passed, zero failed/skipped.
- `node tests/cloud_repository.test.mjs`: 15 passed, zero failed/skipped.
- `node tests/cloud_sync.test.mjs`: 17 passed, zero failed/skipped.

The initial `node --test` invocation reported three file-level successes only;
direct execution was used to verify all 83 individual cases actually completed.
Outputs are outside the checkout under `/workspace/.orbit-tools/m2-*-direct.tap`.
These use mocked services and do not substitute for real hosted acceptance.
The prior complete 138-unit/24-browser baseline was not rerun.

## Consolidated close-out

The latest evidence supersedes the earlier per-case manual gating. The completed
hosted browser tests and 10/10 direct nonowner read checks are retained as user
verified evidence. New local browser automation covers 320px/390px owner flows,
CRUD/undo, offline export/retry/logout, full-snapshot integrity and exact legacy
storage preservation. Existing browser and unit suites passed in the final run.
Real disposable local SQL/RLS/rollback/concurrency tests also passed.

See `M2-HOSTED-CLOSEOUT.md` for all command outcomes, transport distinctions,
one optional hosted-only checklist and the final GO/NO-GO recommendation. Local
write-isolation evidence does not become hosted CRUD certification. No application
fix was required; changes are test infrastructure and acceptance documentation.
No hosted settings or test accounts were changed; M2.5/M3 were not started.

## Owner acceptance and handoff

The owner conditionally accepted M2 for protected password-based private use on
6 November 2026 (Asia/Jakarta), retaining the documented physical-device and
hosted write/CRUD authorization gaps. Completed evidence is archived with hashes
under `docs/evidence/m2/acceptance-20261106/`. The proposed M2.5 scope/criteria are
in `M2-TO-M2_5-HANDOFF.md`; no M2.5 implementation or hosted change is authorized.
