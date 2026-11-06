# Milestone 1 — frontend stabilization implementation

Date: 1 November 2026, Asia/Jakarta. Base: `06f8039c724dd653a4bb8b84f7384d86d1ad90eb`.
Owner explicitly approved the M0 plan and autonomous M1 implementation. No M2, deployment or live database work.

## Completed scope

1. **Real-origin regression foundation / provenance:** retained vanilla modules, original Git blobs and immutable V6 source manifest. `M1_SOURCE_MANIFEST.json` inventories all current index/src/assets with reviewed hashes/reasons. Both verifiers enforce it. Negative tests reject modified source, added source and altered original manifest. CI requests full Git history; verification intentionally fails without the original Git object. Existing Python Playwright tooling is version-pinned for browser CI, with no runtime npm dependencies.
2. **Persistence and recovery:** malformed records never trigger destructive demo substitution; invalid existing raw values are preserved and exportable. Startup no longer writes the initial snapshot. Save outcomes remain visible after task feedback and journal navigation/new/delete/Undo. Pending journal edits flush on pagehide/visibility change; new unsaved content remains in memory for export. Layout and preferences report failures. Journal Undo on its last deleted page no longer adds an extra blank page.
3. **Import/export:** complete V5/V6 validation, journal allowlist boundary, durable recovery record, failed-write rollback and interrupted-restore recovery. Current UI is replaced only after successful persistence. CSV formula prefixes/duplicate headers/extra cells/unsafe URLs have regressions; normal quoted/multiline data remains supported.
4. **Accessibility and interaction:** sixth keyboard move grip for Your space; dynamic branch inputs labelled; focus restored after graph rerenders/editor cancellation; native control keys do not pan the graph. Keyboard focus pans offscreen controls into view without changing saved layout. Tall landscape windows start beneath fixed chrome. Visible journal/timeline focus, reduced-motion/contrast checks and representative 200% text enlargement tested. Small paper labels use the existing brown palette with improved contrast (saved-state nominal contrast 3.33:1 before, >4.5:1 after against #F8F1DD).
5. **Timeline and dates:** explicit Remove confirmation followed by Undo through the existing toast grammar; no brittle double-click timer. Marker labels/lanes remain intact. Tasks, relative demo dates, journal and timeline use the existing Asia/Jakarta civil-day convention even when browser timezone differs; V5 timestamps remain compatible.
6. **Security/performance/release evidence:** paste is sanitized before live insertion, targeted import/storage security tests, restrictive static CSP, 100/500/2000-task load measurements, static HTTP/private-path checks, credential-signature scan and reviewed diffs. Vercel automatic Git deployment is disabled explicitly, including for review pushes. Protected-preview checklist prepared; nothing deployed.

No dashboard/sidebar/tab redesign, framework/router/editor replacement, cloud SDK, auth gate or duplicated task model was added. Original branch structure, elastic interaction, text tasks, completed exclusion/history, glass/pastel atmosphere, dated paper journal and global backups remain.

## Recovered work from the six specialists

All six agents were interrupted by the usage limit. Existing work was inspected and reused; no replacement agents were spawned on resumption. The lead completed integration and verification centrally.

| Specialist | Reused result | Lead completion |
| --- | --- | --- |
| A: data integrity | Storage recovery APIs, CSV fixes, storage/CSV/backup regression tests, durable-restore contract and red logs | Implemented the missing backup module, app/journal integration and failed-write recovery |
| B: accessibility | Sixth grip, focus restoration, branch labels, landscape/keyboard reveal, targeted unit tests | Integrated save guards/notifications, global keyboard scoping and contrast correction |
| C: timeline/date | Shared date module, model/data/timeline changes, milestone confirmation/Undo and date unit tests | Wired callbacks, fixed toast chaining/keyboard handoff, shared journal date helpers |
| D: browser regression | Test scope and contracts, existing Playwright architecture identified; no finished new browser suite saved | Added real-origin five-viewport core/failure/security/accessibility/date and density suite |
| E: security/code review | Confirmed pre-insertion paste vulnerability and corrupt-journal overwrite risk | Fixed both, added CSP and regression evidence, completed targeted review |
| F: build/readiness | Provenance/build/CI design and read-only Vercel lookup (no matching project in accessible scope) | Completed dual integrity checks, build allowlist, browser CI and no-deploy checklist/hold |

Skills applied: **ecc-search-first, ecc-blueprint, ecc-agentic-engineering, ecc-team-builder,
ecc-frontend-patterns, ecc-coding-standards, ecc-tdd-workflow, ecc-e2e-testing,
ecc-security-review, ecc-verification-loop, ecc-deployment-patterns**. Relevant guides were read;
React/backend/container examples were translated to this static app rather than installed.
Apple Design, Web UI Toolkit and anti-slop review retained the spatial identity and focused on
readability, control reachability and reversible actions. No specialist model override was used.
Per-agent token/cost telemetry was not exposed; exact per-agent cost is not claimed.

## Graphify reuse

Called `list_repositories` once: ORBIT is ready/queryable with 313 indexed nodes.
Only `hlarknnt/orbit-personal` was queried. Graphify snapshot `06f8039` confirmed:
`sync()` calls `saveTasks`; `restoreBackup` fans into app, storage, board, journal, model and data;
app imports eight runtime modules. Its storage test relationship query returned no linked tests.
That describes indexed coverage at the old baseline, not the new working tree or proof of absent tests.
Local source/tests governed all modifications, and the new regressions cover those integration paths.

## Actual verification

Run with Node **22.23.4**, npm **10.9.9**, Python **3.12.14**, Playwright **1.62.0**,
Chromium **154.0.8037.57** in the managed environment. Commands exited 0 unless stated:

| Check | Result |
| --- | --- |
| `npm ci` | PASS, zero third-party npm packages, lockfile unchanged |
| `npm run check` | PASS: JS syntax, **49** Node test results, dual provenance/current hash verification, static build, 35-path structural check |
| `npm run build` | PASS, active browser modules and SVG only; no cloud adapters/docs/SQL/exports/env files |
| Node built-in coverage on backup/csv/storage/dates | PASS: **95.69% lines, 85.17% branches, 84.91% functions**; not a DOM or whole-app coverage claim |
| `python tests/qa_m1.py` | PASS, desktop 1440×900 / tablet 900×1100 / 390×844 / 320×700 / landscape 844×390; journal and six-widget layout reload; core task/branch/search/sort/marker/backup/CSV flows; quota/corrupt storage/recovery export/partial restore/hostile paste; keyboard, preferences, text enlargement and Jakarta boundaries |
| `python tests/qa_v6.py` | PASS, inherited five-viewport interaction/backup suite using regenerated offline bundle and mocked storage |
| `python tests/qa_http.py` and `python tests/qa_origin.py` | PASS, actual dist delivery/private-path filtering and journal persistence |
| `python scripts/validate_handoff.py` | PASS, documentation/config/static SQL declaration checks; no SQL execution |
| `python scripts/check_secrets.py` | PASS, limited credential-signature scan; not whole-history security certification |
| `git diff --check` and final source review | PASS, scoped changes; original V6 manifest/cloud/Supabase files unchanged |

Full command logs live at `/workspace/orbit-m1-evidence/`; portable browser outcome summary at
`qa/m1-results.json` (ignored). Expected red evidence: recovered missing-backup test failure,
original storage/CSV regressions and contrast **3.3295:1**. An initial sandbox `spawnSync git EPERM`
required supported runtime execution, consistent with M0. Browser harness fixes: assignment-style
quota injection accidentally invoked its returned function; CSP rejected eval-based polling, so the
test now waits on DOM readiness. Neither issue was solved by weakening app security.

Measured load-to-ready in this environment: **0.828s / 1.325s / 3.173s** in the final full run for 100/500/2000
synthetic tasks, including context/navigation overhead. No FPS/battery/physical-device guarantee.

## Visual review and remaining limits

Before/after evidence is committed under `docs/evidence/m1/`:
[desktop before](../evidence/m1/desktop-before.png), [desktop after](../evidence/m1/desktop-after.png),
[phone journal before](../evidence/m1/phone-journal-before.png), [phone journal after](../evidence/m1/phone-journal-after.png).
The phone after capture has a synthetic title/date used by the test; content differences are not a redesign.

Anti-slop review: integrity **PASS** for honest local/save/error copy; design **PASS** for preserved
spatial identity; implementation **PASS** for scoped tests/build; usability **NEEDS FOLLOW-UP** for
physical Safari/Android, full screen-reader/AT ordering, exhaustive glass contrast and text scaling.
The text-enlargement probe is not a complete browser-zoom/WCAG certification. Nested graph/action
semantics and long tab sequences still merit a dedicated screen-reader session.

Legacy `execCommand`, plaintext localStorage/exports, cross-tab last-writer behavior and complete
XSS fuzzing remain known limitations. Auth/RLS/sync remain unimplemented, independently gated
production requirements. No live Supabase project, Vercel protection or deployed URL was validated.
CI browser setup is prepared; distinguish its local equivalent from actual GitHub job results.

## Review and rollback

Review this M1 PR and the protected-preview checklist. No merge or deployment is automatic.
For rollback, revert M1 app/build commits together; retain V5/V6 keys and JSON exports. If an
interrupted restore recovery record exists, let M1 recover it or export it before reverting to V6,
which does not understand that marker. Never delete raw recovery values to make a check pass.

Next owner action: review the PR and visual/device evidence. Separately authorize M2 local-only
Auth/RLS foundation when desired. Deployment remains an independent approval after protection verification.
