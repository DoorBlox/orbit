# ORBIT — ChatGPT engineering handoff

**Active entrypoint for ChatGPT, not Codex.** ORBIT is developed through ordinary ChatGPT conversations using connected GitHub, Vercel and Supabase tools, plus task-appropriate installed skills. The owner should not have to write a resume prompt, monitor Actions or manage the work queue. Read [AGENTS.md](AGENTS.md), [live state](docs/CURRENT_STATE.md), [execution blueprint](plans/ORBIT_POST_2_4_EXECUTION.md) and [ChatGPT tools and skills](docs/CHATGPT_TOOL_PLAYBOOK.md) first.

## Active source work — BP-02 portable media recovery (9 November 2026)

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
| BP-02 private media portability | IN PROGRESS, source branch only | Implement .orbit image-inclusive export/import with synthetic integrity and owner-isolation tests; legacy JSON still path-only |
| BP-03 synchronization | NOT DONE | Measure whole-snapshot polling every 15s and global CAS conflicts before improving |
| EX-00 / issue #31 | RESEARCH STARTED, NO REAL EDITOR SHIPPED | Prototype official Excalidraw lazy React island with synthetic data and legacy scene adapter; both Journal and sticky notes required |
| Issues #29 / #32 | OPEN | Reusable private media gallery / scoped OAuth MCP, later after safety gates |

## Next executable engineering step — for ChatGPT

1. Recheck live main, open PRs, issues and four required statuses. Read this file, AGENTS, blueprint, affected source/test paths.
2. **BP-04:** SOURCE MERGED in PR #38, no hosted changes. Do not re-run migration-history repair; revisit only for future approved hosted migrations.
3. **BP-02:** implement portable private-media backup/recovery in small code/test slices, starting with src/backup.js, src/app.js backupJson, src/cloud/media.js, src/cloud/owner-tools.js, tests/backup.test.mjs and tests/media.test.mjs. Work with fake files; no real private backups in CI and no Storage deletion.
4. **EX-00 parallel:** inspect official Excalidraw version and integration, build a lazy loaded React island only for the editor; test existing native pen scene import and new full upstream editing in both hosts. Do not block feasibility work on full media library.
5. Collect optional privacy-safe screenshots for BP-06 when the owner has them; absence must not stall code work.

## Verification, safety and handoff

- Main is protected: four exact-head required CI statuses. PR #36 introduced a fail-closed Markdown-only fast path for quality and synthetic artifact jobs; code and workflow changes still run full browser/security tests. See [measured workflow audit](docs/CI_WORKFLOW_AUDIT_2026-11-09.md).
- The manual Vercel stage workflow is LEGACY 1.0 pinned; do not use it as a 2.4+ release tool. Merge is not deploy approval. No automatic Vercel Git deployment.
- Real-account #26, user journal portability and physical mobile accessibility are NOT certified by green CI.
- On every task closeout, update THIS handoff with exact main/PR/SHA, code/tests performed, PASS/FAIL/NOT RUN evidence, Production/data changes (if any), next file-level action and rollback. Update [CURRENT_STATE](docs/CURRENT_STATE.md), roadmap, operations and history where appropriate.
- The complete old handoff is archived at [docs/archive/CODEX_HANDOFF_PRE_CHATGPT_2026-11-09.md](docs/archive/CODEX_HANDOFF_PRE_CHATGPT_2026-11-09.md); the CODEX_HANDOFF.md path is only a compatibility pointer for old docs and scripts.

**The repository is the continuity record. The owner does not need to invent a prompt.**
