> **12 Nov BP-10 source progress:** [PR #83](https://github.com/DoorBlox/orbit/pull/83) exact head `6144874` passed all four required checks; source squash `93402c2`. Fallback pen records every coalesced stylus/pointer sample while rendering at most once per frame, flushes on release, cancels during Excalidraw handoff and disposal. Synthetic 60/120Hz/flush tests added. BP-10 **PARTIAL SOURCE MERGED**; private Blob preview cache lifetime/cap and physical-device profiling remain OPEN. No Production or hosted-data changes.

> **12 Nov BP-09 source closeout:** [#81](https://github.com/DoorBlox/orbit/pull/81) merged `c55c5aa` after 4/4 exact-head CI. `queueOwned` in `src/cloud/sync.js` adopts a detached UI snapshot and avoids the redundant clone; generic callers and repository save boundary remain defensively cloned and CAS-safe. This is a validated single-clone reduction, NOT a verified real-device speed improvement. BP-09 profiling/other clone sites remain open. Independently verified `orbit.starscene.com` still READY Production on `4e57aca` deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`; latest Preview READY `01c153d` does not include BP-09 yet.

> **12 Nov 2026 sprint continuation:** BP-08 optional view-only Focus source [PR #79](https://github.com/DoorBlox/orbit/pull/79) merged `01c153d` (all 4 exact-head CI SUCCESS, Node + five-viewport browser). It restores camera and original widget inert flags, never updates cloud coordinates; mobile physical acceptance pending. Integrated protected Preview `dpl_8eBFFLzLHa1Vz1edQG5wqXmL5Eb7` READY, [open here](https://orbit-83nft6djg-doorbloxs-projects.vercel.app/), target Preview and exact source `01c153d`, not Production. BP-04 read-only hosted audit: seven migration IDs still match prior verified mapping, all eight public base tables show RLS enabled. Supabase advisor notes disabled leaked-password protection (WARN) and policy-free `private.orbit_configuration` (INFO; likely deliberately private, not automatically a defect). Do not treat this as full function/grant/storage object parity or authorize an Auth policy mutation without review. This note supersedes historical BP-08 proposed-only status; its mobile Focus slice is SOURCE MERGED, real-device acceptance is open.

> **12 Nov 2026 LIVE BP sprint — exact-source checkpoint:** BP-07 inline editor recovery [#75](https://github.com/DoorBlox/orbit/pull/75) merged `41a7fde` with four exact-head checks; BP-16 CSS structure check [#77](https://github.com/DoorBlox/orbit/pull/77) merged `1e336712` with four checks; BP-14 client-only ICS export [#76](https://github.com/DoorBlox/orbit/pull/76) merged `988094fa` with four checks. BP-14 is SOURCE MERGED (real app import to calendar not yet owner-verified); BP-16 now PARTIAL SOURCE MERGED (CSS grammar delimiters yes, semantic/style/a11y lint not complete); BP-07 inline Edit/Preview and original Excalidraw are SOURCE MERGED (full semantic theme refactor and owner device/private-media acceptance unfinished). The older table marking BP-07/BP-14 as merely PROPOSED describes the 10 Nov snapshot and is superseded. Production remains separate from current main; no hosted data or domain actions in this sprint. The protected [BP-07 Preview](https://orbit-276t31f1e-doorbloxs-projects.vercel.app/) is an older reviewed source SHA `f78e9e7`, not an integrated BP-14/BP-16 release.

> **11 Nov 2026 EX-02 P0 progress:** [source #71](https://github.com/DoorBlox/orbit/pull/71) MERGED `264aaef4db3d2fa3b8f8c439ef7cee709ff2724d` after 4/4 required checks. Owner-private image elements in official Excalidraw, no binary in workspace snapshot, uploads before Save, checksummed .orbit export/restore of all canvas image paths and owner remapping are source-complete. [SSO Preview](https://orbit-odh6ir7se-doorbloxs-projects.vercel.app/) READY `dpl_B7cHefd7bwnsG5N4WgUYRZUcnVX4` (`ae898793`, Preview). EX-02 is still PARTIAL until real signed-in upload/save/reopen/restore, second-account isolation, physical touch and binary-bearing standalone .excalidraw interchange receive acceptance. Production remains 4e57aca/dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4. Do not close #31 or promote on synthetic evidence only.

> 11 Nov 2026 verified source/Preview: PR #67 (0b3c32c), #68 (fb952a9), #69 (dbb7a8b52464df6181a6b33f6c10819d5d6b5e62) SOURCE MERGED with four exact-head required CI checks PASS per PR. Protected Preview https://orbit-80asn3gii-doorbloxs-projects.vercel.app/ READY dpl_Hzo1mLVqDxBDjd81gKt5U1BupABg from exact 1ffb3cea98c42dc08e187c625e7437ae9927fd5c, target=null, SSO on. Production still 4e57aca / dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4. New UI: simplified Space, Sticky and Journal Write/Canvas, full official Excalidraw, out-of-graph task inspector, improved hybrid touch. Next P0 EX-02 in-canvas private images + portable backup; real signed-in saved status, cross-account and real touch acceptance unverified. Keep one master BP roadmap.

> **Unified master execution roadmap, 10 Nov 2026.** BP-05 legacy staging removal [PR #57](https://github.com/DoorBlox/orbit/pull/57) merged (4/4 required checks, squash 416d301f). The additional Projects, publishing, Focus and UX directions are now first-class units **inside this original BP roadmap**. Source/Preview are not Production.

> **Source status update (9 November 2026):** EX-01 SOURCE MERGED [#41](https://github.com/DoorBlox/orbit/pull/41) (`cbb6d405`), four green CI checks. BP-03 first visibility-aware polling slice SOURCE MERGED [#42](https://github.com/DoorBlox/orbit/pull/42) (`7440ebe0`), four green checks. Foreground full snapshot reads remain; no real signed-in/multidevice Production acceptance. EX-02 embedded private images and full preview fidelity remain TODO. Neither PR deployed Production. Historic statuses below are superseded by this checkpoint.

# ORBIT — unified post-2.4 execution roadmap (BP-00–BP-16 and integrated features)

**W5 reconciliation (12 November 2026):** Live Production remains **ORBIT 2.4**, independently verified canonical Vercel alias `orbit.starscene.com` → READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, source `4e57aca785259192b92010c5d0e1634a4c1efe14`. Latest W5 observed GitHub main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00` is later **SOURCE ONLY**. Source merges, CI and localhost MCP **are not Production**, and owner/device acceptance remains pending. Requery all state before release.

**Current authoritative status mirror:** [PROGRESS.md](../docs/PROGRESS.md). The dated 10 November ledger and priority queue below are historical baselines; their outdated PROPOSED cells do not override later merges. Current source: BP-08 [#79/#133], BP-14 [#76], BP-15 localhost [#156/#159], BP-11 [#144/#151/#157], PJ-03 [#88/#93/#97] and BR-01 [#86] are already implemented in source at least partially. Immediate active PRs at this snapshot: W1 [#160], W2 [#154], W3 [#161] (draft); W5 current doc/release/branch audit. None confirms a new Production build.



**Established:** 9 November 2026. **Source audit baseline:** main b8f76a6ee4660c135ec0e2604915a6b96097f664; live app 4e57aca785259192b92010c5d0e1634a4c1efe14. **User decision:** proceed with documentation and BP-00–BP-06 reliability foundation. Full official Excalidraw is a top product priority, not a low-priority indefinite option. This blueprint plans work; individual production, hosted-data, provider and paid actions retain separate approval gates.

See [active ChatGPT handoff](../CHATGPT_HANDOFF.md), [tool/skills playbook](../docs/CHATGPT_TOOL_PLAYBOOK.md), [current state](../docs/CURRENT_STATE.md), [documentation protocol](../docs/DOCUMENTATION_PROTOCOL.md), [operations](../docs/OPERATIONS.md), [visual evidence](../docs/DESIGN_EVIDENCE_PLAN.md) and [Issue #31](https://github.com/DoorBlox/orbit/issues/31). Historical [2.0–2.3 blueprint](ORBIT_2_0_BLUEPRINT.md) is preserved as a record, not as current orders.

## Execution ownership and continuity

**Implementation owner: ChatGPT coding assistant.** For approved work units, independently read code, implement scoped changes, add focused tests, use efficient exact-head GitHub Actions, review/merge source PRs after required checks, and maintain the handoff. The owner should not be asked to write fresh work prompts or manually project-manage the assistant. This obligation applies to active conversations, not invisible background work. Hosted SQL/Storage/Auth changes, privileged access, user-data deletion, paid services and new Production releases still require separate authorization.

**BP-16 first slice SOURCE MERGED (PR #36):** [workflow audit](../docs/CI_WORKFLOW_AUDIT_2026-11-09.md) of actual run timings and five Actions workflows. [PR #36](https://github.com/DoorBlox/orbit/pull/36) merged the fail-closed Markdown-only fast path, superseded PR run cancellation, current 2.4 raw deployment protection and regression tests after four green exact-head checks. It does not close semantic lint, visual/performance audit or modern Production staging work. SOURCE MERGED; verify current GitHub main before editing.

## Decisions locked for this sequence

1. **Preserve ORBIT's identity, not a six-window cap:** no universal React/Next.js rewrite or forced replacement of its freeform spatial world with a fixed dashboard. **Six is only the existing default widget inventory**, not a maximum; retain current widget IDs/layout coordinates and allow future registered widgets, Projects, Focus and curated publishing. Keep signed-in privacy and offline/local compatibility. See the new expandable-space plan.
2. **Safety before destructive features:** private images are not fully portable in current JSON backup; do not migrate/delete Storage objects or rewrite snapshots before designing and validating recovery.
3. **Performance evidence before architecture replacement:** CAS snapshot conflict detection stays until a tested alternative is demonstrably safer. Polling and expensive clone work are optimization targets, not permission for last-write-wins.
4. **Excalidraw fast track:** EX-00 package/API/visual feasibility with synthetic scenes starts in parallel with foundation; EX-01 real editor for shapes/pen/text in both hosts starts after media-backup design and UI baseline; EX-02 image integration only after reference-safe media and portability. Issue #31 stays open until full acceptance. No editor package on initial sign-in.
5. **Cost and CI:** no paid providers without consent; stage once after exact-head review and explicit release go-ahead; do not trigger extra manual test runs merely to generate green badges.
6. **Historic documents are archives, not commands.** Version strings are distinct: app label 2.4, npm 1.0.0, backup schema 6, migration IDs.

## One roadmap, all approved product directions

**10 November 2026 owner instruction:** Keep all original BP-00–BP-16 obligations **and** integrate new requirements with their original IDs (SP, PJ, BR, TOUCH, FO, PUB, AUTH) **here**, at realistic dependencies. This document is the **only active master execution queue**. The [earlier expansion brief](ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md), [Projects UX brief](ORBIT_PROJECT_EXPERIENCE_BACKLOG_2026_11_10.md) and [docs/ROADMAP index](../docs/ROADMAP.md) are historical/reference material, not competing work queues.

ORBIT is a freeform, pannable scrapbook with private branches, tasks, journal, stickies and optional widgets. Six legacy window IDs/positions are a compatibility baseline, **never a fixed maximum**. Do not replace the spatial workspace with a dashboard or rewrite its native ES modules as a global React app. Additional private project labels never expose private data to a public portfolio. Publishing requires a separate reviewed allowlisted projection and explicit owner action. No automatic Production promotion, hosted SQL/RLS/Auth/Storage mutation, private-media deletion, paid provider or custom domain action is granted by source-work approval.

## Status definitions

PROPOSED = specified only; READY = prerequisites/research sufficient; IN PROGRESS = active bounded changes; BLOCKED = needs user/external prerequisite; SOURCE MERGED = tested and merged to main but not necessarily deployed; RELEASED = mapped to actual Production source; VERIFIED = all stated acceptance evidence captured; DEFERRED = intentionally parked. No work unit advances to VERIFIED solely on reading source.

## 10 November 2026 — reconciled master BP ledger

**This is the single master execution blueprint.** The expandable-space and Projects UX plans are subordinate feature backlogs, not replacements for BP-00–BP-16. Earlier statuses in this file are dated contracts. SOURCE MERGED does not mean deployed or signed-in verified.

| BP | Evidence / current status | Unfinished acceptance |
| --- | --- | --- |
| 00 | Docs #35, ChatGPT handoff #37 SOURCE MERGED | Release/package version coordination unfinished |
| 01 | Private Blob display mitigation in 2.4 | BLOCKED: signed-in owner and second-account Production images, issue #26 |
| 02 | Image-inclusive portable backup #39 SOURCE MERGED | Not deployed or owner restore-tested; Excalidraw binary images excluded |
| 03 | SOURCE MERGED #42/#45 and adaptive idle #59 (4/4 CI, `7aa8da6c`) | 15s active / 30s idle after 2m, synthetic 240→123 reads/hour; actual multi-device, traffic/billing and revision-only backend remain unverified |
| 04 | Local-hosted migration filename parity #38 SOURCE MERGED | Full hosted object parity / future SQL separately gated |
| 05 | Legacy staging retired #57, NO-DEPLOY exact-main SHA preflight #62 SOURCE MERGED (4/4 checks) | Main ruleset #26803051 has 4 required checks but **zero** human reviews; protected stage environment, signed-in owner and rollback acceptance remain TODO; no Production release |
| 06 | Synthetic spatial five-viewports/ten-themes #47 SOURCE MERGED | Physical Safari/Android, zoom, assistive tech, owner assets and perf not verified |
| 07 | PROPOSED | Semantic color tokens, contrast and specificity reduction |
| 08 | PROPOSED | Optional mobile Focus/offscreen recovery, no forced dashboard |
| 09 | PROPOSED | Deferred snapshot cloning and measured CAS-safe write cost |
| 10 | PROPOSED | rAF drawing performance and private Blob cache lifetime |
| 11 | PROPOSED | Structured-text pilot with journal/IME/undo compatibility |
| 12 | PROPOSED, security gated | Private media library and reference-safe delete #29, pending BP-01/02/04 and authorization |
| 13 | EX-00 #40 and EX-01 #41 SOURCE MERGED (partial) | EX-02 private files, preview fidelity and signed-in mobile checks; #31 open |
| 14 | PROPOSED | Client-side ICS export and timezone verification |
| 15 | PROPOSED, hosted gated | Delegated OAuth/MCP with consent and revocation #32 |
| 16 | Required CI fast path #36 SOURCE MERGED (partial) | Semantic lint/type and measured refinements unfinished |

**Integrated milestones:** SP-00 #44, SP-01A/B #48/#50, PJ-01 #51, PJ-02A/B #53/#55, BR-02 #60, TOUCH-01 #63 and PJ-03 first private brief slice #64 are SOURCE MERGED; protected integrated Preview READY from `512b4b67`. PJ-03 milestones/link editor/health, PUB-00/01/02, FO-01, BR-01, AUTH-MASCOT and later BP work remain in this **same** roadmap, not a second backlog.
## 10 November 2026 — owner-reported UX defects supersede earlier feature ordering (P0)

**Evidence:** owner screenshots and touch-laptop testing of protected Preview `dpl_F3aLWWU2XaiVMNFCcaKsf31yzfgm` from `512b4b67`. Existing implementation clips the Space controls and drawing previews, shows basic pen as the primary drawing UI, stacks text and canvas on the same tiny Sticky/Journal surface, mixes inconsistent button/select styles, overlaps long task editing with graph nodes, and loses a mini-map finger drag. The signed-in screenshot also shows **Not saved**: treat current draft/backup preservation as a release gate, not merely a color/style problem.

**New P0 order in THIS master blueprint, not a separate roadmap:**

1. **BP-13 / EX-01/EX-02 user experience (P0).** Directly open the locally bundled official Excalidraw with shapes, text, arrows, mindmaps and freehand; content-fit SVG preview never clips remote-coordinate elements; split Sticky and Journal into distinct **Write** (aligned text) versus **Canvas** (freeform) visible surfaces. Keep legacy text and scene available when switching; do not overwrite one with the other. In-canvas image anywhere requires private Excalidraw image file asset lifecycle, owner-path isolation and portable backup support (EX-02, BP-01/02/12), **not** a fake image thumbnail at the bottom. This scoped PR begins with direct full editor + no crop; mode persistence/assets not yet finished.
2. **BP-06/07 Space & Sticky panel redesign (P0).** Compress theme controls into accessible disclosure/compact swatches; one primary action cluster; secondary tools behind disclosure; private save warning always accessible; account controls never clipped; consistent semantic token-driven controls. Sticky read preview must not show formatting chrome; contextual formatting/edit/style actions, responsive sizing and no broken dropdowns.
3. **BP-06/08 task inspector and input layout (P0).** Stop expanding long forms inside the scaled graph; use a viewport-bounded, keyboard-accessible editing surface with internal scroll and Save/Cancel, preserving task ID/checklist/links, branch pan/zoom, and cloud conflict safety.
4. **TOUCH-01 reopened for physical touch laptop (P0).** PR #63 passed synthetic pointer events but owner finger drag loses capture/stops. Reproduce real pointer-cancel/capture behavior; use stable pointer lifecycle and touch-action constraints; verify actual hybrid pointer/touch, no camera snap. Do not mark physical verification passed based on synthetic tests.
5. **BP-06 release acceptance:** screenshots of desktop/narrow panel with themes and save status, sticky writing/preview/canvas at resized dimensions, task long title/form without collision, canvas with off-origin objects, hybrid pointer drag, 10 themes, keyboard/reduced-motion. Source PR and protected Preview only until signed-in privacy/backup and sync status are verified.

Keep PJ-03, BR-01, FO, PUB and other BPs OPEN in the existing queue; don't invent a new roadmap. Preserving private data is a safety invariant **alongside**, not instead of, an excellent clean UI.

## Live priority queue (10 November 2026)

**Selection rule:** execute the highest-value READY item whose prerequisites, authorizations and regression safety are met. Keep BP and feature IDs; don't make fresh roadmaps. Independently reviewable source PRs may interleave when they do not pre-empt higher-severity reliability/security obligations. Serialize PRs sharing src/app.js, src/scene.js, private backup/layout data or release workflows. A PR passing CI is not a Production release.

| Priority | Work ID and why it matters | Gate / measurable exit |
| --- | --- | --- |
| **P0 source merged, live QA pending** | **BP-03** adaptive clean-foreground snapshot traffic reduction | #59 passed exact-head CI; signed-in multi-device/real usage still pending; hosted revision-only RPC needs separate approval |
| **P0 release safety** | **BP-05** exact reviewed-SHA no-deploy preflight #62 merged; modern protected staged-release pipeline and **BP-16** semantics still open | Required 4 GitHub checks confirmed; review-gated stage environment not established. No automatic alias change |
| **P0 user evidence** | **BP-01** private image QA (#26); **BP-02** real backup/restore; **BP-06** real-device/a11y baseline; owner acceptance of **PJ-02B** Preview | Source/synthetic work exists; authenticated owner + separate account, actual Safari/Android and restored private media remain unverified and may block Production |
| **P1 UX** | **BR-02** false add prompt #60 and **TOUCH-01** synthetic touch fix #63 SOURCE MERGED; **BR-01** discoverability still open | Repair documented regressions using BP-06 fixtures without moving/resetting saved nodes |
| **P1 useful Projects** | **PJ-03** goal/action/blockers/target date first slice #64 SOURCE MERGED; milestone and editable links still open | Existing PJ-02B is source merged and Preview READY; expand safely with bounded private metadata and task-derived progress |
| **P1/P2 design/platform** | **BP-07** semantic ten-theme tokens, **BP-08** phone offscreen recovery, **BP-10** drawing/cache performance | Fix measured a11y/perf defects; don't replace spatial UI with fixed dashboard |
| **P2 private features** | **BP-09** snapshot-clone optimization, **BP-11** structured journal pilot, **FO-01** optional Pomodoro, **BP-14** client-only ICS, **AUTH-MASCOT** original sign-in | Follow BP-03/BP-06/SP-01 gates; Focus timer differs from BP-08 mobile Focus view |
| **P2/P3 protected media** | **BP-12** private media library/#29, **EX-02** embedded Excalidraw assets, complete **BP-13/#31** | Require BP-01 verified isolation + BP-02 restore confidence + BP-04 parity; hosted/deletion change separately authorized |
| **P3 design first, public later** | **PUB-00** publication threat model; **PUB-01** Journal→blog; **PUB-02** separate portfolio/blog site; **BP-15** scoped OAuth/MCP | Design/read-only allowed; actual public writes, schema, Auth, hosting, domain or provider changes separately approved |

**Immediate path after #62–#64:** protected [integrated Preview](https://orbit-cwjgxy9mi-doorbloxs-projects.vercel.app/) READY at `dpl_F3aLWWU2XaiVMNFCcaKsf31yzfgm` from `512b4b67`. User-assisted BP-01 private images, BP-02 restore, Projects/Excalidraw and separate-account acceptance are essential to release; verify actual stage environment reviews before staging. Meanwhile pursue BR-01 and remaining PJ-03 milestone/link editing as isolated source tasks; do not auto-promote Production.

## Dependency map — existing BP units and additional experiences

- SP-00 → SP-01A → SP-01B (registry/persistence), SP-00 → PJ-01 (private identity), and SP-01B + PJ-01 → PJ-02A → PJ-02B → PJ-03; all work through PJ-02B is source merged.
- BP-06 synthetic baseline → BR-01, BR-02, TOUCH-01, BP-07, BP-08, BP-10 and AUTH-MASCOT. Physical-device checks are an acceptance gate, not a reason to block small synthetic bug fixes.
- BP-01 signed-in private media + BP-02 recoverable backups + BP-04 migration review → BP-12 reference-safe private library → EX-02 images → full BP-13/#31 completion. Image-free EX-00/01 are already source merged.
- BP-03 → BP-09 clone optimization and BP-14 ICS scheduling. SP-01B + BP-06 → FO-01. Timer ticks must not write constantly to Supabase.
- PJ-01 + BP-02 → PUB-00 allowlisted publication model. PJ-03 + PUB-00 → curated portfolio projection. PUB-00 → PUB-01 chosen Journal blog draft, and both public channels → PUB-02 separate website. No anonymous access to private tables/files.
- BP-04 + BP-09 + separately approved OAuth threat model → BP-15. BP-05/PJ-02B Production release requires protected Preview, reviewed artifact, verified Auth/CSP, signed-in owner acceptance and rollback.

## Historical first-pass work order (9 Nov; superseded by live queue)

**Source completed:** BP-00 foundation docs PR #35 and initial BP-16 CI optimization PR #36. **Current:** ChatGPT-native active handoff and tool/skill routing. App/package metadata harmonization remains NOT DONE because release tooling expects 1.0.0.

**Next independent lanes:** BP-04 read-only migration-history/source comparison, BP-01 owner-assisted authenticated image acceptance, BP-06 synthetic visual/performance baseline planning, and EX-00 official Excalidraw compatibility research. Work can be prepared independently but PRs touching shared files must be serialized.

**Then:** BP-02 media-inclusive portable backup with restore rehearsal; BP-03 cost-aware synchronization. BP-05 release workflow modernization once BP-00 is recorded; no generic deployment until reviewed. The 2.5 design and Excalidraw streams follow their specific gates.

## BP-00 through BP-06: detailed execution contracts

### BP-00 — current truth, docs and version vocabulary

- **Status:** SOURCE MERGED (docs foundation PR #35); ChatGPT-native transition being documented separately; package/version harmonization PROPOSED. **Prereq:** merged 2.4 closeout PR #34.
- **Value:** next session can identify actual Production, what shipped, what did not, and one safe next task in under five minutes.
- **Surfaces:** docs/CURRENT_STATE.md, docs/DOCUMENTATION_PROTOCOL.md, CHATGPT_HANDOFF.md, AGENTS.md, README.md, docs/ROADMAP.md, docs/decisions/README.md; later package.json and release guard scripts only in a separate code-bearing version PR.
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

- **Source status:** SOURCE MERGED [PR #39](https://github.com/DoorBlox/orbit/pull/39), commit d6064f0743b2544422cbd099e9468e6ab20d9533, four green checks; no Production release or real-owner acceptance. First implementation is versioned .orbit JSON with Base64-encoded referenced images and SHA-256 (avoids adding a ZIP package); this fulfills portable bytes for current notes/journals but lacks detached media, streaming compression, and Excalidraw binary assets. See [format v1 and safety contract](../docs/PORTABLE_BACKUP_V1.md).

- **Status:** SOURCE MERGED #39, real owner export/import NOT VERIFIED. **Prereq:** BP-01 inventory/behavior for live acceptance; synthetic source implementation already exists.
- **Surfaces:** src/backup.js, src/cloud/media.js, src/cloud/owner-tools.js, src/app.js, tests/backup.test.mjs, tests/media.test.mjs; optional versioned archive manifest.
- **Implementation:** explicit warning that current JSON export includes image paths only; design fully portable ZIP-like export with manifest, individually fetched private files, checksums and limits; import preview and controlled remap to a disposable target account. Preserve old format reader.
- **Acceptance:** synthetic backup/export/restore roundtrip, image bytes and hashes validated, no foreign-user path trusted, no incomplete import silently accepted; owner can recover original journal, checklist, drawing and private media references after roundtrip.
- **Rollback/permission:** additive backup path; no live storage deletion, no actual owner data export to public CI artifact; test import against synthetic disposable account, user confirmation for overwrite.

### BP-03 — low-cost, visibility-aware cloud sync

- **Status:** PARTIAL SOURCE MERGED #42 and #45; foreground optimization READY but incomplete. **Prereq:** BP-02 source backup escape hatch and stable CAS snapshot contract.
- **Surfaces:** src/cloud/sync.js, src/cloud/repository.js, tests/cloud_sync.test.mjs, tests/cloud_repository.test.mjs, browser multi-tab fixtures; possible read-only revision RPC only after BP-04 migration gates.
- **Implementation:** measure current calls and JSON bytes using synthetic snapshots; pause or adapt polling when page hidden, offline or on constrained connection; use focus revalidation and optional cheap revision check where genuinely valuable. Keep the current CAS revision logic and unsubmitted draft warning.
- **Acceptance:** exact no-lost-edit conflict tests, foreground 2-device refresh, hidden-tab quietness, offline/reconnect and logout cancellation, lower baseline request count, no auth or RLS expansion.
- **Rollback:** feature-flag interval/fallback; original CAS API remains functional, no auto-merge of conflicting drafts.

### BP-04 — reconcile migration ledger without touching Production data

- **Status:** SOURCE MERGED #38 for seven local migration filename/ledger IDs; hosted object-level parity still NOT VERIFIED, no hosted writes. See [parity evidence](../docs/SUPABASE_MIGRATION_PARITY_2026-11-09.md). Future SQL/hosted change NOT authorized.
- **Surfaces:** supabase/migrations/*.sql, supabase/config.toml, supabase/tests/*.sql, docs/OPERATIONS.md; hosted migration ledger and SQL definitions through read-only connector queries.
- **Implementation:** map seven local descriptive migration names to seven hosted migration version IDs; compare applied SQL objects/functions/grants/storage policy against a clean local replay. Record exact differences and recovery strategy. If migration tools interpret filenames differently, define a safe reconciliation approach and independent acceptance review.
- **Acceptance:** evidence-backed parity report with per-version local/hosted mapping, no false claim of identical SQL until checked; fresh disposable local database builds and isolated pgTAP pass before any future hosted migration.
- **Rollback/permission:** this work unit must issue NO remote DDL/DML, migration history repair or production db push; separate explicit approval and backup for future hosted mutations.

### BP-05 — retire or safely modernize the old 1.0 release job

- **Status:** PARTIAL SOURCE MERGED #57 (squash 416d301f, four checks): obsolete stage workflow retired; modern staging NOT IMPLEMENTED. **Prereq:** BP-00 and existing branch rules/protection confirmation.
- **Surfaces:** retired historical .github/workflows/m6-stage-only-production.yml, m6-release-dry-run.yml, scripts/verify-release.mjs, scripts/production-guard.mjs, docs/OPERATIONS.md.
- **Implementation:** old manual staging workflow pins fc5af5a and expects version 1.0.0; first disable/archive misleading usage in documentation, then design SHA-parameterized gated staging with no implicit custom domain reassignment. Separate source-verified artifact build from Promotion and Auth/CSP/no-private-content checks.
- **Acceptance:** synthetic dry-run checks correct reviewed ref, expected site and protection, hashed artifact, no secret output and no custom alias changes; required four status checks remain enforced.
- **Rollback:** restore previous workflow file if gate is faulty; no Production staging or alias changes as part of workflow refactor without separate approval.

### BP-06 — real UX, accessibility, visual and performance baseline

- **Status:** PARTIAL SOURCE MERGED #47 synthetic matrix; physical mobile, screen-reader, zoom and performance acceptance NOT VERIFIED. **Prereq:** synthetic baseline ref.
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
| **BP-13** | PARTIAL SOURCE MERGED EX-00/#40 and EX-01/#41; EX-02 gated | Full Excalidraw for journal and stickies (#31), bounded lazy editor island + scene adapters and optional private image assets. | Real upstream controls/undo/text/shapes, saved old scenes unchanged, low sign-in bundle cost, all themes/touch; native-pen fallback kept. |
| **BP-14** | PROPOSED; BP-03 | Client-only calendar ICS export before reminder integrations; dates.js, task/timeline export. | ICS imports, civil time and timezone stable, no OAuth/provider cost; drop export UI to roll back. |
| **BP-15** | PROPOSED; BP-04, BP-09, separate OAuth threat model | Read-first user-scoped remote MCP (#32), service endpoint, OAuth PKCE/revocation, per-user RLS. | Tool scopes, identity and A/B tests, journal opt-in, rate limits; disable/revoke tokens; no service-role bypass or implied free hosting. |
| **BP-16** | PARTIAL SOURCE MERGED #36; semantic checks require stable BP-06 fixtures | Cost-aware required GitHub Actions status-preserving changes; true lint/type checks, .github/workflows and package scripts. | Required four contexts never go missing; docs-only PR saves browser install minutes; fallback to previous workflow. |

## Excalidraw acceleration (owner priority)

**EX-00 — SOURCE MERGED [PR #40](https://github.com/DoorBlox/orbit/pull/40), commit 6a9c7c6, four green CI checks:** inspect package lock and maintained official Excalidraw release/API documentation; map the current native scene v2 (src/scene.js, app extensions), journal/sticky editor interfaces, theme tokens, licensing and build. Prototype **only with synthetic scenes**; optional isolated local artifact, no production data, Auth or service changes. Document compatibility, JSON/file constraints, sign-in bundle budget and screenshots. Can run in parallel with BP-01/BP-04/BP-06 and does not require waiting for all UX work.

**EX-01 — Actual official React editor island SOURCE MERGED [PR #41](https://github.com/DoorBlox/orbit/pull/41), NOT Production deployed.** [Integration contract](../docs/EXCALIDRAW_EX01_INTEGRATION.md), pinned packages, lazy CSS/fonts and synthetic browser quality gates. **Gated by signed-in acceptance and EX-02 image support for complete issue #31:** dynamically load official Excalidraw React/ReactDOM as a component island only when editing journal or sticky drawing; actual upstream pen/text/shape/undo and safe Save/Cancel, theme-aware paper canvas, backward-compatible old scene reader. No external runtime CDN. Initially reject embedded image files rather than injecting large base64 into Postgres. Keep native pen fallback; issue #31 remains OPEN during partial rollout.

**EX-02 — Image/media completion, BLOCKED by BP-12 + EX-01:** use verified private image attachments and export/restore, per-owner authorization, reference tracking and file-size checks; test cross-account isolation and undo, import/export of Excalidraw scenes with attachments, all themes and mobile. **Only here** can issue #31 close if complete acceptance is actually documented. Do not block EX-00 or safe image-free EX-01 on building a full media gallery.

**Why split:** the prior audit treated BP-11 and BP-12 as strict prerequisites to all of BP-13. They are truly critical to durable structured journal data and image-file support, but they are not necessarily prerequisites to a **synthetic feasibility prototype** or image-free shapes/text editor. This explicit dependency revision honors the owner's desire for Excalidraw soon without introducing an unsafe hidden migration.

## Integrated feature work contracts — all tracked in THIS master roadmap

**Common QA floor:** test-first, synthetic fixture data, preserve original six V6 window IDs and layouts, keyboard/touch/reduced motion, private per-user CAS and backup, one focused PR and four required exact-head statuses. No blanket deployment or hosted permission changes. Historical origin/research: [SP/PJ/PUB/FO concept](ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md), [Projects UX notes](ORBIT_PROJECT_EXPERIENCE_BACKLOG_2026_11_10.md).

### SP-00 / SP-01A / SP-01B — extensible first-party spatial world

**Status:** SOURCE MERGED #44/#48/#50; owner real-device acceptance remains. **Depends:** BP-06 synthetic viewport matrix. **Paths:** src/board.js, src/widget-registry.js, src/backup.js, src/storage.js, tests/board.test.mjs, spatial browser QA. Preserve all existing window IDs, coordinates, sizes, navigation and V6 compatibility, while allowing validated new first-party widgets via owner-private extensions.spatialWidgets. Test mounted optional window, focus/move/resize, hide/Places reopen, offscreen recovery and unknown-widget rejection. Undo/revert optional UI must never delete legacy positions or owner data. Six defaults are not a cap.

### PJ-01 / PJ-02A / PJ-02B — actual, reversible private Projects

**Status:** SOURCE MERGED #51/#53/#55; [PJ-02B protected Preview](https://orbit-ne9qywarm-doorbloxs-projects.vercel.app) READY; owner sign-in/Production NOT VERIFIED. **Depends:** SP-01B plus PJ-01 private metadata. **Paths:** src/data.js, src/model.js, src/projects.js, src/project-shelf.js, src/scene.js, src/constellation.js, src/app.js, relevant tests. Any branch can be marked or unmarked as a project without duplicating/moving its hierarchy or tasks; stable branch IDs and extensions.projects are owner private. Right-click, Shift+F10/ContextMenu and visible More actions are available. Seventh Projects window supports private status/description and HTTP(S) links, empty states, direct and including-descendant *unique* task counts, true progress (zero tasks is not fake 100%), branch focus, resize/hide/reopen and phone width. Preserve old scene/backups, no new anonymous content. Roll back optional project label without deleting branch. [Model contract](../docs/PJ01_PRIVATE_PROJECT_IDENTITY.md); [window contract](../docs/PJ02B_PROJECTS_WINDOW.md).

### PJ-03 — useful private project detail (P1, PARTIAL SOURCE MERGED #64)

**Status:** [PR #64](https://github.com/DoorBlox/orbit/pull/64) SOURCE MERGED (four exact-head checks) for optional private goal/outcome, next action, blockers/decisions and validated target date, edited in a single Projects brief, browser reload verified. Other contracts in this paragraph (milestone list, editable links, health/filter) remain unfinished. **Depends:** PJ-02B. **Paths:** src/projects.js, src/project-shelf.js, src/app.js, src/scene.js, backup and synthetic QA. Keep branch tasks as source of truth. Validate plain-text purpose/description (existing bounded 4,000-char description), HTTP(S) resource links, active/paused/completed status; add a concise next action, optional goal/outcome/dates, milestones with target dates and blockers/decisions log. Separate qualitative project health from numeric task-completion ratio. Optional search/filter, Board/Timeline and recurring updates follow *after* single-place editing is reliable. No mandatory sprint, owner assignment or productivity score. Test limits, wrong types, nested marks, rename/reparent/delete/Undo, local/cloud reload, old backup reader and read-only/keyboard/mobile. Revert new fields/UI without changing task IDs. Inspired by [Linear projects](https://linear.app/docs/projects), [milestones](https://linear.app/docs/project-milestones), [updates](https://linear.app/docs/initiative-and-project-updates) and [Asana overview](https://help.asana.com/s/article/project-overview-tab), not a visual clone.

### BR-01 — nested collapse discoverability (P1)

**Depends:** BP-06; native arbitrary-depth collapse already works. **Paths:** src/layout.js, src/constellation.js, src/styles.css, tests/qa_m1.py and focused browser QA. Improve discoverable 44px touch target, ancestor reveal/breadcrumb and compact tree layout; preserve ArrowLeft/Right, deep nesting, rename/reparent/search/reload focus and stored collapsed IDs. Test 320/390 widths and keyboard/real touch; rollback UI affordance without modifying task data.

### BR-02 — remove misleading collapsed empty-tail (SOURCE MERGED #60; owner device QA pending)

**Depends:** BP-06 synthetic baseline. **Paths:** src/layout.js, src/constellation.js, unit/browser tests. Current collapsed stacks can show 'add something here +' even with hidden descendants: do **not** render empty-tail placeholder on collapsed branch without direct tasks. Preserve actual direct tasks and the genuine empty add action on expanded leaf branches. Test nested/mixed/empty branches, focus/reopen, connector rendering and reload. Pure UI condition with easy rollback; no schema.

### TOUCH-01 — smooth touchscreen mini-map drag (SOURCE MERGED #63; physical QA pending)

**Status:** [PR #63](https://github.com/DoorBlox/orbit/pull/63) SOURCE MERGED (4/4 exact-head checks): no-snap cursor drag, second-pointer rejection, pointercancel/lost-capture cleanup and direct-map tap preserved in synthetic five-viewport Chromium. Real Safari/Android owner testing remains NOT RUN. **Depends:** BP-06 baseline, real mobile to certify. **Paths:** src/board.js, src/app.js, src/styles.css, pointer/QA tests. Reproduce dragged minimap **viewport outline** separately from springy constellation node motion at 320/390/tablet, multiple DPR/zoom levels and one/two-finger gestures. Inspect pointer capture, thresholds, touch-action, pointercancel/lostpointercapture, viewport-world math and rAF. Fix verified cause without resetting saved camera/position; preserve keyboard travel/reduced motion. Chromium touch emulation is evidence, not physical Safari/Android acceptance. Roll back touch handler alone.

### FO-01 — optional Pomodoro/Focus widget (P2)

**Depends:** SP-01B, BP-06. **Paths:** new src/focus.js, first-party widget, layout/backup policy and deterministic clock tests. Start/pause/resume/reset, configurable work and break durations, optional private task/project link. Use monotonic elapsed time for active interval and stored wall-clock anchors for sleep/reload correction, never per-second cloud saves. Test timeout, background/visibility, timezone, reset, keyboard/screen reader, hide/reopen and reduced motion. Sounds/notifications opt-in only. No streaks/scores or obligatory session-history retention. FO-01 timer is **not** BP-08 phone Focus mode. Remove widget without editing tasks.

### AUTH-MASCOT — original lightweight sign-in personality (P2, concept first)

**Depends:** BP-06 accessibility, BP-07 contrast/tokens. **Paths:** src/auth/shell.js, src/styles.css, approved small assets and signed-out QA. Develop an original ORBIT mascot, expressive but restrained welcoming state and optional seasonal expressions; verify copyright/license and accessibility before artwork. Keep keyboard, large-text, reduced-motion, loading/error feedback and lightweight sign-in. No Auth/RLS/OAuth redirect/CSP changes or private-data exposure. Roll back cosmetic assets without changing authentication logic.

### PUB-00 — safe public content contract (P3 design, hosted-GATED)

**Depends:** PJ-01, BP-02, and BP-04 for any SQL/RLS. **Paths:** security RFC, proposed allowlisted public schema and disposable A/B security tests. Public project fields may include title/slug, curated summary, goal/outcome, tags, approved links, approved *public copies* of cover/gallery, optional role/tech/dates. Never carry internal branch IDs, private tasks, journal bodies, user snapshots, private attachment paths/URLs or unrelated fields. Separate versioned draft/published/unpublished projections, explicit preview and Publish, frozen updates until reviewed, unpublish without deleting private source. Validate slug collisions, ownership, XSS, anonymous read, asset copy, CSP and rollback. No live hosted migration or public posting without explicit separate authorization.

### PUB-01 — selected Journal page to blog draft and publish (P3, hosted-GATED)

**Depends:** PUB-00. **Paths:** src/journal.js, src/app.js, src/cloud/repository.js, owner-only draft and separately reviewed public API. 'Create blog draft' copies only one selected sanitized Journal entry into independent private draft; allow headline/slug/excerpt/category and deliberately public cover. Preview exact anonymous projection, then explicit Publish/Revise/Unpublish. Later private diary edits never auto-sync to public. Existing published_content RPC is metadata only, *not* full article-body public storage. Verify XSS, RLS A/B, copy/undo, no private paths or other diary entries in assets/HTML. Unpublish projection without destroying original Journal.

### PUB-02 — independently hosted public portfolio/blog site (P3, hosted-GATED)

**Depends:** PJ-03/PJ-02B + PUB-00 approved project projection, PUB-01 for blog articles and explicit domain/hosting approval. **Paths:** separate website project only after original site brief, public-only read adapter, a11y/SEO and deployment tests. Curate selected project summaries/outcomes/galleries and approved blog posts: private project mark never auto-publishes. No private API credentials, private Storage links or entire snapshots in HTML/build artifacts. Independent Preview, publication, revocation and rollback from ORBIT. No assumed Next.js rewrite or provider purchase.

**Conservative design defaults, not unasked-for requirements:** PJ-02B shows both direct and descendant task counts, with unique aggregation; future portfolio pages use frozen owner-approved public versions; Focus has no session history by default. Revise through this roadmap, never via an independent new checklist.

## Audit register (historical source baseline; see updated statuses)

| Evidence ID | Severity | Confirmed source fact or outstanding validation |
| --- | --- | --- |
| A01 | P1 | src/cloud/sync.js polls full owner snapshots every 15s while active; nominal 240 reads/hour/tab before throttling, actual cost unmeasured. |
| A02 | P1 | src/app.js getSnapshot and src/cloud/repository.js use whole-workspace CAS snapshots; unrelated edits can conflict safely but coarsely. |
| A03 | Mitigated in source | Old JSON path-only; #39 .orbit backup includes referenced bytes/hashes, owner restore unverified. |
| A04 | P1 | #26 real-account display acceptance remains unverified despite new Blob preview implementation. |
| A05 | Mitigated in source | #38 local filename IDs aligned; hosted object-level parity pending. |
| A06 | P1 | README/ROADMAP/historical files repeat out-of-date release labels after current checkpoints. |
| A07 | Mitigated in source | #57 retired old manual workflow; modern stage gate remains unfinished. |
| A08 | P2 | npm package 1.0.0, app label 2.4 and backup version 6 must remain clearly distinguished. |
| A09 | P2 | ~110 KB stylesheet, many specificity overrides and ten-theme quality surface; visual defect not proven. |
| A10 | P2 | Static markup lacks h1, some small labels/controls; full assistive-tech verdict requires browser testing. |
| A11 | P2 | journal.js uses deprecated document.execCommand; undo/IME compatibility still unverified on physical mobile. |
| A12 | P2 | scene.js repaints SVG on each pointermove; FPS impact unmeasured. |
| A13 | P2 | Build copies most ESM/CSS unminified; first gather transfer/parse metrics. |
| A14 | P2 | No trustworthy live client Web Vitals / JS error baseline in this audit. |
| A15 | Mitigated in source | #36 conservative Markdown-only CI fast path merged; semantic lint unfinished. |
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

## Next executable work (10 Nov 2026 after #64)

**Acceptance/release gate:** owner performs signed-in protected Preview verification for private journal+sticky image pixels, private .orbit backup restoration on a disposable account, editing in Projects/Excalidraw and separate-account isolation; record only redacted outcomes. Real physical Safari/Android touch and assistive-tech remain not run. Production at `4e57aca` is intentionally unchanged.

**Source tasks when no owner session available:** BP-05 inspect/configure a protected *reviewer-gated* stage-only release environment and rollback, without ever exposing secrets or auto-assigning the domain; BR-01 discoverable nested-branch collapse; remaining PJ-03 milestones and resource-link UI with bounded private metadata. Use the established BP order and one source PR per unrelated slice; no second roadmap or paid provider by default.
