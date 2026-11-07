# M2 close-out — conditionally accepted for protected private use

6 November 2026 (Asia/Jakarta). `DoorBlox/orbit`, baseline
`f2719f3b83c3ce906bee826576c134de15b35f6d`. Protected development workflow only.

## Hosted evidence — user verified

| Gate | Result |
| --- | --- |
| Vercel blocks an unauthenticated visitor | PASS |
| Authorized owner signs into the protected ORBIT workspace | PASS |
| Journal survives reload and appears in an independently authenticated session | PASS |
| Changes synchronize automatically between sessions | PASS |
| Simultaneous edits trigger conflict detection; recovery preserves both versions | PASS for observed behavior; raw protocol trace not independently captured by agent |
| Logout survives refresh/Back; independent owner session remains active | PASS |
| Authenticated nonowner denied workspace/private content in the UI | PASS |
| Live policy metadata: eight public app tables have RLS; seven private workspace tables have restrictive owner policies | PASS |
| Exact owner assignment and disabled public viewing | PASS; do not repeat assignment |
| Direct authenticated nonowner read isolation | PASS: 10/10 checks; user executed reviewed helper on the exact preview |

Direct API evidence timestamp: `2026-11-06T08:26:03.218Z`
(6 November 2026, 15:26:03.218 Asia/Jakarta).
`authenticatedNonowner=true`; owner RPC HTTP 200/false; snapshot RPC HTTP 403,
PostgreSQL `42501`. All seven private workspace tables plus published_content
returned zero accessible rows. No private records were exposed. No mutations ran.
This is live authenticated **read isolation**, not hosted write/CRUD authorization.
The agent did not execute the hosted test, retrieve tokens, or modify configuration.

The eight completed hosted browser observations are accepted without repetition.
The temporary nonowner remains available and must not be deleted without approval.

## Automated local browser evidence

All runs use existing Chromium/Playwright infrastructure, synthetic data and local
HTTP origins. Cloud-mode cases replace the SDK/transport inside the test context;
no hosted endpoints, credentials or deployment-protection bypass are involved.

| Run | Outcome and coverage |
| --- | --- |
| npm run check | PASS: 138 tests, zero failures/skips; syntax, provenance, build and structure pass |
| python tests/qa_m1.py | PASS: desktop, tablet, 390px, 320px and landscape/touch-emulated layouts; journal/date/layout persistence; task edit/complete/reopen; branch operations; milestone remove/undo; journal undo; backup/restore, corruption/quota recovery and restore rollback; dates/accessibility and 100/500/2000-task density |
| python tests/qa_m2.py | PASS: 24/24 local mocked-cloud browser cases, including gate/mobile widths, owner saves, draft races, pending-logout export, explicit import and local privacy separation |
| python tests/qa_m2_closeout.py | PASS: 5/5 new targeted cases: 320px and 390px password/owner/task/journal save and fresh-context hydration; cloud task CRUD/undo and journal delete/undo; actual browser offline state, backup export, reconnect retry and logout cancel/discard; complete snapshot field/ID integrity |

The new suite reuses qa_m2 fixtures with an optional legacy_seed argument. Legacy
branches/tasks/journal/preferences/milestones/layout/sizes/camera and an unrelated
key are seeded before startup. All original values remain byte-identical, no
legacy getItem/setItem/removeItem access occurs during normal cloud operations,
and legacy content never enters the mocked cloud save. Full snapshot export and
rehydration preserve task/branch IDs/counts, formatted dated journal, milestone,
layout dimensions/position, profile and preferences. Undo restores the same record
identity/content and leaves unrelated records intact.

Results: `qa/m1-results.json`, `qa/m2-results.json`,
`qa/m2-closeout-results.json`; synthetic screenshots and failure traces use the
existing ignored qa/ and test-results/ paths. This run's logs are under
`/workspace/.orbit-tools/m2-final-*.log`. No application-source changes were needed.

## Real local database and Auth/API evidence

The existing lightweight test stack was runnable on the local Docker socket.
A task-owned, loopback-bound PostgreSQL 15.14 container was created from the
repository-documented digest; pgTAP 1.2.0-3 was installed using signed official
Debian packages with verification intact. No full Supabase deployment or hosted
project was started or linked. The task-owned PostgreSQL container and the HTTP
runner's temporary services/databases were cleaned up after testing.

- `python tests/db/run_local.py`: PASS, all three migrations; 14 structural plus
  133 owner-isolation/publication/rollback pgTAP assertions; all three real
  two-session concurrency scenarios. Actual PostgreSQL roles/RLS are exercised
  using the local auth.uid() claim adapter, not real hosted Auth credentials.
