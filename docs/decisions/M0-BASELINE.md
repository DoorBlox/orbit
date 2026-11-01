# M0 baseline and proposed M1 implementation plan

Date: 1 November 2026 (Asia/Jakarta). Repository: `hlarknnt/orbit-personal`.

**M0 complete. The preserved prototype installs, builds and passes its documented baseline checks here. Ready to start M1 after owner review; M1 acceptance is not yet met.** Additional diagnostics reproduce existing reliability defects below. Baseline success does not establish production readiness.

## Scope and latest repository state

- Read `AGENTS.md`, `CODEX_HANDOFF.md`, `CODEX_FIRST_TASK.md`, all 15 numbered handoff docs, V6 manifest, runtime sources, scripts, lockfile, CI and baseline tests. Preserve static HTML/CSS/native ES modules and localStorage as active persistence.
- Local branch `work`, HEAD **`06f8039c724dd653a4bb8b84f7384d86d1ad90eb`**, “Initialize ORBIT V6 Codex handoff”. Live GitHub metadata confirms a **private**, unarchived repository, default branch `main`. GitHub `main` and `git ls-remote origin HEAD refs/heads/main` both resolve to local HEAD. No update was needed. This is a point-in-time verification.
- GitHub combined-status lookup returned no statuses. The workflow-run tool returned no **PR-triggered** runs; it excludes push-triggered runs. Hosted Actions execution/conclusion is therefore **UNVERIFIED**, not failed or absent by inference. No workflow was triggered.
- Starting tree had no tracked changes and **one pre-existing untracked file**, this report, from environment onboarding. Its original contents are preserved at `/workspace/orbit-m0-evidence/M0-BASELINE.before.md`. This report supersedes its claims for this task; earlier setup results were not reused as current evidence.
- All **13** `preserved_unchanged` files match original SHA256 values. `AGENTS.md` and `vercel.json` have intentionally historical manifest hashes and are excluded by the original manifest's preservation list.
- Only this report changed inside the repository. Original UI/source/assets, tests, dependency declarations, lockfile, configuration and Supabase files are unchanged. Generated `dist/`, offline preview and QA screenshots are ignored. No additional untracked personal export was found by the working-tree inventory; this is not a forensic privacy audit.

## Environment and command evidence

Base shell: Node 24. Activated existing **Node 22.23.4 / npm 10.9.9** from `/workspace/.orbit-environment/node-v22.23.4-linux-x64/bin`. Existing Python **3.12.14**, Playwright **1.62.0**, Chromium **154.0.8037.57** are available. No framework or third-party npm dependency was installed; the lockfile has none. Environment status is current/running with enforced restricted networking and no configured application secret bindings. No secrets requested.

Commands run from `/workspace/orbit-personal` with:

```sh
export PATH=/workspace/.orbit-environment/node-v22.23.4-linux-x64/bin:$PATH
export npm_config_cache=/workspace/.orbit-environment/npm-cache
```

Fresh logs: `/workspace/orbit-m0-evidence/`, including `results.json`, `runtime-results.json`, per-command logs, `probe.py`, `probe-results.json`, `csv-probe.log`, screenshots and report diffs. These are local evidence outside the repository, not committed CI artifacts.

