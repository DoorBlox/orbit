# ORBIT post-2.4 — execution blueprint and audited backlog

**Established:** 9 November 2026. **Source audit baseline:** main b8f76a6ee4660c135ec0e2604915a6b96097f664; live app 4e57aca785259192b92010c5d0e1634a4c1efe14. **User decision:** proceed with documentation and BP-00–BP-06 reliability foundation. Full official Excalidraw is a top product priority, not a low-priority indefinite option. This blueprint plans work; individual production, hosted-data, provider and paid actions retain separate approval gates.

See [current state](../docs/CURRENT_STATE.md), [documentation protocol](../docs/DOCUMENTATION_PROTOCOL.md), [operations](../docs/OPERATIONS.md), [visual evidence](../docs/DESIGN_EVIDENCE_PLAN.md) and [Issue #31](https://github.com/DoorBlox/orbit/issues/31). Historical [2.0–2.3 blueprint](ORBIT_2_0_BLUEPRINT.md) is preserved as a record, not as current orders.

## Decisions locked for this sequence

1. **Preserve ORBIT's identity:** no universal React/Next.js rewrite, no cards/sidebar dashboard replacing the one freeform, draggable six-window spatial world. Retain native ES modules and existing layout coordinates, signed-in privacy and offline/local compatibility.
2. **Safety before destructive features:** private images are not fully portable in current JSON backup; do not migrate/delete Storage objects or rewrite snapshots before designing and validating recovery.
3. **Performance evidence before architecture replacement:** CAS snapshot conflict detection stays until a tested alternative is demonstrably safer. Polling and expensive clone work are optimization targets, not permission for last-write-wins.
4. **Excalidraw fast track:** EX-00 package/API/visual feasibility with synthetic scenes starts in parallel with foundation; EX-01 real editor for shapes/pen/text in both hosts starts after media-backup design and UI baseline; EX-02 image integration only after reference-safe media and portability. Issue #31 stays open until full acceptance. No editor package on initial sign-in.
5. **Cost and CI:** no paid providers without consent; stage once after exact-head review and explicit release go-ahead; do not trigger extra manual test runs merely to generate green badges.
6. **Historic documents are archives, not commands.** Version strings are distinct: app label 2.4, npm 1.0.0, backup schema 6, migration IDs.

## Status definitions

PROPOSED = specified only; READY = prerequisites/research sufficient; IN PROGRESS = active bounded changes; BLOCKED = needs user/external prerequisite; SOURCE MERGED = tested and merged to main but not necessarily deployed; RELEASED = mapped to actual Production source; VERIFIED = all stated acceptance evidence captured; DEFERRED = intentionally parked. No work unit advances to VERIFIED solely on reading source.

## Immediate work order

**Now:** BP-00 docs/handoff consolidation in one docs PR; BP-00 metadata/version harmonization is **not yet performed**, since scripts expect 1.0.0.

**Next independent lanes:** BP-04 read-only migration-history/source comparison, BP-01 owner-assisted authenticated image acceptance, BP-06 synthetic visual/performance baseline planning, and EX-00 official Excalidraw compatibility research. Work can be prepared independently but PRs touching shared files must be serialized.

**Then:** BP-02 media-inclusive portable backup with restore rehearsal; BP-03 cost-aware synchronization. BP-05 release workflow modernization once BP-00 is recorded; no generic deployment until reviewed. The 2.5 design and Excalidraw streams follow their specific gates.

## BP-00 through BP-06: detailed execution contracts

### BP-00 — current truth, docs and version vocabulary

- **Status:** IN PROGRESS / documentation-first substep. **Prereq:** merged 2.4 release record PR #34.
- **Value:** next session can identify actual Production, what shipped, what did not, and one safe next task in under five minutes.
- **Surfaces:** docs/CURRENT_STATE.md, docs/DOCUMENTATION_PROTOCOL.md, CODEX_HANDOFF.md, AGENTS.md, README.md, docs/ROADMAP.md, docs/decisions/README.md; later package.json and release guard scripts only in a separate code-bearing version PR.
- **Implementation:** one canonical state page; a 17-unit plan; visual baseline brief; short links from handoff/AGENTS/README; old status paragraphs clearly historical. Maintain historical M0–M6 evidence unmodified. Reconcile #2/#4/#22 against actual source and owner evidence, do not close reflexively.
- **Acceptance:** current pages agree 2.4 is live; distinguish source SHA, docs SHA, deployed artifact, backup schema 6 and npm 1.0.0; old version artifacts cannot be accidentally deployed as 2.4; links and changed-files-only diff reviewed.
- **Evidence/rollback:** docs-only PR diff + four required exact-head GitHub statuses; revert docs commit, never change live Production for a docs-only PR.

### BP-01 — prove private images on real signed-in Production

- **Status:** BLOCKED on owner/browser evidence. **Issue:** #26. **Prereq:** confirmed current READY 2.4 alias and controlled owner + second account.
- **Surfaces:** src/cloud/media.js, src/stickies.js, src/app.js journal image preview, Auth/CSP in vercel.json and scripts/production-guard.mjs; only edit code if a concrete reproduction warrants it.
- **Procedure:** using disposable images and controlled accounts, upload PNG/JPEG/WebP into a sticky and journal, verify display, reload, sign out/in; record error/retry and denied cross-account path behavior. Capture network response *status only*, stripping tokens and paths from retained evidence.
- **Acceptance:** image pixels display in both hosts immediately and after reload; account isolation, detached references, logout Blob revocation and no anonymous data leak. A failure remains an open bug with narrowed evidence; do not mark #26 resolved.
- **Rollback/permission:** source-only narrow fix if needed; never make bucket public, weaken RLS, delete objects, change Auth origins or expose signed URL. Owner must perform or authorize a browser session; do not impersonate accounts.

### BP-02 — actual portable recovery, including image bytes

- **Status:** PROPOSED. **Prereq:** BP-01 inventory/behavior and current backup parser review.
- **Surfaces:** src/backup.js, src/cloud/media.js, src/cloud/owner-tools.js, src/app.js, tests/backup.test.mjs, tests/media.test.mjs; optional versioned archive manifest.
- **Implementation:** explicit warning that current JSON export includes image paths only; design fully portable ZIP-like export with manifest, individually fetched private files, checksums and limits; import preview and controlled remap to a disposable target account. Preserve old format reader.
- **Acceptance:** synthetic backup/export/restore roundtrip, image bytes and hashes validated, no foreign-user path trusted, no incomplete import silently accepted; owner can recover original journal, checklist, drawing and private media references after roundtrip.
- **Rollback/permission:** additive backup path; no live storage deletion, no actual owner data export to public CI artifact; test import against synthetic disposable account, user confirmation for overwrite.

### BP-03 — low-cost, visibility-aware cloud sync

- **Status:** PROPOSED. **Prereq:** BP-02 backup escape hatch and stable current snapshot contract.
- **Surfaces:** src/cloud/sync.js, src/cloud/repository.js, tests/cloud_sync.test.mjs, tests/cloud_repository.test.mjs, browser multi-tab fixtures; possible read-only revision RPC only after BP-04 migration gates.
- **Implementation:** measure current calls and JSON bytes using synthetic snapshots; pause or adapt polling when page hidden, offline or on constrained connection; use focus revalidation and optional cheap revision check where genuinely valuable. Keep the current CAS revision logic and unsubmitted draft warning.
- **Acceptance:** exact no-lost-edit conflict tests, foreground 2-device refresh, hidden-tab quietness, offline/reconnect and logout cancellation, lower baseline request count, no auth or RLS expansion.
- **Rollback:** feature-flag interval/fallback; original CAS API remains functional, no auto-merge of conflicting drafts.

### BP-04 — reconcile migration ledger without touching Production data

- **Status:** READY for **read-only discovery**, NOT ready for migration writes.
- **Surfaces:** supabase/migrations/*.sql, supabase/config.toml, supabase/tests/*.sql, docs/OPERATIONS.md; hosted migration ledger and SQL definitions through read-only connector queries.
- **Implementation:** map seven local descriptive migration names to seven hosted migration version IDs; compare applied SQL objects/functions/grants/storage policy against a clean local replay. Record exact differences and recovery strategy. If migration tools interpret filenames differently, define a safe reconciliation approach and independent acceptance review.
- **Acceptance:** evidence-backed parity report with per-version local/hosted mapping, no false claim of identical SQL until checked; fresh disposable local database builds and isolated pgTAP pass before any future hosted migration.
- **Rollback/permission:** this work unit must issue NO remote DDL/DML, migration history repair or production db push; separate explicit approval and backup for future hosted mutations.

### BP-05 — retire or safely modernize the old 1.0 release job

- **Status:** PROPOSED. **Prereq:** BP-00 and existing branch rules/protection confirmation.
- **Surfaces:** .github/workflows/m6-stage-only-production.yml, m6-release-dry-run.yml, scripts/verify-release.mjs, scripts/production-guard.mjs, docs/OPERATIONS.md.
- **Implementation:** old manual staging workflow pins fc5af5a and expects version 1.0.0; first disable/archive misleading usage in documentation, then design SHA-parameterized gated staging with no implicit custom domain reassignment. Separate source-verified artifact build from Promotion and Auth/CSP/no-private-content checks.
- **Acceptance:** synthetic dry-run checks correct reviewed ref, expected site and protection, hashed artifact, no secret output and no custom alias changes; required four status checks remain enforced.
- **Rollback:** restore previous workflow file if gate is faulty; no Production staging or alias changes as part of workflow refactor without separate approval.

### BP-06 — real UX, accessibility, visual and performance baseline

- **Status:** PROPOSED (planning can start now). **Prereq:** fake/sample data and baseline ref.
- **Surfaces:** index.html, src/styles.css, src/board.js, src/constellation.js, src/widgets.js, src/journal.js, src/stickies.js, existing tests/qa_m1.py/qa_m25.py, new synthetic fixtures only.
- **Procedure:** synthetic desktop and 320/375/390/768/1440px captures; all ten themes; 174/200% browser text zoom; keyboard and focus; VoiceOver/TalkBack and physical Safari/Android when available; normal/reduced motion, light/dark contrast, 30/100/300-task rendering and drawing frames. Use Lighthouse/axe locally only where useful.
- **Acceptance:** versioned nonprivate screenshot and issue matrix with severity and reproduction, zero newly introduced P1 browser regressions; explicitly label real-device cases NOT RUN until done. No invented Lighthouse scores.
- **Rollback:** test-only work; do not churn theme CSS, add global animations or rewrite interaction before data supports it. See [visual brief](../docs/DESIGN_EVIDENCE_PLAN.md).

## BP-07 through BP-16: subsequent reviewable slices

| ID | Status / dependencies | User value and target surfaces | Acceptance and rollback |
| --- | --- | --- | --- |
| **BP-07** | PROPOSED; BP-06 | Coherent semantic CSS tokens and specificity reduction, src/styles.css and theme selectors. | Ten themes, contrast and snapshots hold at 320/1440; preserve saved theme IDs, revert changed CSS slice only. |
| **BP-08** | PROPOSED; BP-06 | Optional phone Focus mode and offscreen-window recovery, src/board.js, src/app.js, index.html. | Exact camera/layout restoration, keyboard/touch/back navigation, no forced dashboard; feature-toggle rollback without coordinate changes. |
| **BP-09** | PROPOSED; BP-03 | Defer heavy whole-snapshot cloning until commit and measure write cost, src/app.js, src/cloud/sync.js, repository. | Synthetic 100+ tasks have lower long-task time/bytes without new conflicts; restore original CAS flow if metrics regress. |
| **BP-10** | PROPOSED; BP-06 | Draw via bounded rAF/dirty-state and cap Blob cache lifetime, src/scene.js, src/cloud/media.js. | No lost pointer samples, correct 60/120Hz and logout revoke, test with synthetic drawings; fallback renderer retained. |
| **BP-11** | PROPOSED; BP-02, BP-06 | Pilot native-compatible structured text editor (Lexical vs ProseMirror), src/journal.js, export/sanitizer/IME tests. | Old HTML roundtrip, XSS, undo, keyboard and CJK IME pass; do not migrate real user journal bodies before proven. |
| **BP-12** | PROPOSED; BP-01, BP-02, BP-04 | Private library, thumbnails and reference-safe detach/delete (#29), storage adapter, src/cloud/media.js, scoped RLS/tests. | A/B isolation and reference veto with restore rehearsal; no automatic Storage delete or paid R2 switch. |
| **BP-13** | PROPOSED; EX-00, EX-01, EX-02 | Full Excalidraw for journal and stickies (#31), bounded lazy editor island + scene adapters and optional private image assets. | Real upstream controls/undo/text/shapes, saved old scenes unchanged, low sign-in bundle cost, all themes/touch; native-pen fallback kept. |
| **BP-14** | PROPOSED; BP-03 | Client-only calendar ICS export before reminder integrations; dates.js, task/timeline export. | ICS imports, civil time and timezone stable, no OAuth/provider cost; drop export UI to roll back. |
| **BP-15** | PROPOSED; BP-04, BP-09, separate OAuth threat model | Read-first user-scoped remote MCP (#32), service endpoint, OAuth PKCE/revocation, per-user RLS. | Tool scopes, identity and A/B tests, journal opt-in, rate limits; disable/revoke tokens; no service-role bypass or implied free hosting. |
| **BP-16** | PROPOSED; BP-06 stable fixtures | Cost-aware required GitHub Actions status-preserving changes; true lint/type checks, .github/workflows and package scripts. | Required four contexts never go missing; docs-only PR saves browser install minutes; fallback to previous workflow. |

## Excalidraw acceleration (owner priority)

**EX-00 — Research/prototype, READY after BP-00:** inspect package lock and maintained official Excalidraw release/API documentation; map the current native scene v2 (src/scene.js, app extensions), journal/sticky editor interfaces, theme tokens, licensing and build. Prototype **only with synthetic scenes**; optional isolated local artifact, no production data, Auth or service changes. Document compatibility, JSON/file constraints, sign-in bundle budget and screenshots. Can run in parallel with BP-01/BP-04/BP-06 and does not require waiting for all UX work.

**EX-01 — Native host integration, BLOCKED by BP-02 recovery design + BP-06 baseline + EX-00:** dynamically load official Excalidraw React/ReactDOM as a component island only when editing journal or sticky drawing; actual upstream pen/text/shape/undo and safe Save/Cancel, theme-aware paper canvas, backward-compatible old scene reader. No external runtime CDN. Initially reject embedded image files rather than injecting large base64 into Postgres. Keep native pen fallback; issue #31 remains OPEN during partial rollout.

**EX-02 — Image/media completion, BLOCKED by BP-12 + EX-01:** use verified private image attachments and export/restore, per-owner authorization, reference tracking and file-size checks; test cross-account isolation and undo, import/export of Excalidraw scenes with attachments, all themes and mobile. **Only here** can issue #31 close if complete acceptance is actually documented. Do not block EX-00 or safe image-free EX-01 on building a full media gallery.

**Why split:** the prior audit treated BP-11 and BP-12 as strict prerequisites to all of BP-13. They are truly critical to durable structured journal data and image-file support, but they are not necessarily prerequisites to a **synthetic feasibility prototype** or image-free shapes/text editor. This explicit dependency revision honors the owner's desire for Excalidraw soon without introducing an unsafe hidden migration.

## Audit register (source-first, not invented runtime errors)

| Evidence ID | Severity | Confirmed source fact or outstanding validation |
| --- | --- | --- |
| A01 | P1 | src/cloud/sync.js polls full owner snapshots every 15s while active; nominal 240 reads/hour/tab before throttling, actual cost unmeasured. |
| A02 | P1 | src/app.js getSnapshot and src/cloud/repository.js use whole-workspace CAS snapshots; unrelated edits can conflict safely but coarsely. |
| A03 | P1 | JSON backup contains image object paths, not physical files. |
| A04 | P1 | #26 real-account display acceptance remains unverified despite new Blob preview implementation. |
| A05 | P1 | Hosted migration version prefixes differ from Git filenames; schema drift NOT established. |
| A06 | P1 | README/ROADMAP/historical files repeat out-of-date release labels after current checkpoints. |
| A07 | P1 | Old stage workflow pins 1.0 release SHA; cannot serve as generic 2.4 deploy tool. |
| A08 | P2 | npm package 1.0.0, app label 2.4 and backup version 6 must remain clearly distinguished. |
| A09 | P2 | ~110 KB stylesheet, many specificity overrides and ten-theme quality surface; visual defect not proven. |
| A10 | P2 | Static markup lacks h1, some small labels/controls; full assistive-tech verdict requires browser testing. |
| A11 | P2 | journal.js uses deprecated document.execCommand; undo/IME compatibility still unverified on physical mobile. |
| A12 | P2 | scene.js repaints SVG on each pointermove; FPS impact unmeasured. |
| A13 | P2 | Build copies most ESM/CSS unminified; first gather transfer/parse metrics. |
| A14 | P2 | No trustworthy live client Web Vitals / JS error baseline in this audit. |
| A15 | P2 | CI browser downloads on docs-only PR while RLS job already has a scope skip. |
| A16 | P2 | Private Blob preview URLs stay cached until workspace disposal; memory impact unmeasured. |
| A17 | P2 | Google-first shell has less discoverable password/reset/onboarding paths. |
| A18 | P2 | Dense Space/journal controls on small viewports need source+visual/device review. |
| A19 | P3 | Automated browser a11y/screen-reader coverage incomplete, although keyboard work exists. |
| A20 | POSITIVE | Seven tenant-authenticated policies are RESTRICTIVE and per-owner policies remain; no cross-tenant bypass confirmed from RLS metadata. |

## Quality and security gates for EVERY implementation PR

- Re-read [current state](../docs/CURRENT_STATE.md), AGENTS, handoff and exact relevant modules first; inspect existing helpers/test coverage before adding a dependency.
- Name issue/BP/EX, baseline main SHA, feature scope, file list, data schema impact and rollback. Use exact-head CI once when code is ready; keep required status contexts, local pgTAP/HTTP RLS for security changes and targeted browser tests for UI.
- Tests must use synthetic fixtures, preserve existing V6/M1 historical source manifests, avoid secrets/private journal in artifacts. For all UI work validate keyboard, mobile, contrast, reduced motion, 10 themes and paper/editor interactions.
- For any production release, require staged READY deployment with exact SHA, protected Preview checks, explicit approval of the custom-domain change, post-promotion HTTP/privacy and signed-in owner acceptance, and documented rollback. PR merge and deployment are separate permissions.
- For SQL/Auth/Storage/billing changes, secure explicit scope-specific owner authorization and backup. A code rollback does not restore deleted journal or image data.
- At closeout, update only affected current-state/operations/roadmap/handoff/evidence records per [protocol](../docs/DOCUMENTATION_PROTOCOL.md); mark PASSED/FAILED/NOT RUN honestly.

## Recommended next session

First take **BP-04 read-only migration parity** (no production writes) and queue a concise, redacted owner checklist for **BP-01**. Begin EX-00 official Excalidraw compatibility comparison using current source with no dependency changes. Request optional synthetic screenshots per [visual plan](../docs/DESIGN_EVIDENCE_PLAN.md). No refactor/rewrite, R2, MCP, hosted migration, image deletion or Production alias change in these research steps.
