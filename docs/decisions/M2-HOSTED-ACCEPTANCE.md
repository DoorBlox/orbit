# M2 hosted acceptance — conditionally accepted for protected private use

6 November 2026 (Asia/Jakarta).

Target repository: `DoorBlox/orbit`. Local HEAD and a read-only remote `main`
lookup both verified `f2719f3b83c3ce906bee826576c134de15b35f6d`.
The local task branch is `work`; no checkout/reset is necessary. Initial working
tree was clean. No onboarding, installation or repeat local test run was performed.

Protected preview: https://orbit-cuknyrum7-doorbloxs-projects.vercel.app

Development Supabase target: `orbit-development`, project ref
`ixfgavgtwuzdgucjriec`. Production, domains, deployment protection and the original
`hlarknnt/orbit-personal` repository are excluded from all steps.

## Owner decision

M2 is conditionally accepted by the owner on 6 November 2026 (Asia/Jakarta) for
protected, password-based private use. The physical-device and hosted write/CRUD
gaps remain explicit accepted limitations. See [close-out](M2-HOSTED-CLOSEOUT.md),
[handoff](M2-TO-M2_5-HANDOFF.md) and
[evidence archive](../evidence/m2/acceptance-20261106/manifest.json).
M2.5 scope is prepared for review only; implementation has not begun.

## Evidence and limits

| Gate | Status |
| --- | --- |
| Repository identity and exact main baseline | Verified in this task |
| Local 138 tests and 24 mocked integration cases | Prior environment evidence; not repeated |
| Preview READY and incognito Vercel authentication challenge | Reported by user; not independently repeated here |
| Intended owner assignment and independent SQL confirmation | Completed by user through connected Supabase account; owner UID below, public reads false |
| Exact intended owner UID | `20daa320-348a-4991-a844-f27569dbc2b3` |
| Real protected hosted workspace access | Personally verified by user after assignment |
| Agent read-only live owner recheck | Unavailable: no Supabase tool/binding in this session |
| Eight hosted browser checks | PASS, eight observations enumerated by user; precise close-out mapping in M2-HOSTED-CLOSEOUT.md |
| Authenticated nonowner UI denial | PASS, user verified successful Auth followed by private-space denial |
| Existing authenticated nonowner fixture | Temporary account now available; preserve it; deletion not authorized |
| Live RLS/policy metadata | User independently verified RLS on all eight public app tables and restrictive owner policies on the seven private workspace tables |
| Public viewing | Still disabled, independently reported by user |
| Direct authenticated nonowner Data API denial | PASS, user executed reviewed helper: 10/10, 2026-11-06T08:26:03.218Z; owner RPC false, snapshot 403/42501, eight tables zero accessible rows |
| Mobile, recovery, integrity, CRUD/undo and legacy preservation | Automated local PASS; hosted/device-specific distinctions recorded in M2-HOSTED-CLOSEOUT.md |

The published environment has no Supabase/Vercel connector or configured credential
bindings. No relevant exported ORBIT/Supabase/Vercel/database variable names were
found. A HEAD request to the exact preview failed at the network proxy with CONNECT
403, before reaching Vercel. This is not evidence that preview protection failed.
Current allowed destinations omit the preview and the development Supabase host.
No network/configuration draft was changed. Do not bypass the proxy or deployment
protection. An authorized administrator/browser can execute the checklist; agent
execution additionally needs supported network access and authenticated sessions.
Never provide passwords, keys, session cookies, refresh tokens or JWTs in chat/logs.

## Immediate next action

Owner assignment is complete. **Do not assign it again or modify configuration.**
The earlier unexecuted assignment draft has been withdrawn. The user's independent
query confirmed the exact UID above and `public_read_enabled=false`.

The eight browser checks are accepted as user-reported PASS; do not repeat that
suite merely to regenerate evidence. The exact nonowner UI message was:

> This account cannot open the private space. Public viewing is not enabled. Your private space requires owner sign-in.

Direct authenticated nonowner verification is complete: PASS, 10/10 checks at
`2026-11-06T08:26:03.218Z`. No private records were exposed and no mutations were
executed. Do not request another run or delete the temporary account. This proves
read isolation and read-only RPC denial; hosted write/CRUD authorization is not
claimed. The helper and SQL preflight remain reviewable references only.

