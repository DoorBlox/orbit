# ORBIT — current-session handoff for a future developer or ChatGPT session

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
