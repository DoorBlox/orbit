## Owner product-direction correction — 9 November 2026

**Binding clarification:** The six existing draggable widgets are the present default layout, **not a maximum of six**. Never block Projects, Focus/Pomodoro or new widgets because of historical preservation wording. Owner intends a private Projects place (reversible right-click "Turn into project" on a branch), a future independently hosted public portfolio/blog and **explicit** journal-to-blog draft/publish flow. Plan: [expandable space / projects / publishing / focus](plans/ORBIT_EXPANDABLE_SPACE_PROJECTS_BLOG_FOCUS.md). No public data or production changes are approved by this planning request. Continue BP-03 safe source work; verify main and exact PR/check evidence before merging.

## Latest verified source checkpoint — 9 November 2026, after PR #42

- **main**: `7440ebe0420a71ce4f96e463d3502c208bea5efb`, BP-03 first slice [PR #42](https://github.com/DoorBlox/orbit/pull/42), four required checks green. Earlier EX-01 [PR #41](https://github.com/DoorBlox/orbit/pull/41) source merged at `cbb6d4053a60ec7c002272ae17a370457e7411cd`, also four green checks.
- **EX-01 SOURCE MERGED, NOT deployed**: official pinned Excalidraw lazy React island available to both Journal and stickies; explicit Save/Cancel, native fallback, local CSS/fonts and image-free validation. Full embedded images (EX-02), preview fidelity for all shapes, signed-in Production/physical devices remain unverified. Keep issue #31 OPEN. Older EX-01 "in progress" notes below are historical.
- **BP-03 first slice SOURCE MERGED, NOT deployed**: `src/cloud/sync.js` skips hidden/offline full-snapshot polls, revalidates when visible/focused, retries pending CAS writes on reconnect. Tests cover hidden refresh, disposal and draft protection. Foreground still polls full snapshots every 15s; revision-only fetching and real multidevice performance remain unfinished.
- **Next safe work**: measure synthetic foreground snapshot size/call volume and investigate CAS-compatible inexpensive revision reads; separately, EX-02 private image scoping only after BP-02 backup contract review. BP-01 signed-in production image QA is still owner-gated. No automatic deploy.
- **Production unchanged**: documented ORBIT 2.4 source `4e57aca785259192b92010c5d0e1634a4c1efe14` on Vercel `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` (live aliases require fresh verification). No hosted SQL/Auth/Storage, domains, paid services or private-data changes.

# ORBIT — ChatGPT engineering handoff

## EX-01 active code branch — official embedded Excalidraw (9 November 2026)

- **Verified source main before this branch:** 6a9c7c6fae1ad6f1b698294c2ede9be09ab73f28, squash merge of [EX-00 PR #40](https://github.com/DoorBlox/orbit/pull/40), all four exact-head checks green. BP-02 [PR #39](https://github.com/DoorBlox/orbit/pull/39) merged earlier as d6064f0743b2544422cbd099e9468e6ab20d9533. Both **SOURCE MERGED, NOT Production deployed**.
- **Current branch:** feat/ex01-official-excalidraw-react-island-20261109. Real exact pinned @excalidraw/excalidraw 0.18.1 + react/react-dom 19.3.1 and registry-verified package-lock.json; temporary read-only npm resolution workflow ran once and was removed from branch. Builds official JS/CSS and self-hosted fonts as **lazy editor only**, while the main page remains native. Source: src/excalidraw-island.entry.mjs; scripts/build.mjs; src/scene.js; src/styles.css; scripts/verify-release.mjs; tests/qa_m1.py and current M2 source manifest.
- **Existing shared openSceneEditor works for both Journal and sticky notes.** The new button loads actual Excalidraw locally, buffers onChange in memory, explicit Save validates existing v2 scene, Cancel destroys React root; native pen fallback remains. **Embedded image files are still rejected** until EX-02; lightweight saved-scene preview cannot guarantee fidelity of all official shapes. See [EX-01 integration and QA contract](docs/EXCALIDRAW_EX01_INTEGRATION.md).
- **Status:** EX-01 source implementation in progress; **NOT SOURCE MERGED, NOT deployed, no real signed-in Production QA yet**. Inspect exact PR/head and all four CI checks before claiming success. Need to check published npm package CSS/fonts/API and Playwright on network-enabled GitHub Actions; fix failures without weakening strict build or RLS checks.
- **Do not:** automatically promote Production, alter Supabase RLS/storage, send private journals to Excalidraw.com, add paid providers, or close #31 prematurely. The owner should not have to manage GitHub or write new prompts.
- **Next:** finish EX-01 verified build/browser code PR, then BP-03 visibility-aware full-snapshot sync reduction or EX-02 private binary image scoping while physical-device design checks remain separate.


## Historical EX-00 in-review note before PR #40 merge (9 Nov 2026)

- **Latest confirmed main:** `d6064f0743b2544422cbd099e9468e6ab20d9533`, squash merge of [PR #39](https://github.com/DoorBlox/orbit/pull/39), after four required CI checks green. BP-02 image-inclusive `.orbit` private backup and staged owner-scoped restore is **SOURCE MERGED**, **NOT DEPLOYED**, **NOT VERIFIED** in real signed-in Production. Old V6 JSON remains path-only. No hosted SQL/Storage policy/Production changes.
- **This branch:** `feat/ex00-excalidraw-scene-adapter-20261109`; code in `src/excalidraw-adapter.js` and synthetic tests `tests/excalidraw_adapter.test.mjs` converts official `initialData` / `onChange(elements, appState, files)` to the existing V2 scene safely, rejects embedded assets and remote frames, preserves prior drawing on failed save, and controls image-free UI options. Official React package **NOT INSTALLED**; no real editor yet. Read [EX-00 compatibility and EX-01 gates](docs/EXCALIDRAW_EX00_COMPATIBILITY.md). Verify GitHub PR, exact head and four required checks before marking SOURCE MERGED.
- **Next implementation:** EX-01 obtain exact pinned `@excalidraw/excalidraw`, React and ReactDOM plus reviewed package-lock in a network-enabled build runner; build a lazy self-hosted editor island with fonts/CSS; wire the *same* existing `openSceneEditor` seam for Journal and sticky drawing and test with synthetic scenes. Keep native editor fallback; no remote CDN, no bulk global React rewrite. If dependency integration cannot be verified, continue BP-03 measured sync optimization as a parallel safe coding unit.


**Active entrypoint for ChatGPT, not Codex.** ORBIT is developed through ordinary ChatGPT conversations using connected GitHub, Vercel and Supabase tools, plus task-appropriate installed skills. The owner should not have to write a resume prompt, monitor Actions or manage the work queue. Read [AGENTS.md](AGENTS.md), [live state](docs/CURRENT_STATE.md), [execution blueprint](plans/ORBIT_POST_2_4_EXECUTION.md) and [ChatGPT tools and skills](docs/CHATGPT_TOOL_PLAYBOOK.md) first.

## Historical BP-02 source work (before PR #39 merge) — 9 November 2026

- **Verified main before this feature branch:** e5de8b32720f1ec26637bb48ea3db26942faaa45, merged [PR #38](https://github.com/DoorBlox/orbit/pull/38) after four green exact-head checks. BP-04 LOCAL migration timestamps now match the seven hosted-applied versions **without editing SQL bytes**; disposable local pgTAP/HTTP authentication tests passed. Hosted object-level parity and any future live migration still require separate controls.
- **Current work branch:** feat/bp02-portable-private-media-backup-20261109. Adding src/cloud/portable-backup.js, private owner-authenticated image download, previewed/explicit restore controls in src/cloud/owner-tools.js, source build allowlist, and unit tests. The archive is a versioned .orbit **Base64 JSON with SHA-256**, not a ZIP; it includes only **referenced** journal/sticky image files. See [format and security contract](docs/PORTABLE_BACKUP_V1.md). **Check actual PR and four exact-head CI before calling it SOURCE MERGED.**
- **No Production deployment, hosted SQL/Storage policy edits, media deletion or paid providers.** Legacy backup remains; the new portable format is **not yet live**.
- **Next task after this source PR:** EX-00 real upstream Excalidraw lazy editor island in the existing native app with synthetic scenes for both Journal and stickies. BP-01 owner-assisted real-account images remains unverified; no invented acceptance.

## Historical BP-04 work note (before PR #38 merge) — 9 November 2026

- GitHub work branch: fix/bp04-align-local-migration-ledger-20261109. Seven existing SQL files are being **renamed to the exact seven already-applied hosted migration IDs**, reusing unchanged Git blob hashes; three old source-file references are updated and tests/migration_history.test.mjs protects filename/body parity. **No remote Supabase migration, history repair or data write.** Verify exact PR number, four CI checks and merge status before calling this complete.
- [Detailed source/hosted ledger mapping and safe next-migration gate](docs/SUPABASE_MIGRATION_PARITY_2026-11-09.md). The seven hosted SQL bodies matched the prior Git sources (five exact, two differ only by trailing newline). New source names align timestamps, but hosted object-level drift and real data backup integrity have not been independently certified.
- After this BP-04 source check, **code BP-02 private media backup/restore with synthetic fixtures**, and advance EX-00 official embedded Excalidraw research in parallel. The owner does not need to write a new project prompt.

## Verified checkpoint — 9 November 2026

- **GitHub:** Last verified source main before this documentation rename: 821b1a51de1817703f14d42bd7b2a00618492425, squash merge of [PR #36](https://github.com/DoorBlox/orbit/pull/36). PR #36 passed ALL FOUR required exact-head checks: static-quality, local-postgres-rls, production-artifact-dry-run, unauthenticated-protection. Documentation baseline [PR #35](https://github.com/DoorBlox/orbit/pull/35) merged earlier as f899923ba098d21bc2f75b87d7bdcd3189f4e857.
- **Live application:** ORBIT 2.4 is on [orbit.starscene.com](https://orbit.starscene.com/) using READY Vercel deployment dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4 built from application source commit 4e57aca785259192b92010c5d0e1634a4c1efe14. Documentation and CI commits on main are NOT automatic releases. Previous READY rollback is dpl_AxaB85krmkJfDUj1T6ipqw8rodH4 (de2523dcea497c7ee41547ca94c14f48c72688f1). Recheck live aliases before release work.
- **Frontend:** Native HTML/CSS/JS ES modules + bundled Supabase JS. Preserve the single zoomable spatial world, six freely draggable/resizable widgets, independent constellation camera, journal, stickies and ten themes. No generic dashboard or all-React rewrite.
- **Supabase:** Project ixfgavgtwuzdgucjriec; eight RLS-enabled public tables and private orbit-private-media bucket. Owner isolation is a hard boundary. Hosted migration version timestamps differ from source filenames, but all seven SQL bodies matched after ignoring trailing newline on two. No substantive SQL drift established; do not run hosted migration repair or db push without an approved reconciliation.
- **Version language:** app release 2.4; npm/package and release verifier 1.0.0; JSON backup version 6. Do not silently conflate them.

## Who does the work?

**ChatGPT owns the coding and auditing**, not just the planning. During active conversations, verify GitHub state, pick the next independent safe ready work unit, inspect existing code/tests, implement focused changes, test with synthetic fixtures, open/review PRs, check exact-head required statuses, squash-merge non-destructive approved source changes after green, update state and handoff, and continue as feasible.

**No implicit background execution:** a future session resumes using these repo files, not an invisible ongoing process. The owner is involved for product decisions, access to controlled real-account UI, and separately authorized Production/domain changes, hosted SQL/Auth/Storage modifications, deletion of private data, secrets or paid services. Routine repo/docs/test work need not be reassigned to the owner.

## Current tasks and evidence

| Area | State | Specific next action |
| --- | --- | --- |
| ORBIT 2.4 | RELEASED | Keep Production source separate from newer docs/CI main |
| BP-00 / PR #35 | SOURCE MERGED | Canonical docs complete; ChatGPT naming transition is documentation follow-up; npm-version harmonization still gated |
| BP-16 first slice / PR #36 | SOURCE MERGED | Docs-only CI fast path implemented; use this follow-up PR to verify fast path; semantic lint later |
| BP-04 migration ledger / PR #38 | SOURCE MERGED, local replay/RLS PASS | Seven local timestamps now equal hosted-applied versions; no hosted writes. Next future migration still gated by dry-run and owner authorization |
| BP-01 / issue #26 | BLOCKED on controlled signed-in evidence | Test private sticky + journal image load/reload and second-account denial; source and anonymous checks are insufficient |
| BP-02 private media portability / PR #39 | SOURCE MERGED, NOT RELEASED | `d6064f07`, four green checks; real signed-in backup/restore acceptance and orphaned media support remain unverified/out of scope |
| BP-03 synchronization | NOT DONE | Measure whole-snapshot polling every 15s and global CAS conflicts before improving |
| EX-00 / issue #31 | SOURCE MERGED PR #40 | Tested official onChange scene adapter; full upstream JSX/React editor is EX-01 |
| Issues #29 / #32 | OPEN | Reusable private media gallery / scoped OAuth MCP, later after safety gates |

## Next executable engineering step — for ChatGPT

1. Recheck live main, open PRs, issues and four required statuses. Read this file, AGENTS, blueprint, affected source/test paths.
2. **BP-04:** SOURCE MERGED in PR #38, no hosted changes. Do not re-run migration-history repair; revisit only for future approved hosted migrations.
3. **BP-02:** implement portable private-media backup/recovery in small code/test slices, starting with src/backup.js, src/app.js backupJson, src/cloud/media.js, src/cloud/owner-tools.js, tests/backup.test.mjs and tests/media.test.mjs. Work with fake files; no real private backups in CI and no Storage deletion.
4. **EX-01 active:** actual pinned official Excalidraw island source branch, tests and strict asset verification; don't mistake an open PR for completed Production. Excalidraw image files still require EX-02. Do not block feasibility work on full media library.
5. Collect optional privacy-safe screenshots for BP-06 when the owner has them; absence must not stall code work.

## Verification, safety and handoff

- Main is protected: four exact-head required CI statuses. PR #36 introduced a fail-closed Markdown-only fast path for quality and synthetic artifact jobs; code and workflow changes still run full browser/security tests. See [measured workflow audit](docs/CI_WORKFLOW_AUDIT_2026-11-09.md).
- The manual Vercel stage workflow is LEGACY 1.0 pinned; do not use it as a 2.4+ release tool. Merge is not deploy approval. No automatic Vercel Git deployment.
- Real-account #26, user journal portability and physical mobile accessibility are NOT certified by green CI.
- On every task closeout, update THIS handoff with exact main/PR/SHA, code/tests performed, PASS/FAIL/NOT RUN evidence, Production/data changes (if any), next file-level action and rollback. Update [CURRENT_STATE](docs/CURRENT_STATE.md), roadmap, operations and history where appropriate.
- The complete old handoff is archived at [docs/archive/CODEX_HANDOFF_PRE_CHATGPT_2026-11-09.md](docs/archive/CODEX_HANDOFF_PRE_CHATGPT_2026-11-09.md); the CODEX_HANDOFF.md path is only a compatibility pointer for old docs and scripts.

**The repository is the continuity record. The owner does not need to invent a prompt.**