- `python tests/integration/run_http.py`: PASS, real local GoTrue-issued synthetic
  sessions, PostgREST, SDK and browser integration. Owner/nonowner/anon isolation,
  all-model persistence, forged-owner rejection, HTTP stale-write conflict,
  two-session CAS/draft recovery, publication gating and unpublish, actual password
  sign-in/session restore, task save/reload, two independent browser sessions
  sharing a journal update, DOM gates and logout all passed. Temporary signing
  keys/passwords were generated only in memory and never shared or logged.

These are real local database/Auth/API results, stronger than mocked browser
transport evidence, but they do not certify the deployed hosted write policies.
Live Supabase configuration and the hosted temporary nonowner were not modified.

## Case reconciliation

| Case | Consolidated evidence | Remaining distinction |
| --- | --- | --- |
| M1 mobile | Automated PASS at 320px/390px including cloud-mode interactions; original local suite also tests touch emulation | Exact hosted-origin mobile and physical Safari not claimed |
| R1 offline/export/reconnect | Automated browser PASS; unsaved draft is in backup, no offline write reaches fixture, reconnect saves | Real provider/network outage not injected into hosted project |
| R2 conflict/recovery | Hosted behavior PASS plus real local database/PostgREST conflict and explicit recovery PASS | Hosted protocol trace is not independently captured by agent; no repeat requested |
| R3 pending-edit logout | Automated PASS for cancel, export, discard, cleared private DOM and no later save; ordinary hosted logout PASS | Pending-offline hosted variant not separately claimed |
| I1 data integrity | Full mocked snapshot round-trip and real local API all-model persistence PASS; hosted journal reload/cross-session PASS | Full multi-entity hosted comparison not separately claimed |
| I2 CRUD/undo | Automated cloud task edit/complete/reopen/delete/undo and journal delete/undo PASS; stable IDs and unrelated records retained | Not a live hosted mutation-RLS test |
| I3 legacy storage | Automated exact-byte/no-access/no-upload preservation PASS across normal cloud operations | Actual user's legacy data not inspected or uploaded |
| A1 direct nonowner API | Hosted read-isolation PASS, 10/10 | Hosted INSERT/UPDATE/DELETE authorization remains untested |

## One optional hosted-only checklist

Do not rerun completed hosted checks. If additional device/provider-specific
assurance is desired, perform these together in one session; they are not a series
of new questions and are not automatically required to redo locally verified work:

- On the exact protected preview at 320px/390px (or a physical phone), save a
  synthetic task and dated journal page, reload, and confirm key controls are usable.
- With a synthetic draft, check offline export/reconnect and pending-edit logout;
  verify that only the intended synthetic changes were saved or discarded.
- Compare a private baseline after task/journal undo and reload, including milestone,
  layout and preference; retain unrelated data and the temporary nonowner account.

Do not run hosted write/CRUD-denial probes, import/replace a real workspace, change
Auth settings, or toggle public viewing to close this checklist. Hosted mutation
RLS/constraint-rollback certification needs a separately authorized safe fixture;
it is a documented limitation of this read-only hosted scope, not a fabricated PASS.

## Decision

**Recommendation: GO for the protected password-based M2 development workflow.**
No genuine implementation blocker was found in the completed tests. The earlier
NO-GO evidence hold is superseded by the user's hosted 10/10 nonowner read result
and the completed local mobile/recovery/integrity/undo and real SQL/Auth/API tests.

**Owner decision: CONDITIONALLY ACCEPTED for protected, password-based private
use**, explicitly confirmed in this conversation on 6 November 2026
(Asia/Jakarta). This supersedes the earlier OPEN / GO-recommended status. The
remaining physical-device and hosted write/CRUD authorization gaps are accepted
limitations for this scope, not silently passing tests. M2 does not need another
manual test round or onboarding to record this decision.

The [M2 → M2.5 handoff](M2-TO-M2_5-HANDOFF.md) records the verified baseline,
design/security invariants, accepted risks and proposed Motion Polish scope and
acceptance criteria. Implementation of M2.5 has not begun and is not authorized
by this handoff. Conditional private-use acceptance is not production/public
release approval and does not authorize changing Auth, RLS or infrastructure.

Evidence from completed runs is preserved under
`docs/evidence/m2/acceptance-20261106/`, including JSON summaries, local unit/SQL/HTTP
logs and a SHA256 manifest. Hosted entries are attributed to the owner's reports;
no raw session credentials or personal records are archived.

No further individual browser-test requests are needed. The single optional
hosted-only checklist above contains the remaining provider/device distinctions.
The hosted temporary nonowner must be preserved. M2.5/M3 are not started.

OTP delivery, Google OAuth, physical-device Safari, full hosted mutation RLS and
provider-outage injection remain unverified. Auth uses sessionStorage; unsaved
drafts must be exported before tab/session closure. Sync uses focus/polling and
explicit conflict recovery rather than automatic merge.

No Production, Supabase configuration, DNS, deployment-protection or owner-assignment
change was made. The original hlarknnt/orbit-personal repository was untouched.