| Actual command | Final result | Scope / limitations |
| --- | --- | --- |
| `git ls-remote origin HEAD refs/heads/main` | PASS, exit 0 | Both refs match local HEAD. Initial sandbox could not reach proxy; supported runtime escalation succeeded. Read only. |
| `npm ci` | PASS, exit 0 | Exact documented install rerun; lockfile unchanged. |
| `npm run lint` | PASS, exit 0 | 19 JS/MJS syntax checks, not ESLint or typechecking. |
| `npm test` | PASS, exit 0 | Runtime rerun: **6 passed, 0 failed/skipped**: five mapper/config subtests plus original CSV/model/layout assertion file. Initial sandbox reported two file-level results only; full runtime output retained. |
| `npm run verify:source` | PASS, exit 0 | 13 preserved-source hashes. |
| `npm run build` | PASS, exit 0 | Original HTML, 11 browser source/CSS files and SVG copied. |
| `npm run verify:structure` | PASS, exit 0 | 35 essential paths and limited content checks. |
| `npm run check` | PASS, exit 0 | All five stages pass; independent runtime unit run supplies full subtest evidence. |
| `python scripts_build_preview.py` | PASS, exit 0 | Regenerated ignored offline preview before historical QA. |
| `python tests/qa_http.py` | PASS, exit 0 on runtime rerun | Built HTML/JS/CSS/SVG delivered; private repository paths denied. Initial sandbox exited 1: server could not start. |
| `python tests/qa_origin.py` | PASS, exit 0 on runtime rerun | Actual localhost origin, journal autosave/reload, mobile control presence, no page errors, private-path denial. Initial sandbox exited 1: server could not start. |
| `python tests/qa_v6.py` | PASS, exit 0 on runtime rerun | Desktop 1440×900, tablet 900×1100, phone 390×844, small 320×700, landscape 844×390. Initial sandbox exited 1 at Chromium launch: `setsockopt: Operation not permitted`. Uses bundled HTML and mocked storage. |
| `python scripts/validate_handoff.py` | PASS, exit 0 | 15 docs, links, hashes, JSON/TOML and seven-table/RLS declaration presence. No SQL execution/authorization proof. |
| `python scripts/check_secrets.py` | PASS, exit 0 | Limited credential-signature scan of 21 files, not a complete security audit. |
| `python /workspace/orbit-m0-evidence/probe.py` | PASS, exit 0 | Starts **`PORT=4190 npm run dev:dist`**, exercises synthetic isolated contexts, captures evidence and stops its server process group. Confirms normal flows and reproduces defects below; those defects remain unfixed. |
| Node inline CSV probe | PASS, exit 0 | Calls existing export/parser/import functions; captures unsafe prefixes and duplicate headers. No spreadsheet application was tested. |
| Python dist inventory/hash probe | PASS, exit 0 | Exactly the 13 manifest-listed public files, byte-matching; no cloud code, docs, tests, backups or env files. |

Initial browser/socket failures were command-sandbox constraints, not V6 regressions: identical checked-in tests pass with supported runtime permissions. No test was edited to obtain a pass. Failed and successful logs are retained.

## Visual and functional baseline

Expected: one pastel spatial world, six independently movable/resizable windows, arbitrary-depth radial branches, elastic dragging, glowing unboxed task text and inline details, sorting/history, permanent Just Because branch, dated paper journal and timeline markers, global backup compatibility.

- Historical desktop QA passed title dragging, pointer/keyboard resize, independent second-widget sizing, unclipped milestone/journal marker lanes, journal date changes, grouped same-day markers, timeline-to-page navigation, V5 date conversion and V6 JSON backup/restore including dimensions.
- Historical 390px phone QA passed navigator open/close, dated writing and marker-to-journal navigation. All five contexts reported no page errors. Tablet/320/landscape assertions are narrower than desktop interactions; they are not exhaustive feature coverage.
- Additional **real-origin** probes found six widget DOMs and passed journal edit/reload at all five viewports with no page errors. Desktop capture → complete → exclusion from constellation → reopen → reload passed. Some setup/navigation uses existing debug helpers and DOM activation; this is not full pointer/touch/keyboard acceptance.
- Visually inspected current overview, timeline, desktop initial, 390/320 and landscape journal screenshots. Pastel atmosphere, six-window world, graph and paper journal remain intact. Focused 390/320 journal date, tools, body and footer are visible. At **844×390**, the centered journal extends above/below the viewport and chrome overlaps it; test actual control reachability before selecting a fix. Overview text is deliberately small and is not reading-size accessibility evidence.
- Captures document current rendering; no independent original screenshot set was pixel-diffed. SHA256 provides exact implementation parity. All added writing/recovery fixtures were synthetic, in disposable browser contexts; existing personal browser data was not opened.

Evidence:

- [Six-window overview](../../qa/v6-desktop-world.png)
- [Timeline labels and journal markers](../../qa/v6-timeline-with-pages.png)
- [Real-origin desktop initial state](/workspace/orbit-m0-evidence/origin-desktop-initial.png)
- [390px journal](/workspace/orbit-m0-evidence/origin-phone-journal.png)
- [320px journal](/workspace/orbit-m0-evidence/origin-small-journal.png)
- [Landscape journal](/workspace/orbit-m0-evidence/origin-landscape-journal.png)

## Remaining issues by priority

Existing findings, not M0 regressions. **No fixes implemented.** P1 = high-priority stabilization; P2 = bounded functional/usability work. Release privacy gates are separate below.