The current consolidated evidence, automated case reconciliation, one optional
hosted-only checklist and GO/NO-GO recommendation are in
`M2-HOSTED-CLOSEOUT.md`. The procedures below are reference material, not a request
for separate manual test rounds. Existing successful browser checks are not repeated.

No user creation, password reset, signup/provider change, schema migration, public
release or deployment change is needed. Do not run the local integration harness
against hosted infrastructure: it provisions fixtures and changes authorization/
public settings for a disposable local stack. No environment configuration updates
or publication are part of this acceptance task.

## Hosted acceptance sequence

Use synthetic records with a unique run prefix. Preserve any pre-existing cloud
data; snapshot saves replace an entire workspace. Never submit an empty/test-only
snapshot over an existing workspace. Keep private evidence/downloads outside Git.
Record timestamp, target, case, expected/actual result and redacted evidence for
each case. A skipped or blocked gate is not PASS.

1. **Target and existing owner state.** In an authorized browser, pass the existing
   Vercel challenge. Verify this exact deployment's source revision and generated
   runtime config point to the baseline and development Supabase origin, with
   publicRelease false. Stop on mismatch; do not rebuild/redeploy automatically.
   Owner assignment and workspace access already passed per user report. Do not
   revert configuration to reproduce pre-assignment denial. Do not confuse Supabase
   authentication with Vercel access or owner authorization.
2. **Read-only state confirmation.** If an administrator session is available, run
   only the optional read-only preflight. Expected configuration booleans: true,
   true, true. Retain the user's successful independent query as existing evidence.
3. **Real password and owner gate.** Sign in using the existing email/password,
   without resetting it. Verify a real Auth `getUser` result for the approved UID,
   `orbit_owner_access()` true, successful `load_owner_snapshot`, and private owner
   space hydration. Reload the same tab to check session restoration. Auth uses
   `sessionStorage`: a fresh independent context should require sign-in, while
   browser session-restore behavior can vary. Do not expect durable login across
   browser closure or use a duplicated tab as the two-independent-session test.
   Invalid credentials must not mount private DOM. Keep OTP delivery and Google
   OAuth explicitly unverified unless separately exercised; do not change providers.
4. **RLS via actual API identities.** Use the public client key with real owner,
   signed-out (anon), and a distinct existing authenticated nonowner session.
   Do not use service-role/admin credentials to claim an RLS pass. If a nonowner
   account is unavailable, this gate stays blocked; creating one requires approval.
   Execute the matrix below while synthetic owner rows exist. Zero-row reads of an
   empty database are insufficient evidence.
   Update: a temporary nonowner account now exists and its browser denial passed.
   Preserve it for direct API verification; do not delete it, create another one,
   or change signup/Auth settings. UI denial does not establish direct API denial.
5. **Cloud persistence.** Through the UI, add uniquely named synthetic branch/task,
   journal page with formatting/date, milestone, layout position/size and preference
   change. Wait for `Saved to your cloud`. Verify values and revision from a fresh
   authenticated server read, then hard reload. Check a second clean browser
   context sees the same values without localStorage seeding. Existing local data
   must not upload automatically. Do not invoke replace/import acceptance on real
   data without a separately reviewed backup and consent.
6. **Two independent sessions.** Sign in independently in contexts A and B; do not
   copy one session's tokens between contexts. On a common revision, save a change
   in A. Idle B must refresh on focus or the default 15-second polling interval
   (allow network delay). Verify reverse B-to-A propagation. This is polling/focus
   synchronization, not a Realtime subscription.
7. **Stale revision and conflict.** Retain B's revision, let A save, then submit B's
   stale-base edit using only the complete loaded synthetic-safe workspace.
   Expect HTTP 409 / `PT409`, retained B draft, conflict status, and no overwrite
   of A's committed snapshot. Make the race deterministic by controlling B's network
   or capturing its base revision before A saves. Export B's draft privately, then
   explicitly use `Reload cloud version`; verify A's state loads. Never assert two
   concurrent saves both succeed or that all conflicts merge automatically.
8. **Offline/recovery and logout.** Disable network in one owner context, edit a
   synthetic record, and verify unsaved/offline status and retained draft. Reconnect:
   a current base saves; a stale base conflicts. Confirm logout warns about pending
   work, clears private DOM and cancels pending writes. Back navigation/reload when
   signed out must not expose private content. Logout in A alone does not prove
   every independent session B was revoked.
