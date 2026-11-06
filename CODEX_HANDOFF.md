# ORBIT V6 → production: Codex handoff

## Current M3 work checkpoint

The owner authorized safe M3 release-readiness work under GitHub issue #2, without
merge, Production deployment, Auth/RLS/DNS/protection changes or live mutations.
M2.5 CI passed and its protected Preview is deployed per owner report; do not
repeat completed acceptance/setup. M3 branch `codex/m3-release-readiness` is stacked
on verified `9b54974`. See [checkpoint](docs/decisions/M3-READINESS-CHECKPOINT.md).
Issue #2's body is currently inaccessible (API Forbidden; HTML 404) and has been
requested from the owner. Do not substitute the historical roadmap or claim M3
GO until the actual plan is available and fulfilled. New work so far is audit and
documentation only. Preserve all accepted M2/M2.5 evidence and the original design.

## Current handoff: M2 accepted; M2.5 implemented on feature branch

On 6 November 2026 (Asia/Jakarta), the owner explicitly accepted **M2 for protected,
password-based private use**, with the documented unverified checks retained.
Owner assignment and public-read-disabled state are already confirmed. Do not
repeat assignment or onboarding, reopen completed acceptance checks, or change
hosted services as part of this handoff.

Verified application baseline: `DoorBlox/orbit`, main commit
`f2719f3b83c3ce906bee826576c134de15b35f6d`; local task branch `work`. Acceptance
reports and test additions are local workspace changes, not a claimed new commit,
merge, deployment or promotion. The original `hlarknnt/orbit-personal` repository
is excluded.

Read the [M2 → M2.5 handoff](docs/decisions/M2-TO-M2_5-HANDOFF.md),
[consolidated close-out](docs/decisions/M2-HOSTED-CLOSEOUT.md) and
[preserved evidence manifest](docs/evidence/m2/acceptance-20261106/manifest.json).
Hosted authentication/persistence/sync/conflict/logout and direct nonowner read
isolation passed per owner evidence. Local browser, unit, SQL and real Auth/API
suites passed. Physical-device and hosted write/CRUD authorization remain
unverified; do not describe local write tests as hosted certification.

**M2.5 P0/P1 are implemented and locally verified on
`codex/m25-motion-polish`.** The owner authorized autonomous implementation after
reviewing the audit. See [implementation/results](docs/decisions/M2_5-IMPLEMENTATION.md),
[verification evidence](docs/evidence/m2_5/implementation/verification.json) and
[prepared PR description](docs/decisions/M2_5-PR.md). Camera interruption, runtime
reduced motion, elapsed-time elasticity and touch handoff are fixed. The 156-test
required check, 25 motion browser cases and existing cloud suites passed. P2 was
deferred because no concrete usability evidence justified changing timing/panels.

The current feature branch includes the prior M2 evidence checkpoint plus separate
motion commits. Main is not modified; no merge, deployment or production promotion
has occurred. GitHub API access returned Forbidden; no PR creation or remote CI
success is claimed. Retain the six-window design and all security/persistence
invariants. Physical-device and inherited hosted write/CRUD gaps remain explicit.
No Production, Supabase/Auth/RLS, DNS or protection change is authorized.
Safe M3 readiness work is now authorized as recorded in the checkpoint above.

Current sequence: **M2 conditionally accepted → M2.5 implementation complete,
reviewable feature branch → M3 separately authorized release work**.

## Historical handoff context

The sections below preserve the original handoff and may describe capabilities as
not built or not connected. Those historical status statements do not supersede
the current acceptance record above or its linked evidence.

## 1. The product
ORBIT is a single-user personal spatial scrapbook with an arbitrarily deep radial constellation, actionable tasks, Premiere-like timeline and milestones, floating rearrangeable glass widgets, and a dated paper-like journal. One continuous 2D space contains **six movable/resizable widgets**: `timeline`, `constellation`, `active`, `completed`, `space`, `journal`. Responsive mobile, drag/resize, glass effects, task colors, completed-task history, CSV/JSON backup, editable journal dates, timeline journal markers and Markdown exports are already implemented in the **browser-only prototype**.