| ID / priority | Evidence and consequence | Smallest proposed response |
| --- | --- | --- |
| M1-01 / **P1: stored-task data loss** | `src/storage.js:24` cleans the whole saved array in one try/catch. One valid task plus one blank-title task causes fallback to 22 demos; startup `sync()` (`src/app.js:129`) overwrites storage. Actual-origin probe confirms valid record lost and all stored records replaced by demos. | Distinguish missing storage from corrupt existing storage. Preserve raw recovery data, validate per record and block overwrite/demo fallback on recovery failure. Test malformed JSON and partially invalid arrays. |
| M1-02 / **P1: false save feedback** | Injected write failure yields journal “not saved — export a backup”; `newPage()`/`render()` changes it to “saved on this device” while draft is absent from disk (`src/journal.js:101-140`). Task capture displays “Added to Thoughts to sort.” despite failed persistence (`src/app.js:129-153`). Layout/preference callers also ignore some failed writes (source review). | Propagate results, retain unsaved drafts/recovery actions, suppress unconditional success. Test navigation/new/delete/Undo/import and task/layout/preferences under denied storage/quota failure. |
| M1-03 / **P1: import recovery gap** | `restoreBackup()` (`src/app.js:162-186`) changes memory and persists milestones/layout/journal/preferences/tasks separately; ignores some failures and reports restoration. Normal roundtrip passes; partial-failure restore not separately injected in M0. Source-confirmed risk. | Validate entire snapshot first, retain recoverable prior state, handle partial writes explicitly. Test invalid versions/IDs/hierarchy, interruption and write failure. Do not claim localStorage transactions. |
| M1-04 / **P1: keyboard/accessibility gap** | Your space has no `.widget-grip` (`index.html:92-100`), while board keyboard movement binds only to grips (`src/board.js:50-52`). Probe confirms zero move grips there, despite six resizers. Dynamic branch editor input/select lacks an associated label (`src/constellation.js:263-290`); full reading order/focus preservation unverified. | Minimal semantic move affordance, editor labels and focus restoration. Verify all six windows/generated controls; review before/after evidence for material visual changes. |
| M1-05 / **P2: CSV edge cases** | Export escapes `=`, `+`, `@`, tab/CR but leaves `-1+1`, space-prefixed `=1+1` and LF-prefixed formulas unchanged (`src/csv.js:28-32`). `title,title` accepts first column silently. Confirmed function output, not spreadsheet execution. | Define formula-safe export/roundtrip policy and duplicate-header handling; table-driven BOM, quote/newline, URL, omissions, deduplication and size-limit cases. |
| M1-06 / **P2: milestone removal** | Second activation within 3.5 seconds deletes marker without Undo (`src/widgets.js:138-145`); existing documented incomplete behavior. | Understandable keyboard/touch confirmation and existing reversible toast pattern, keeping lanes/style. Test cancel/timeout/delete/Undo/reload. |
| M1-07 / **P2: wrong-day default** | Fixed `2026-11-01T20:30Z`, Jakarta browser: journal defaults to **2 Nov**, milestone form **1 Nov**. Milestone uses UTC ISO date (`src/widgets.js:69`), journal Jakarta; other task/timeline helpers use browser-local days. | Consistent existing Jakarta civil-day semantics; small shared helper if useful; UTC/Jakarta boundary and legacy timestamp tests. |
| M1-08 / **P2: evidence gaps** | Landscape focus crops journal; 320px text/target scaling, composited glass contrast, screen-reader ordering, physical touch and density remain unmeasured. Reduced-motion/contrast/transparency rules already exist. | Test reachability/preferences and 100/500/2000 synthetic tasks before fixes/optimizations. Preserve spatial coordinates, text tasks and elastic behavior. |

## Proposed M1 implementation sequence — for review

Small sequential changes, meaningful unit/integration/E2E tests and screenshot evidence per fix. No new framework, router or editor is required.

1. **Establish real-origin regression tests and preserve provenance.** Expand existing Python Playwright coverage against served `dist`: task/branch CRUD, deep hierarchy/cycle rejection, search/sort, completion/history, journal formatting/date/pages/Undo/markers, milestones, CSV/JSON and six-window layout persistence. Use isolated synthetic state, documented Python/Chromium prerequisites and user actions for acceptance; debug hooks only for setup. Cover desktop/tablet/320/390/landscape, keyboard and reduced motion. Add browser CI only with a minimal reproducible setup.
   - **Resolve an existing M1 check conflict before editing source:** `npm run check` calls `verify:source`; `scripts/validate_handoff.py` also enforces original hashes. Intentional M1 fixes will fail both M0-only guards. Keep the original manifest immutable and verifiable against Git commit `06f8039`. Add a separately reviewed explicit post-M0 change/hash record that rejects unexpected modifications in both validators; do not disable integrity verification or rewrite original provenance to get a pass. Preserve M0 screenshots and explain the new verification policy in the handoff/CI docs.
   - Acceptance: reproducible real-origin flows, retained baseline screenshots, a reproducer before each fix, and distinct original-provenance/post-M0 integrity checks.