9. **Mobile and close-out.** Repeat owner login, task/journal save, reload and logout
   at 390px and 320px on the exact protected origin. Record browser/device vs actual
   hardware evidence separately. Remove only this run's synthetic records through
   the owner path and verify deletion from a fresh session; preserve other records.
   Recheck owner match, public reads false and unchanged protection/target. Report
   all hosted results before declaring M2 complete. M2.5/M3 remain out of scope.

## Concrete browser run sheet

The user enumerated eight passing browser observations. This table retains the
original procedures for reference, not a request to rerun completed cases. The
precise observation-to-close-out mapping is in `M2-HOSTED-CLOSEOUT.md`; omitted
substeps/request codes are not inferred as passing. H8's UI denial is confirmed
by the user; direct authenticated nonowner read isolation subsequently passed 10/10.

Use two genuinely separate browser profiles or normal + private contexts. Both
must pass the existing Vercel challenge independently and then use the same owner
login. Keep the exact preview origin in both. Do not share tokens or duplicate a
logged-in tab to claim an independent session. Use prefix `M2-20261106-accept`;
if repeating, append a new run suffix. These are manual test instructions, not
actions already executed by the agent.

| Case | Exact action | Required observable result | Status |
| --- | --- | --- | --- |
| H1 cloud save | In A, capture task `M2-20261106-accept-task`. In Journal, create a page titled `M2-20261106-accept-journal`, enter synthetic text, and change its date. Wait for cloud save status. | A reports `Saved to your cloud`; Network shows successful `save_owner_snapshot` with a returned revision. Do not retain the payload or tokens in shared evidence. | Journal reload PASS; task/date substeps unverified |
| H2 server restore | Hard reload A, then independently sign in to B. | Both show the exact task and journal text/date. Local browser-only content must not replace the server data. | Independent-session journal visibility PASS |
| H3 other entities | Add a synthetic timeline milestone; move/resize Journal; toggle the color sort mode. Wait for save and reload. | Milestone/date, widget dimensions/position and preference survive and appear in B after refresh. | Not verified by reported observations |
| H4 A-to-B sync | With B clean and online, edit A's synthetic task title and wait for save. Focus B or wait about 15 seconds plus request latency. | B shows the new title without a manual full-page reload. Repeat B-to-A. | PASS (user observation 5) |
| H5 deterministic conflict | Let B finish refresh. Set B DevTools Network to Offline. In A rename the synthetic task to suffix `-A` and wait for save. In B edit its journal text to suffix `-B` while offline. Reconnect B. | B's stale snapshot request returns HTTP 409/`PT409`, displays conflict, retains the `-B` draft, and does not erase A's `-A` task. Export B's draft privately; click `Reload cloud version` and confirm. A's committed state loads. If a save hangs, inspect installed PT409 support using the read-only preflight. | Core conflict/recovery PASS; detailed R2 partial |
| H6 current-base offline retry | Refresh B first so it is current. Go offline, edit only a synthetic record, leave A idle, then reconnect B. | Offline/pending indication first; successful save after reconnect; A sees it after focus/poll. | Not verified by reported observations |
| H7 logout | Go offline in B, edit a synthetic journal line, click Sign out. First cancel the unsaved confirmation, export privately, then sign out and confirm discard. | Cancel retains the draft; confirmed logout clears private DOM and stops client work. Reload remains gated. A is a separate session and is not assumed revoked. | Ordinary logout PASS; offline-discard R3 partial |
| H8 anon/nonowner | In a fresh context pass Vercel only, do not log into ORBIT; use the read-only API probes below. Then sign in as an existing approved nonowner and repeat. | No private rows; nonowner owner-RPC false; owner snapshot RPC denied. Vercel success alone grants no Supabase access. | UI and direct nonowner read API PASS; anon API not separately asserted |
| H9 mobile | At 390px and 320px repeat sign-in, synthetic task/journal edit, saved status, reload and sign-out. | Controls usable, data persists, private DOM cleared on logout. Record emulated vs hardware testing honestly. | Hosted mobile not verified |

Before cleanup, check both contexts have no unsaved drafts/conflicts. Remove only
the run-owned synthetic task/page/milestone; wait for save and verify from B.
Restore tested layout/preferences from your private baseline notes if desired.

### Read-only browser API probes without copying session secrets

In DevTools on the exact protected preview, run the following. It returns only
identity-match/authorization/row-count summaries, never passwords, tokens, email,
snapshot bodies or raw provider errors. It does not change authentication, save
records or modify configuration. Run it once in the owner context, then in the
signed-out/nonowner contexts for H8.