## 2. Source of truth and repository
- Original index, JS/CSS and SVG are checksum-recorded in `docs/reference/V6_SOURCE_MANIFEST.json` and preserved in Git commit `06f8039`. Current M1 sources, including new dates/backup helpers, are recorded in `docs/reference/M1_SOURCE_MANIFEST.json`.
- `ORBIT_Offline_Preview.html`: original self-contained local preview; **not** deployed. `scripts_build_preview.py` can regenerate it.
- `tests/test_csv.mjs` and `tests/qa_v6.py`: inherited baseline checks. `tests/cloud_mappers.test.mjs`: handoff adapter tests. `src/cloud/*`: isolated future cloud utilities **not wired** to runtime.
- `package*.json`, `scripts/*`, `vercel.json`, `.github/workflows/quality.yml`: static build and CI preparation. `npm run build` copies public original sources/assets to `dist`; no compilation/framework migration.
- `supabase/*`: seven-table draft schema and owner RLS, conditional synthetic development seed and pgTAP **presence** scaffold; no live deployment.
- `docs/01-PROJECT-OVERVIEW.md` through `docs/15-DECISIONS-AND-ASSUMPTIONS.md`: contracts, feature census, architecture, security, roadmap, decision logs. Historical design docs remain in `docs/` and preserved originals in `docs/reference`.

## 3. Functional versus planned
**WORKING ONLY LOCALLY:** world navigation, responsive spatial widgets, constellation, layout/elastic physics, quick capture, completion/reopen, editing, search, timeline/milestones, journal formatting/pages/autosave/date/timeline markers, CSV, JSON backup/restore.
**PREPARED ONLY:** npm static reproducible build, GitHub quality workflow, Vercel config, Supabase schema/policy/seed/runbook and mapper functions.
**NOT BUILT:** real sign-in/out, owner data authorization, remote persistence, real-device synchronization, error/retry/conflict control, online reminders, Google Classroom, Pomodoro, secure attachment storage, production monitoring. Do not claim production readiness.

## 4. Architecture decision
Keep static browser ES modules. At milestone M2 use exact-version Supabase JavaScript SDK and build-time public configuration; implement protected Auth gate before mounting any private data, then owner-RLS-backed repository methods. No sensitive secrets go to the browser; UI remains unchanged unless correcting a proven issue. Proposed SQL schema has composite FKs to avoid cross-owner branch references. No binary Storage bucket because V6 only links to external URLs.

## 5. Quality and safety gates
1. M0: verify source hashes and build/unit/browser baselines (`CODEX_FIRST_TASK.md`). No design or infra changes.
2. M1: accessibility/functional stabilization and actual-origin E2E.
3. M2: disposable local Supabase database, execute and test **draft migration**, Auth and RLS owner-isolation tests; no remote writes.
4. M3: vertical slices replacing `localStorage` for owner tasks, branches, journal, milestones, layout and preferences, with explicit data import consent.
5. M4: security, failure/recovery, accessibility and stress tests; prevent XSS and cross-owner leaks.
6. M5: private GitHub repo, checks and Vercel preview protection, manual prod checklist.
7. M6: authorized staging/production release, verified smoke, monitoring, rollback.

See every milestone's scope, dependencies, files, commands, acceptance and rollback in `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`.

## 6. Known caveats
- Node syntax check ≠ ESLint/TypeScript; only import/parse consistency.
- Browser QA via `page.set_content` and mocked localStorage is not real HTTP-origin or physical Safari evidence. Add these.
- Supabase CLI/Docker/psql not available in handoff authoring environment: migration, pgTAP, key/RLS/role isolation and Supabase config must be executed/validated later.
- GitHub Actions itself, Vercel deployment, mobile hardware, OAuth, app data sync not yet verified.
- V6 `document.execCommand` journal editing and HTML sanitization are functional prototype choices, but not security-reviewed enough for cloud-synced private diary.
- `.env.example` is a documented future config only; currently ignored by frontend.
- License is unspecified, therefore no LICENSE file was invented. Keep repository private.

## 7. Next safe action
Review the M1 PR and evidence. Keep the deployment hold. Authorize the local-only M2 foundation separately when ready; no live database or deployment action is implicit.
