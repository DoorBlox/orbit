# Changelog

## 9 Nov 2026 — ORBIT 2.2 beta LIVE on Production (latest source of truth)

- **Serving Production:** canonical `https://orbit.starscene.com/` now maps to Vercel READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, exact reviewed source `de2523dcea497c7ee41547ca94c14f48c72688f1` (merged [PR #25](https://github.com/DoorBlox/orbit/pull/25), all four exact-head checks passed). Server-side production build completed with Supabase cloud config; unauthenticated GET returns HTTP 200 and no private journal text. The name `2.2 beta` describes the app feature release; package.json's legacy version value has not yet been revised.
- **Protection and domains:** Vercel Authentication changed from `deploymentType=all` to `prod_deployment_urls_and_all_previews`; **custom Production domain is public only for the Supabase Auth sign-in shell**, Preview and raw deployment URLs remain Vercel-protected. Secondary `orbit.allintime.space` remains a redirect to `orbit.starscene.com`. Vercel automatic custom-domain assignment was disabled during staging; custom canonical alias was reassigned explicitly, not automatically.
- **Rollback checkpoint:** prior READY owner-only 1.0.0 deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. If an Auth or privacy failure is detected, first restore Vercel SSO `deploymentType=all`, then reassign canonical `orbit.starscene.com` to that old deployment; verify secondary redirect and owner content. Do not overwrite/restore database without a separate instruction.
- **Supabase:** owner-approved hosted migrations `orbit_private_extensions` and `orbit_private_media` were applied; Google Auth verified on two distinct controlled accounts; first account retains 23 branches, 29 tasks and one journal. Second account started empty. Authenticated-role hosted DB tests validated private extensions and per-user Storage SELECT/INSERT isolation; temporary test fixtures were rolled back. One live second-account beta workspace now has test notes/images (three Storage objects observed).
- **Known beta defect:** [#26](https://github.com/DoorBlox/orbit/issues/26) — attached note and journal image references persist but images **do not render**. Production's exact CSP has `img-src 'self' data:`, blocking signed image URLs from `https://ixfgavgtwuzdgucjriec.supabase.co`. Keep the Storage bucket private; fix via a narrowly reviewed CSP allowlist patch and matching production-guard/tests. The owner explicitly accepted launch with this known bug. Drawings in both journals and notes persist and display; scene editor is a lightweight pen and `.excalidraw` file interchange, **not** full embedded Excalidraw.
- **Operational follow-up:** source of truth for release is this current checkpoint; older sections below are historical even where they say "not deployed". Track remaining beta gates and issue #26; verify live user sign-in and media display after its patch. Respect budget: batch future changes, avoid repeated Actions/workflow dispatch.


## 2.2.0 beta — Production deployment (9 November 2026)

- Added Google-first sign-in button with existing legacy password login preserved; Google Cloud OAuth client and Supabase Google provider are not configured by repository code and remain owner setup.
- Tasks can carry several validated labeled supporting URLs; sticky notes are freeform editable draggable/resizable paper cards with four colors, shared drawing and optional images.
- Journal pages and sticky notes exchange the same validated .excalidraw JSON through a built-in native pen modal and external Excalidraw.com import/export. Full upstream embedded Excalidraw React editor is **not** included yet.
- Proposed additive tenant-private preferences extensions and per-user Storage bucket (5 MiB PNG/JPEG/WebP, short-lived signed URLs), pending hosted migration and real A/B isolation. Backups contain image reference paths but not image bytes.
- **Released:** source `de2523d` on READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, canonical `orbit.starscene.com`. Production custom hostname uses Supabase Auth, while Preview and raw deployment URLs remain Vercel-protected. Two tenant-private hosted migrations were applied with owner approval. Known defect [#26](https://github.com/DoorBlox/orbit/issues/26): uploaded images persist but cannot display under current CSP. Original v1 release remains ready for rollback. [Operator runbook](docs/OAUTH_2_2_ROLLOUT.md).


## 2.1.0 — Unreleased, source-only development (9 November 2026)

- Removed the obsolete LOCAL PROTOTYPE header caption without changing the WIB clock.
- Added branch-level expand/collapse, ArrowLeft/ArrowRight keyboard disclosure, expand-all/collapse-all controls and compact constellation layouts. View state is saved per account in the current browser and included in full backups; it is deliberately not cloud-synced yet.

## 2.1.0 — Unreleased, source-only development (8 November 2026)

- Space now offers one import action for tasks CSV, hierarchically validated branches CSV, journal-page JSON selection, or full JSON backup. Selective export supports tasks/branches CSV, journals-only JSON and full-space JSON; branch imports preserve stable IDs, detect conflicts/cycles and require explicit confirmation.

- Fixed full-backup restoration of per-user Space names; local prototype mode now persists a renamed Space with validated, recoverable storage. Older V5/V6 backups without a profile preserve the current title.

- [PR #18](https://github.com/DoorBlox/orbit/pull/18): removed the persistent signed-in cloud dock and moved account, sync and backup actions inside the draggable Space widget; retained signed-out access gate and safe teardown.
- [PR #19](https://github.com/DoorBlox/orbit/pull/19): proposed inline account-specific Space naming, saved in the existing workspace profile and reflected in the constellation center.
- **Not deployed.** The live app still serves reviewed 1.0.0 source `fc5af5a` with Vercel Authentication.

## 2.0.0 — Unreleased multi-user code; hosted tenant schema prepared (8 November 2026)

- [PR #14](https://github.com/DoorBlox/orbit/pull/14) and stacked [#15](https://github.com/DoorBlox/orbit/pull/15) merged: tenant-isolated private RLS, owner-only publishing distinction, authenticated workspace snapshots, and Supabase email/password signup UI.
- Hosted Supabase migration `20261108161935 orbit_tenant_private_workspaces` applied; exact pre/post row counts unchanged, all seven private-table tenant policies installed, `orbit_workspace_access` present.
- Verified existing branch protection [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) active.
- **Not a Production release:** no visitor signup enablement, no Vercel public access transition, no new custom-domain promotion. Hosted end-to-end multi-account acceptance remains pending.


## 1.1.0 — Unreleased (source-only foundations merged 8 November 2026)

- Merged [PR #12](https://github.com/DoorBlox/orbit/pull/12): constellation root follows the workspace profile rather than hard-coded name; safe branch deletion with child/task preservation, confirmation and undo.
- Journal pages sort by civil date with stable page selection and navigation controls updated immediately after date edits.
- Expanded constellation fits the current viewport independently of stored canvas dimensions and restores its saved size afterward.
- Added targeted unit/browser regression coverage and reviewed current source hashes. All four exact-head CI checks passed prior to merging.
- **Not deployed.** ORBIT 1.0.0 remains owner-confirmed Production, built from `fc5af5a`.
- Multi-user tenant SQL, signup, Excalidraw, media, MCP and other 2.x work remains in separate unmerged PRs and documented blueprint. No live RLS, Auth or Vercel protection changes.


## 1.0.0 — 7 November 2026 — Protected Production release

- Shipped the reviewed spatial scrapbook to `https://orbit.starscene.com/` with Vercel Authentication enabled and owner-only Supabase RLS. The secondary `https://orbit.allintime.space/` redirects to canonical. Owner verified sign-in, private workspace and redirect.
- Preserved original six-window V6 identity, cloud-backed private journal/task state, V5/V6 JSON recovery and M2.5 motion fixes.
- Merged reviewed source/artifact security guards, least-privilege database migration, failure-safe sign-out recovery, and controlled manual Production staging (`--prod --skip-domain`).
- Verified hosted nonowner seven READ / seven INSERT rejections; separately added free disposable local Supabase CI with 205 SQL checks and authenticated 7 READ / 14 PATCH / 14 DELETE denials.
- Published source under the MIT License (copyright 2026 DoorBlox) **without publishing owner data**; added Production artifact and anonymous-access CI checks.
- Recorded remaining test limitations rather than claiming full hosted PATCH/DELETE, physical-device, Google OAuth/OTP or post-auth security-header certification. See [current release record](docs/releases/1.0.0.md) and [operations](docs/OPERATIONS.md).

## Historical release preparation and earlier versions

## 1.0.0 prelaunch candidate — 2026-11-06 (historical checkpoint)

- Preserve accepted M2 private cloud functionality and M2.5 motion fixes.
- Fail closed when Production cloud configuration is absent, unreviewed, mismatched or development-scoped; enforce exact private CSP before artifact replacement.
- Verify committed release artifacts, inventory, native files and rebuilt SDK integrity; never print keys.
- Prepare offline-only nonowner CRUD fixture plans; no hosted mutations or Auth/RLS changes.
- Add release guard/plan tests, complete private recovery browser CI coverage, and reconcile release notes, security findings, backup/rollback and remaining launch gates.

## M2.5 Motion Polish — 2026-11-06

- Give manual wheel, zoom and keyboard camera input priority over navigation.
- Resolve active motion when reduced motion is enabled and cancel animation handles on teardown.
- Preserve 60Hz elasticity with elapsed-time integration and bounded background catch-up.
- Continue graph pinch into one-finger pan without jumps; clear canceled gestures safely.
- Add 18 deterministic motion tests and 25 five-viewport Chromium cases to CI; preserve existing cloud regressions and source provenance.
- Preserve camera timing, CSS identity, widget persistence and Auth/RLS/sync; defer unsupported P2 visual changes. No deployment.

## M2 no-domain password acceptance — 2026-11-03

- Add temporary password sign-in; retain OTP and Google without changing UUID authorization or RLS.
- Verify the existing confirmed identity, document administrator password/owner setup, and distinguish hosted password acceptance from untested OTP delivery.

## M2 Email OTP patch — 2026-11-02

- Use existing-user Email OTP as the visible sign-in method; retain Google OAuth for future configuration.
- Preserve server UUID ownership/RLS and add cooldown, generic failures and stale verification cleanup.
- Document administrator enrollment, Magic Link Token template and hosted SMTP acceptance.

## M1 — 2026-11-01

- Protect corrupt local records, retain recoverable originals and surface failed saves.
- Validate and recover V5/V6 imports; harden CSV, clipboard HTML and static CSP.
- Fix six-window keyboard movement/focus, paper-label contrast and landscape reachability.
- Add milestone Remove/Undo and shared Asia/Jakarta civil dates.
- Add actual-origin regression tests, dual original/current source integrity and browser CI.
- Preserve vanilla spatial scrapbook UX; disable automatic Git deployment pending approval.

## Additional historical history

## 0.5.0 — 2026-11-01
- Replaced fixed page/grid scrapbook composition with independent draggable widgets on one spatial canvas.
- Added global pan, zoom, pinch and spatial navigator; widget layout persists on device.
- Adapted inner constellation pointer handling for an outer scaled camera.
- Added editorial journal pages, WYSIWYG, autosave, Markdown export, deletion and Undo, HTML sanitization.
- Expanded JSON backup to version 5: includes journal entries and spatial positions.
- Added responsive mobile-focused journal and no-overlap corner navigation/capture arrangement.
- Migrated prior Python browser tests to docs archive and added current V5 QA.

## 0.4.0
- Integrated timeline, active/completed task widgets and animated background into conventional scrapbook grid (superseded by V5 spatial layout).

## V6 — 2026-11-01

Window-like title bar dragging; per-widget persistent pointer/touch/keyboard resizing; milestone overflow correction with dedicated timeline lanes; clickable journal markers grouped by date; date-only journal editing and V5 ISO migration; compact mobile spatial navigator; full-backup sizes and V6 QA tests. Future deployment remains not yet executed.

### M3 reviewed shared-target follow-up

- Explicit owner-approved exception for shared project `ixfgavgtwuzdgucjriec` and
  protected `https://orbit.starscene.com/`; other targets and public mode remain rejected.
- Document exact Production environment/CSP/Auth requirements and shared-data risks.
  No live configuration, Auth/RLS/data or deployment changes. Issue #4 remains future work.

### M3 least-privilege release gate

- Add an unapplied additive migration revoking authenticated TRUNCATE/TRIGGER/
  REFERENCES on seven private tables; retain normal CRUD/RLS/snapshots/conflicts.
- Verify 58 new SQL assertions, grant-drift rollback, generated baseline-guarded
  fixture cleanup and real local Auth/API/browser regressions. No live changes.
- Record owner-confirmed `552720b` CI PASS and PR #3; consolidate Production/Auth
  checklist and remaining live authorization/verification gates.
