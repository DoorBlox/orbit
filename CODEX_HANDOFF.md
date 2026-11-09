# ORBIT — current-session handoff for a future developer or ChatGPT session

## 9 Nov 2026 — ORBIT 2.4 cohesive spatial refinement (BRANCH; RELEASE GATED)

**Source of truth at branch start:** GitHub main `da89b7b` (PR #30 merged, 4/4 exact-head checks passed); Vercel-protected 2.3 Preview `dpl_76ScEW3Ke7zr8yX5M5SXLSyrhr9k`, https://orbit-cqcgb4whw-doorbloxs-projects.vercel.app/ READY with narrow CSP. Public Production alias `orbit.starscene.com` still serves earlier `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4` built from `de2523d`; raw deployments and previews remain Vercel-Auth protected. User explicitly authorized an **expedited, gated Production deployment** in the 9 Nov 2026 request—authorization does not waive data-integrity, RLS, CSRF or rollback verification.

**2.4 development branch:** `feat/2.4-theme-navigation-controls-20261109`, based on `da89b7b`. Keep the original large pannable/zoomable world, SIX freely movable/resizable widgets, radial constellation and sticky-note layer; **do not convert to fixed dashboard**.

- **Ten curated account-scoped themes:** Parchment, Night Garden, Frost, Celestial Blue, Ember, Tidepool, Sundown, Sakura, Graphite and Linen. Theme now applies to floating controls, clock, panels, maps and paper; `theme` is validated in `src/scene.js`, saved in existing private `extensions.appearance` (no hosted schema migration). Existing themes and legacy missing appearance retain their IDs/defaults. Distinct `ambient:boolean` opt-in toggle controls animated environmental gradients independently of `motion:'system'|'off'`. Reduced-motion and reduced-transparency system settings override effects.
- **Usability:** repair unreadable clock contrast, group infrequently used backup/import/export/sample tools under `<details>` within Space without changing handler IDs. Space, theme picker and resizable widgets remain scrollable; no clip of access controls. Navigator now supports sticky-note markers, pointer drag/click on map background, keyboard arrows/Home, note focus and world-space bounds; no user-coordinate migration or increased browser permissions.
- **Writing:** journal tools for underline, strikethrough, numbered lists, quote and safe HTTP(S) links; sanitizer continues restricting HTML. Sticky notes preserve existing 6000-char plain text but allow Markdown B/I/bullets/checklists/code/link insertion and a **safe preview built with DOM text nodes**, not unsafe HTML injection. Drawings still use the native pen editor, now with theme-matched paper surface.
- **Extra task context:** up to 30 per-task checkboxes, edit in constellation and toggle from detail view, stored as `extensions.taskChecklists`; native tasks SQL schema unchanged. Supporting links/description/criteria stay supported. Export/import keeps checklists in the full extensions snapshot; older clients may ignore them. Test reset, undo, and account sync.
- **Deferred, tracked—not falsely marked shipped:** actual embedded upstream React Excalidraw island [#31](https://github.com/DoorBlox/orbit/issues/31); private reusable media library, reference-safe permanent delete and optional R2 [#29](https://github.com/DoorBlox/orbit/issues/29); user-delegated OAuth/MCP ChatGPT connector [#32](https://github.com/DoorBlox/orbit/issues/32); calendar/notifications/remaining blueprint work. Private image real-account display issue [#26](https://github.com/DoorBlox/orbit/issues/26) is still open. Do not use public imgur/CDNs as a substitute for private media.
- **Release safety:** source review and M2 manifest hashes (immutable V6/M1 untouched), lint/unit/built artifact/browser a11y and regression checks, isolated local RLS, canonical anonymous sign-in test, protected Preview then staged Production deployment from the exact reviewed main commit. Confirm Auth redirect settings, TLS/CSP, no private content on anonymous response, original owner content retained. Assign canonical alias only after READY checks. Rollback checkpoint: Vercel deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`; if privacy is at risk first restore Vercel Auth to `deploymentType=all`, then alias rollback. No SQL/Storage migration, account deletion or domain protection relaxation authorized.


## 9 Nov 2026 — ORBIT 2.3 working branch: media recovery, navigation and appearance (NOT RELEASED)

- **Actual branch** `feat/2.3-media-appearance-navigation-20261109` based on reviewed main `4c303a4`. Source work is in progress; do not call this Production or an authenticated image-rendering verification. Prior 2.2.1 PR #28 is merged in main and protected Preview `dpl_E2ZND9zsAJYQAQu42UzhEMG8bst4` exists, but live Production remains the approved 2.2 beta `de2523d`. See open media bug #26 and media architecture issue #29.
- Preserve the **same spatial world** and six movable/resizable widgets; no dashboard replacement. This slice adds Parchment, Night Garden and Frost choices inside the Space widget. Account-scoped appearance travels in the existing private `extensions` snapshot; legacy data defaults to Parchment and system motion. Navigator focus marker is clamped within the mini-map and its caption receives a separate row.
- Private media previews now use authenticated Supabase Storage `download` to create temporary `blob:` object URLs; `img-src` extends the strict CSP with `blob:` without new third-party origins. URLs are revoked on logout/disposal, reused while the account is mounted, and never written to workspace data or backups. This is a **source-level mitigation pending real signed-in browser checks**, not an assertion that image issue #26 is resolved. Signed URL compatibility remains for rollback.
- Journal and sticky-note **Detach image** remove only the reference (with Undo) while keeping underlying private object for the planned Media Library. Duplicated notes continue sharing one media path. **No Storage DELETE policy, permanent deletion, R2 migration, new billing, schema migration, or Production changes.** Issue #29 separately tracks safe permanent deletion and gallery.
- Excalidraw in source remains the lightweight native pen + `.excalidraw` interchange. Official upstream React Excalidraw island is a larger separately verified work unit; do not label current drawing modal real embedded Excalidraw. All other blueprint work units remain open.
- Required completion gate: review source-manifest hashes, tests, GitHub protected PR checks, protected Preview (including signed-in journal+sticky images, 174% navigator, responsive views), then obtain explicit Production release authorization. Do not trigger Actions manually after every small commit.


## 9 Nov 2026 — 2.2.1 private media CSP and sticky duplication (SOURCE ONLY)

- Branch `fix/2.2-private-images-sticky-duplicate-20261109` is a **not-yet-merged/released** patch based on Production-closeout `main` `da5f9d3`. Current LIVE Production remains `de2523d` on `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`; canonical `orbit.starscene.com` is the public Google sign-in shell, with all raw deployments and Previews Vercel-auth protected. **No new hosted SQL, secrets, Auth configuration or Production alias edits.**
- Fix for [image issue #26](https://github.com/DoorBlox/orbit/issues/26): `vercel.json` CSP adds only the exact Supabase origin to `img-src`, matching existing allowed `connect-src`. Keep the Storage bucket PRIVATE and user-scoped. `scripts/production-guard.mjs` and regression tests require the exact source, reject wildcards and other hosts. Production image rendering remains unverified until a fresh approved deployment and user browser check.
- Small feature: **Duplicate sticky note** copies note text/color/validated drawing and private image **reference** to an independent card offset by 48 world units; edits are independent, 80-note cap and read-only checks remain. Never duplicate or delete actual Storage objects just to copy a note. Note action bar wraps on narrow cards.
- TDD branch tests: `tests/stickies.test.mjs` for copy, isolation, cap, bounds; existing synthetic Playwright `tests/qa_m1.py` verifies editing copy and reload; production CSP release fixture and strict-target regression cases updated. Current M2 source hashes updated **only** for `src/stickies.js` and `src/styles.css`. Do **not** revise immutable V6/M1 manifest.
- Cost discipline: one batched pull request after source/tests/docs; rely on protected exact-head four checks, no manual Actions dispatch. If they pass, merge then stage a new protected Preview; **do not automatically replace the live custom Production alias without an explicit release decision**. Keep issue #26 open until actual image rendering verified.


## 9 Nov 2026 — ORBIT 2.2 beta LIVE on Production (latest source of truth)

- **Serving Production:** canonical `https://orbit.starscene.com/` now maps to Vercel READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, exact reviewed source `de2523dcea497c7ee41547ca94c14f48c72688f1` (merged [PR #25](https://github.com/DoorBlox/orbit/pull/25), all four exact-head checks passed). Server-side production build completed with Supabase cloud config; unauthenticated GET returns HTTP 200 and no private journal text. The name `2.2 beta` describes the app feature release; package.json's legacy version value has not yet been revised.
- **Protection and domains:** Vercel Authentication changed from `deploymentType=all` to `prod_deployment_urls_and_all_previews`; **custom Production domain is public only for the Supabase Auth sign-in shell**, Preview and raw deployment URLs remain Vercel-protected. Secondary `orbit.allintime.space` remains a redirect to `orbit.starscene.com`. Vercel automatic custom-domain assignment was disabled during staging; custom canonical alias was reassigned explicitly, not automatically.
- **Rollback checkpoint:** prior READY owner-only 1.0.0 deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. If an Auth or privacy failure is detected, first restore Vercel SSO `deploymentType=all`, then reassign canonical `orbit.starscene.com` to that old deployment; verify secondary redirect and owner content. Do not overwrite/restore database without a separate instruction.
- **Supabase:** owner-approved hosted migrations `orbit_private_extensions` and `orbit_private_media` were applied; Google Auth verified on two distinct controlled accounts; first account retains 23 branches, 29 tasks and one journal. Second account started empty. Authenticated-role hosted DB tests validated private extensions and per-user Storage SELECT/INSERT isolation; temporary test fixtures were rolled back. One live second-account beta workspace now has test notes/images (three Storage objects observed).
- **Known beta defect:** [#26](https://github.com/DoorBlox/orbit/issues/26) — attached note and journal image references persist but images **do not render**. Production's exact CSP has `img-src 'self' data:`, blocking signed image URLs from `https://ixfgavgtwuzdgucjriec.supabase.co`. Keep the Storage bucket private; fix via a narrowly reviewed CSP allowlist patch and matching production-guard/tests. The owner explicitly accepted launch with this known bug. Drawings in both journals and notes persist and display; scene editor is a lightweight pen and `.excalidraw` file interchange, **not** full embedded Excalidraw.
- **Operational follow-up:** source of truth for release is this current checkpoint; older sections below are historical even where they say "not deployed". Track remaining beta gates and issue #26; verify live user sign-in and media display after its patch. Respect budget: batch future changes, avoid repeated Actions/workflow dispatch.


## 9 Nov 2026 — 2.2 Google-first creative beta (SOURCE ONLY)

PR #24 (collapsible branches, browser-local view state) is merged at `bc910fbc`. New branch `feat/2.2-google-oauth-notes-20261109` adds **Continue with Google** UI, labeled task URLs, floating sticky notes with text/color/drag/resize, journal AND sticky drawings through the same native `.excalidraw` import/export bridge, plus private image attachments. The editor is an interoperable native pen editor, **not full embedded Excalidraw React**. Both source migrations (`20261109015000_orbit_private_extensions`, `20261109020000_orbit_private_media`) remain **UNAPPLIED** to hosted Supabase; no hosted Google Auth provider, Production domain, or protection changed. Current Production is still `fc5af5a` at `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Vercel Authentication on all deployments. Source feature branch not yet CI-reviewed/deployed. See [owner setup + rollout](docs/OAUTH_2_2_ROLLOUT.md). Owner must configure Google OAuth credentials directly in Google/Supabase (never chat), verify offline backup and A/B tenant/media isolation before hosted migration or Production switch. JSON backups include image paths, NOT image file bytes. Batch code/doc changes before a single protected PR run; no repetitive Actions.

 — 9 Nov 2026, 00:15 WIB (supersedes earlier 8 Nov development-stage notes)

- Latest merged source: PR #21 (`d96d920`) preserves personalized Space names through backup/restore; PR #23 (`11421a8`) adds universal import and selective export. All four exact-head CI checks passed for both. Protect-main ruleset remains active.
- Protected Vercel Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` is READY from `11421a861b5023d5305c1802b8993bca221dacdd`; Production aliases still point to owner-only `fc5af5a`, with SSO protection enabled for all deployments.
- Current development branch `feat/2.1-branch-collapse-20261109` removes the obsolete LOCAL PROTOTYPE header caption (clock unchanged) and implements per-branch collapse/expand, keyboard disclosure, expand-all/collapse-all and per-account browser view state. The view preference is local to each device/account and included in manual full backups; it is not yet cloud-synced. Check PR/CI status before merging.
- Universal import/export is now in `main`. Next feature work should target richer task context/multiple supporting links, then private image assets, sticky notes and Excalidraw journals. Do not repeat PR #21/#23 work.
- User requests fewer Actions runs: batch related source edits and run exact-head checks once at the end; do not duplicate workflows.

## Latest control-plane checkpoint — 8 Nov 2026, 23:20 WIB (supersedes earlier 8 Nov development-stage notes)

- **Source:** [PR #12](https://github.com/DoorBlox/orbit/pull/12) (1.1), [#13](https://github.com/DoorBlox/orbit/pull/13) (2.x plan), [#14](https://github.com/DoorBlox/orbit/pull/14) (tenant RLS), [#15](https://github.com/DoorBlox/orbit/pull/15) (stacked account creation), [#16](https://github.com/DoorBlox/orbit/pull/16) (ledger), and [#18](https://github.com/DoorBlox/orbit/pull/18) (Space controls) are **MERGED** into `main`. PR #19 proposes editable per-user center names; check actual PR/CI before treating it as merged.
- **Database:** Hosted Supabase `ixfgavgtwuzdgucjriec` successfully applied migration `20261108161935 orbit_tenant_private_workspaces`. Verified row counts before/after: 28 tasks, 23 branches, 1 journal page, 1 profile, 6 layouts, 1 preferences, 1 revision, 0 published entries. New `orbit_workspace_access` present; 7 tenant restrictive policies replace 7 singleton policies; original publishing owner setting retained. These counts are a point-in-time check, not a data backup.
- **Security:** Latest merged tenant/Auth implementation exact-head [CI at `b8d73db`](https://github.com/DoorBlox/orbit/commit/b8d73dbd1cb25f24fa05aa5a7c6515e2d9f22c2a) passed four required checks. GitHub [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) ruleset is **Active**; setup [issue #17](https://github.com/DoorBlox/orbit/issues/17) closed.
- **Production stays deliberately unchanged:** Vercel project `orbit` still serves deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a`, and has `ssoProtection.deploymentType=all` enabled. The main and secondary custom domains still point to this 1.0.0 deployment. New signup and UI changes are **not yet released** to visitors.
- **Remaining release gates:** authenticated hosted owner + nonowner A/B browser/API acceptance, email verification delivery, versioned staged build for the correct SHA, authentication origin verification, and a separately confirmed Production promotion/protection transition. Do not equate local pgTAP success or merged code with a live multi-user service.
- **Cost discipline:** avoid unnecessary reruns and PR churn; use local targeted tests and exact-head CI once per reviewed slice. Keep the original V6 and historical M1 manifests immutable. No credentials or journal payloads in issues.


**Checkpoint:** 8 November 2026, Asia/Jakarta. **Status:** ORBIT **1.0.0 is deployed and owner-confirmed working in Production**.

**Source-only update, later on 8 Nov:** [PR #12](https://github.com/DoorBlox/orbit/pull/12) merged reviewed **1.1.0-unreleased** organization fixes into `main` (dynamic profile center, safe branch deletion with undo, dated journal ordering, fullscreen fitting). This did **not** deploy or change hosted auth/database. Next multi-user work is tracked in [PR #14](https://github.com/DoorBlox/orbit/pull/14) (tenant SQL), stacked [PR #15](https://github.com/DoorBlox/orbit/pull/15) (signup), and [the 2.x blueprint](plans/ORBIT_2_0_BLUEPRINT.md) pending [PR #13](https://github.com/DoorBlox/orbit/pull/13). The release identities in this handoff remain authoritative until a verified new release. This file supersedes the older M0–M6 prelaunch-status paragraphs in Git history and historical `docs/` materials. **Re-verify current remote state** when resuming; this is a checkpoint, not a live API.

## 0. First five minutes in a new session

1. Read this file, [README.md](README.md), [AGENTS.md](AGENTS.md), [docs/OPERATIONS.md](docs/OPERATIONS.md) and [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md).
2. Query `DoorBlox/orbit` **main** and its latest CI; check the live Vercel project `orbit` and both domain aliases; inspect Supabase only read-only unless explicit new authorization.
3. Compare the **serving app** SHA with the repository head; do not deploy `main` reflexively. Look at `vercel.json`, `release/production-target.json`, the CI workflows, and the code related to the new task.
4. Ask the owner **only** for action that genuinely requires their authenticated browser or account. Do not request or paste a password, `VERCEL_TOKEN`, private journal content, or backup JSON.
5. Continue from the current request. Do not rerun M0 onboarding, the already-accepted M2 setup, or a Production migration to recreate historical evidence.

## 1. User objective and guardrails

ORBIT is a personal, single-owner **spatial scrapbook**. One continuous zoomable/pannable canvas contains six draggable, resizable glass-like windows (Constellation, Continuum/timeline, Things to do, Already done, Your space, Journal). Keep radial branches, journal-date timeline links, soft animated background, notebook feel, mobile minimap, elastic movement and reduced-motion accommodations. The owner expressly wants the **source public and MIT licensed**, while the actual scrapbook is **private**. Preserve the V6 design; no framework migration or conventional dashboard replacement.

The owner favors **zero additional spending**, practical autonomous progress, verified CI, and avoiding needless repetitive requests. Prior authorizations specifically covered staged deployment and the exact current Production domain assignments; **they are not blanket approval for future promotions, DNS changes, destructive hosted database operations, Auth/RLS changes, or paid resources**.

## 2. Exact current identities and release outcome

| Item | Value / last verified result |
| --- | --- |
| Public GitHub repo | [DoorBlox/orbit](https://github.com/DoorBlox/orbit), `main`, MIT (DoorBlox 2026) |
| Head at start of Nov 8 docs work | `42448c41d2e87f408d5f424c3ff7a60b5311b583` (newer docs/CI); **read latest after this checkpoint** |
| Last serving application source commit | `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6` |
| Serving Production deployment | `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Vercel READY, `target=production` |
| Vercel | Project `prj_FZH5dyyZvUXfVmTz04HBCMbIrQk5`, team `team_xHRnXQbjaIEx2rNZ94p5QBao` |
| Main URL | [https://orbit.starscene.com/](https://orbit.starscene.com/) — Vercel alias to serving deployment |
| Secondary URL | [https://orbit.allintime.space/](https://orbit.allintime.space/) — Vercel redirect to `orbit.starscene.com` on same deployment |
| Owner acceptance | Owner reported canonical sign-in/workspace works perfectly; subsequently confirmed secondary browser redirect works |
| SSO | Vercel Authentication `enabled=true`, `deploymentType=all` |
| Supabase | Project `ixfgavgtwuzdgucjriec`, `ap-southeast-1`, ACTIVE_HEALTHY on 8 Nov |
| Production cloud origin | `https://ixfgavgtwuzdgucjriec.supabase.co`; site `https://orbit.starscene.com/` |
| Backup | Owner confirmed local complete JSON export saved; **do not seek/import/upload its contents** |
| Source deployment policy | `vercel.json` has `git.deploymentEnabled=false`; manual guarded stages only |

**Reason main ≠ Production SHA:** PRs #5–#10 add build checks, MIT metadata, local security CI, runbooks, manual stage workflow and anonymous-host test; the released static app is the specific reviewed `fc5af5a` source. Documentation commits can advance `main` without changing the runtime.

## 3. Architecture and major file map

- `index.html`, `src/styles.css`, `assets/orbit.svg` — visual identity.
- `src/board.js`, `src/constellation.js`, `src/layout.js`, `src/widgets.js` — spatial camera, radial graph and six-window views.
- `src/app.js`, `src/model.js`, `src/data.js`, `src/journal.js`, `src/backup.js`, `src/dates.js` — scrapbook state, journal dates and V5/V6-compatible imports/exports.
- `src/bootstrap.js` — local or private-cloud app bootstrap; `src/auth/controller.js` and `src/auth/shell.js` — session/owner gate. Controller enforces **redirect URL origin === current page origin**.
- `src/cloud/client*.js`, `src/cloud/repository.js`, `src/cloud/sync.js`, `src/cloud/owner-tools.js`, `src/cloud/mappers.js` — pinned Supabase client, owner repository, revision conflict/recovery, export/import.
- `supabase/migrations/` and `supabase/tests/` — owner RLS, invoker functions, least privileges, pgTAP.
- `scripts/build.mjs`, `scripts/build-release.mjs`, `scripts/verify-release.mjs`, `scripts/production-guard.mjs` — strict source/artifact/Production allowlist.
- `.github/workflows/quality.yml`, `local-supabase-rls.yml`, `m6-release-dry-run.yml`, `m6-stage-only-production.yml`, `m6-anonymous-protection.yml` — checks; **the stage workflow requires manual dispatch and currently pins source `fc5af5a`**.
- `docs/reference/V6_SOURCE_MANIFEST.json` — **immutable original V6 provenance**, not a current-file manifest. Keep original and reviewed current manifests distinct.

## 4. What actually passed, and what did not

| Test type | Evidence | Correct assessment |
| --- | --- | --- |
| Frontend/browser, cloud mocks, mobile viewport and motion | [full merged-main CI](https://github.com/DoorBlox/orbit/actions/runs/42336158353) | **PASS** at main `42448c4`, not a physical Safari test |
| Hosted real owner sign-in / workspace | Owner feedback, [M6 release issue](https://github.com/DoorBlox/orbit/issues/2) | **Owner-confirmed PASS** at Preview and canonical Production |
| Hosted nonowner session HTTP READ | Seven HEAD 200 with count 0 + server edge logs and admin SQL | **PASS**, nonowner sees zero records |
| Hosted nonowner session HTTP INSERT | Seven POST 403/SQLSTATE 42501 + server edge logs and admin SQL | **PASS**, no inserted rows |
| Local Supabase SQL policies | [local run](https://github.com/DoorBlox/orbit/actions/runs/42326076564) | **205/205 pgTAP PASS** |
| Local Auth bearer HTTP write denial | Same isolated local run | **7 READ, 14 PATCH, 14 DELETE PASS**; synthetic fixtures unchanged |
| Real hosted bearer HTTP PATCH/DELETE | No hosted fixture execution | **NOT RUN**; never claim local == hosted |
| Production configured artifact/build | [staging run](https://github.com/DoorBlox/orbit/actions/runs/42334141388) | **PASS** at reviewed source `fc5af5a` |
| Vercel unauthenticated access | [pre-promotion run](https://github.com/DoorBlox/orbit/actions/runs/42334961954), Vercel SSO setting | **PASS before alias switch**, each GET 302 to Vercel Auth; post-switch still SSO enabled |
| Canonical owner login and secondary redirect | Explicit owner reports | **Owner-confirmed PASS after switching both aliases** |
| CSP/security headers on authenticated app response | Redirect response has no application CSP | **NOT INDEPENDENTLY VERIFIED** |
| Owner export file saved | Explicit owner reports | **Attested only**; no checksum/restore checked |
| Mobile physical hardware, Google OAuth, email OTP delivery | Not fully tested | **NOT CERTIFIED** |

Earlier CI, PRs and historical milestone decisions: [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md). This was a **focused security and verification program**, not an independent comprehensive pentest.

## 5. Tested build and development workflow

With Node 22 / npm and locked dependencies:

```sh
npm ci --ignore-scripts
npm run check
# Optional targeted Chromium/browser regressions when Python + Playwright installed:
python -m pip install -r tests/requirements-browser.txt
python -m playwright install chromium
python tests/qa_m1.py
python tests/qa_m2.py
python tests/qa_m25.py
python tests/qa_m2_closeout.py
```

`npm run lint` is a **syntax** check, not ESLint or TypeScript. `npm run check` includes source/manifests verification and static build. For controlled release verification, provide the approved public environment inputs (without printing them) and use `npm run build:release` / `npm run verify:release`; neither command deploys. `package.json.private=true` blocks **npm registry publish**, not public GitHub visibility.

## 6. Exact authorization boundaries and next actions

- **Do not modify Production** to make old test checklists green; it has been released and owner-accepted. Future app features and schema changes need their own approval and rollback plans.
- **New deployment:** review SHA, backup, tests and config; update pinned SHA in manual stage workflow; stage with `--prod --skip-domain`; verify protection before alias assignment; get owner approval to change routing. A Preview is not a Production artifact and cannot be blindly promoted.
- **Rollback:** Old `dpl_89ozqhgtoJL6FRVSanpZ8gKNknZW` is the *historical* prior deployment, not proven a safe modern recovery target. For a future release preserve the latest known-good serving deployment and use **alias-specific** reassignment. A code rollback cannot recover deleted journal data.
- **Privacy:** The user wanted GitHub public + MIT, **not public scrapbook reads**. Never disable Vercel Authentication, weaken owner RLS, make wildcard OAuth redirects, log keys/backup files, or introduce permanent synthetic users without separate authorization.
- **Costs:** Avoid paid Supabase branches and Pro-only leaked-password protection. Public GitHub CI plus disposable local Supabase tests are working no-new-subscription options.
- **Follow-up improvements:** public repo main branch ruleset (was `protected=false` at last audit), post-auth CSP/header inspection, physical-device UX QA, owner-controlled encrypted backup/restore drill, optional hosted PATCH/DELETE fixture study. These are tracked gaps, not assumed release blockers retroactively.

## 7. How to resume from a blank conversation

A copy/paste prompt for the next assistant:

> We are continuing my ORBIT spatial scrapbook at https://github.com/DoorBlox/orbit. Start by reading `CODEX_HANDOFF.md`, `README.md`, `docs/OPERATIONS.md`, `docs/PROJECT_HISTORY.md`, and `AGENTS.md` on the repository's latest `main`. ORBIT 1.0.0 is already live on https://orbit.starscene.com/; https://orbit.allintime.space/ redirects there, and I confirmed both work. Serving release deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik` was built from source `fc5af5a`; `main` contains later CI and docs. Keep the six-widget V6 design, MIT public code but owner-private data, and free-tier constraints. Verify remote state and CI, then continue the task I give. Do not rerun onboarding or deploy/change database without permission. No credentials or private backups in chat.

**Historical documents:** `docs/HANDOFF.md`, `CODEX_FIRST_TASK.md`, the original numbered roadmap, and pre-release M3/M6 decision records are intentionally retained for audit but **not current release status**. In doubt, verify live aliases and actual code rather than trusting an older paragraph.