```js
await (async () => {
  if (location.origin !== 'https://orbit-cuknyrum7-doorbloxs-projects.vercel.app') {
    throw Error('Wrong preview origin');
  }
  const runtime = await window.orbitReady;
  const client = runtime?.auth?.client;
  if (!client) throw Error('Cloud Auth client unavailable; inspect the runtime target');
  const user = await client.auth.getUser();
  const gate = await client.rpc('orbit_owner_access');
  const snapshot = await client.rpc('load_owner_snapshot');
  const tables = ['profiles','branches','tasks','journal_entries',
    'milestones','widget_layouts','preferences','published_content'];
  const reads = {};
  for (const name of tables) {
    const r = await client.from(name).select('*', {count:'exact',head:true});
    reads[name] = {status:r.status, errorCode:r.error?.code ?? null, count:r.count};
  }
  return {
    signedIn: !!user.data?.user?.id,
    intendedOwner: user.data?.user?.id === '20daa320-348a-4991-a844-f27569dbc2b3',
    ownerAccess: gate.error ? 'denied' : gate.data,
    snapshot: {status:snapshot.status,errorCode:snapshot.error?.code ?? null,
      revision:snapshot.error ? null : snapshot.data?.revision},
    reads
  };
})();
```

Owner expected: intendedOwner true, ownerAccess true, snapshot success. Anon:
signedIn false, owner RPC/snapshot denied, private reads denied (not counts of
owner records). Nonowner: signedIn true, intendedOwner false, ownerAccess false,
snapshot denied, private reads empty/denied. With public reads false, anon/nonowner
published_content must be empty/denied. A successful owner count of zero can be
normal for unused tables; populate synthetic fixtures before asserting isolation.
Do not share raw Network requests, storage contents or SDK session objects.

This probe covers reads and RPC access, not mutation isolation. The full write
matrix below remains separate; never claim all CRUD passed from these results.

## Direct API isolation matrix

For every private public-schema table (`profiles`, `branches`, `tasks`,
`journal_entries`, `milestones`, `widget_layouts`, `preferences`), exercise SELECT,
INSERT, UPDATE and DELETE with valid schema/FK-aware synthetic payloads. `profiles`
uses `user_id`; the others use `owner_id`. Inspect both errors/returned rows and a
fresh owner read: UPDATE/DELETE can return success with zero affected rows under
RLS. Invalid payload/type/FK errors alone do not demonstrate authorization denial.

| Identity | Required behavior |
| --- | --- |
| Anonymous | No private rows; all writes denied/no changes; owner RPCs unavailable/denied |
| Authenticated nonowner | Owner RPC false; snapshot load/save and publication mutations denied; no private rows or writes, including rows bearing its own UID or forged owner UID |
| Approved owner | Owner RPC true; own reads/valid synthetic writes succeed; writes forging a different UID denied; no access to another UID's data |

Probe `orbit_owner_access`, `load_owner_snapshot`, `save_owner_snapshot`,
`publish_content`, `unpublish_content` directly where applicable. Do not publish
owner material as a test. Any denial probes must target only synthetic nonexistent
or run-owned IDs, so an unexpected authorization bug cannot alter real records.
Never send a destructive denied-save probe against a real owner's workspace:
first use an isolated synthetic workspace/transaction plan that cannot replace
real data, or leave that mutation case blocked for a separately approved fixture.

Configuration must be unreadable/unwritable by anon/authenticated clients;
`private.workspace_revisions` and `private.publication_sources` must not be exposed
through the public Data API. An unexposed-schema rejection proves endpoint
nonexposure, not internal RLS. Inspect effective grants/policies via a read-only
administrator query separately; do not expose `private` to make it testable.
With public reads false, anon/nonowner `published_content` returns no rows and
neither identity can publish/unpublish. Leave this gate false throughout; positive
public-view acceptance would require separate authorization.

## Failure handling

Stop on identity mismatch, unexpected public reads, private leakage, successful
unauthorized mutation, or unexplained data loss. Preserve minimal redacted evidence
and report the failing gate. No automatic owner reassignment, public toggle,
rollback, session revocation, provider change or deployment is authorized. If
assignment needs revocation, obtain separate approval for clearing only this exact
assigned owner UID while preserving cloud data and the false public gate.