2. **Fix recovery and save feedback first (M1-01/02).** Files: `src/storage.js`, `src/app.js`, `src/journal.js`, `src/board.js`, tests. Keep current storage keys, canonical task state and backup shape. Acceptance: invalid records never replace valid data with demos; denied/quota writes stay visibly unsaved across journal operations and task feedback; drafts/export recover; successful saves survive refresh.
3. **Harden import/export (M1-03/05).** Files: `src/csv.js`, validation in `src/app.js`, tests. Validate version/schema/IDs/hierarchy/journal boundaries before mutation; retain prior state and explicit partial-failure recovery. Acceptance: valid V5/V6/CSV roundtrips retain meaning, malformed/cyclic/duplicate/oversized input has predictable outcomes, formula handling tested, failed persistence never reports full restoration.
4. **Close keyboard/accessibility gaps (M1-04/08).** Files: `index.html` if needed, board/constellation/widgets/journal modules, targeted CSS, tests. Audit all semantic names, focus order/recovery, Your space movement, Escape, scaling, contrast, landscape reachability. Acceptance: all six windows/core controls reachable on documented viewports with visible focus. Record findings in `docs/05-UI-UX-DESIGN-SYSTEM.md`; material visual changes need owner-reviewed desktop/mobile before/after evidence first.
5. **Make milestones reversible and dates consistent (M1-06/07).** Files: widgets/app, small date helper if justified, tests. Acceptance: understandable deletion and Undo, unchanged label/marker lanes, correct day at UTC/Jakarta boundaries and retained legacy date handling.
6. **Measure and close M1.** Test 200% text scaling, high contrast, reduced motion/transparency, landscape recovery/panning, long/empty states and 100/500/2000 tasks. Optimize confirmed problems only. Physical Safari/Android/screen-reader follow-up remains necessary; simulated Chromium cannot replace it. Keep `execCommand` during stabilization unless a separate approved change is necessary; add paste/import boundary tests without claiming a complete XSS audit.
   - Exit: reviewed integrity policy, `npm run check`, targeted real-origin E2E, reviewed visual differences, documented remaining limits/device evidence. Update feature/security docs, handoff and changelog when actual behavior changes. Each fix independently reversible; preserve compatible state and V5/V6 backups.

M1 is ready to start after review, with data preservation first. M2 remains separate. Save-result contracts can remain compatible with a future repository adapter without enabling cloud calls.

## Deferred gates and honest limitations

- **NOT RUN / not implemented:** Auth/session gate, cloud persistence, second-device sync, Supabase CLI/config execution, migrations, pgTAP row allow/deny and cross-owner tests. Declaration checks are not RLS proof. No Supabase service was contacted or changed.
- **UNVERIFIED:** hosted Actions, branch protection, Vercel deployment/protection and incognito denial. No settings/deployments changed. Historical “repository not created” documentation is stale: the private repo now exists, but this proves neither CI nor protected preview readiness.
- **NOT RUN:** physical Safari/iPhone/Android/VoiceOver, comprehensive keyboard/contrast/text-scale/XSS audits, atomic-restore stress, large-data performance, spreadsheet execution or full click census.
- Auth and authenticated-owner RLS remain **P0 release gates** for private cloud data, separate from local M1. Active runtime remains local-only; inactive cloud code is excluded from `dist`.

## Diff, review and rollback

`git diff --stat` has no tracked changes because this report was already untracked. `git status --short` lists only `?? docs/decisions/M0-BASELINE.md`. Report comparison: `/workspace/orbit-m0-evidence/M0-BASELINE.diff`; full new-file diff: `/workspace/orbit-m0-evidence/M0-BASELINE.new-file.diff`.

No source/config/dependency/schema changes, commit, push, PR, deployment or remote migration. Rollback: restore the prior untracked report from its saved copy if desired and remove only new M0 evidence/ignored outputs. No personal data or cloud state needs rollback; the probe server is stopped.

**Review boundary:** [CODEX_FIRST_TASK.md](../../CODEX_FIRST_TASK.md) says “Finally show the diff and ask before Milestone 1 or 2.” The report and plan are prepared; M1/M2 implementation has not begun. Owner approval is the next gate, consistent with the request to report before proceeding.
