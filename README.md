# ORBIT — The Spatial Scrapbook

**Engineering: ChatGPT + connected GitHub/Vercel/Supabase.** Continue development via [CHATGPT_HANDOFF.md](CHATGPT_HANDOFF.md) and [tool/skill playbook](docs/CHATGPT_TOOL_PLAYBOOK.md). You do not need a Codex app or CLI. Older CODEX-named documents are retained only for project history and compatibility.

**Start here for current status and next work:** [Verified state](docs/CURRENT_STATE.md) · [Execution blueprint](plans/ORBIT_POST_2_4_EXECUTION.md) · [Documentation rules](docs/DOCUMENTATION_PROTOCOL.md) · [Design evidence brief](docs/DESIGN_EVIDENCE_PLAN.md). The current app is **ORBIT 2.4**; the user approved a reliability-first roadmap and prioritized full Excalidraw #31. Historic pre-2.4 snapshots below are not active release instructions.

**Current live release (9 Nov 2026):** ORBIT 2.4 at [orbit.starscene.com](https://orbit.starscene.com/), Git `4e57aca`, Vercel `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`. Ten themes, ambient animation option, sticky-aware draggable mini-map, richer private journal/sticky writing and task checklists. The six movable spatial windows remain; private media is Supabase Storage. The full upstream Excalidraw editor (#31), private media library (#29), and ChatGPT MCP connector (#32) are not yet shipped. #26 image rendering still requires authenticated Production verification.


**Historical 2.4 source-review snapshot (superseded by live release):** ten saved visual themes, independent background animation, draggable mini-map with sticky markers, stronger journal/sticky formatting, scroll-safe Space controls and private task checklists. Original six movable windows and spatial world remain. Real embedded Excalidraw ([#31](https://github.com/DoorBlox/orbit/issues/31)) and scoped ChatGPT connector ([#32](https://github.com/DoorBlox/orbit/issues/32)) are separate security/version-verified work units; current native drawing UI is not presented as upstream Excalidraw. Release gated by CI, Preview and inspected Production artifacts.


**Historical 2.2-era patch proposal (not current deployment status):** [#26](https://github.com/DoorBlox/orbit/issues/26) targets private image previews blocked by the Production image Content Security Policy. The source branch also adds independent **Copy** for paper sticky notes (text, drawing, tint and private image reference). Live beta still has the image-display limitation until tested and released.

## Archive: ORBIT 2.2 beta Production checkpoint (superseded by 2.4)

- **Serving Production:** canonical `https://orbit.starscene.com/` now maps to Vercel READY Production deployment `dpl_AxaB85krmkJfDUj1T6ipqw8rodH4`, exact reviewed source `de2523dcea497c7ee41547ca94c14f48c72688f1` (merged [PR #25](https://github.com/DoorBlox/orbit/pull/25), all four exact-head checks passed). Server-side production build completed with Supabase cloud config; unauthenticated GET returns HTTP 200 and no private journal text. The name `2.2 beta` describes the app feature release; package.json's legacy version value has not yet been revised.
- **Protection and domains:** Vercel Authentication changed from `deploymentType=all` to `prod_deployment_urls_and_all_previews`; **custom Production domain is public only for the Supabase Auth sign-in shell**, Preview and raw deployment URLs remain Vercel-protected. Secondary `orbit.allintime.space` remains a redirect to `orbit.starscene.com`. Vercel automatic custom-domain assignment was disabled during staging; custom canonical alias was reassigned explicitly, not automatically.
- **Rollback checkpoint:** prior READY owner-only 1.0.0 deployment `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. If an Auth or privacy failure is detected, first restore Vercel SSO `deploymentType=all`, then reassign canonical `orbit.starscene.com` to that old deployment; verify secondary redirect and owner content. Do not overwrite/restore database without a separate instruction.
- **Supabase:** owner-approved hosted migrations `orbit_private_extensions` and `orbit_private_media` were applied; Google Auth verified on two distinct controlled accounts; first account retains 23 branches, 29 tasks and one journal. Second account started empty. Authenticated-role hosted DB tests validated private extensions and per-user Storage SELECT/INSERT isolation; temporary test fixtures were rolled back. One live second-account beta workspace now has test notes/images (three Storage objects observed).
- **Known beta defect:** [#26](https://github.com/DoorBlox/orbit/issues/26) — attached note and journal image references persist but images **do not render**. Production's exact CSP has `img-src 'self' data:`, blocking signed image URLs from `https://ixfgavgtwuzdgucjriec.supabase.co`. Keep the Storage bucket private; fix via a narrowly reviewed CSP allowlist patch and matching production-guard/tests. The owner explicitly accepted launch with this known bug. Drawings in both journals and notes persist and display; scene editor is a lightweight pen and `.excalidraw` file interchange, **not** full embedded Excalidraw.
- **Operational follow-up:** source of truth for release is this current checkpoint; older sections below are historical even where they say "not deployed". Track remaining beta gates and issue #26; verify live user sign-in and media display after its patch. Respect budget: batch future changes, avoid repeated Actions/workflow dispatch.


A personal, infinite-feeling 2D scrapbook. Move through one zoomable world of tasks, memories, milestones and dated journal pages—without turning it into a conventional dashboard.

**Historical 2.2 Google-first beta first went live at [orbit.starscene.com](https://orbit.starscene.com/).** Signup is open through Google; every workspace stays private by Supabase Auth + row-level security. The source is public and [MIT licensed](LICENSE); personal data is not public.

**Now in Production:** 1.1 organization improvements, 2.0 private multi-user workspaces, 2.1 branch collapse and Space controls, and 2.2 notes/journal drawings plus backup/import features. Signed private image attachments currently fail to display ([issue #26](https://github.com/DoorBlox/orbit/issues/26)); image references and files are preserved. PR #24 merged branch collapse/expand (browser-local preference, included in backups); an unreleased 2.2 feature branch adds Google-first login, multiple task references, floating stickies, a shared journal/sticky drawing scene bridge and private images. The hosted database has its 2.0 private tenant schema; Production still serves the original 1.0.0 owner-only app behind Vercel Authentication. New-user signup is **not yet publicly released**. See [Changelog](CHANGELOG.md), [Operations](docs/OPERATIONS.md) and [open development PRs](https://github.com/DoorBlox/orbit/pulls).

**[Open ORBIT](https://orbit.starscene.com/)** · [2.2 Google sign-in & rollout](docs/OAUTH_2_2_ROLLOUT.md) · [Release notes](docs/releases/1.0.0.md) · [Project history](docs/PROJECT_HISTORY.md) · [Operations & recovery](docs/OPERATIONS.md) · [Continue in a new chat](CHATGPT_HANDOFF.md)

## What ORBIT does

One pannable/zoomable spatial world contains six independently draggable and resizable translucent widgets:

- **Constellation:** arbitrary-depth radial branches and active tasks, with a separate internal camera and collapsible branch groups.
- **Continuum / Timeline:** deadlines, milestones and links to dated journal pages.
- **Things to do** and **Already done:** active/completed views over shared task data.
- **Your space:** personal workspace controls, layout and recovery features.
- **Journal:** paper-like dated rich-text pages, autosave, undo and Markdown export.

**In 2.2 source-only development:** paper sticky notes in the spatial world and dated journal pages both support a native pen editor with portable `.excalidraw` exchange. The full upstream React Excalidraw editor is not embedded. Private images use short-lived signed URLs and an unapplied per-user Supabase Storage policy; JSON backups include media references, not binary files.

The app also supports keyboard controls, touch/pinch navigation, responsive phone layouts, reduced motion, CSV task/branch imports and selective exports, and full JSON backup/restore (with V5/V6 compatibility). The V6 visual identity and single-world navigation are intentionally preserved.

## Current deployment

| | |
| --- | --- |
| Canonical address | **[orbit.starscene.com](https://orbit.starscene.com/)** — owner-confirmed working Production sign-in and private workspace |
| Alternate address | [orbit.allintime.space](https://orbit.allintime.space/) — owner-confirmed redirect to the canonical address |
| Serving code | Reviewed app source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6` |
| Serving Vercel deployment | `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, Production READY |
| Backend | Supabase Auth and private PostgreSQL owner-only RLS |
| Access protection | Vercel Authentication covers all deployments; app additionally verifies owner authority |
| Release date | **7 November 2026** (owner-confirmed Production launch and secondary-domain redirect) |

**Important:** The repository `main` branch contains later CI and documentation commits than the serving application. **A newer `main` SHA does not mean newer code has been deployed.** Verify the deployed SHA and aliases before any release action. See [operations](docs/OPERATIONS.md).

## Architecture

ORBIT deliberately uses **native HTML/CSS/JavaScript ES modules**—no React or Next.js rewrite. A small esbuild output bundles only the pinned Supabase JS SDK. Key paths:

| Path | Responsibility |
| --- | --- |
| `index.html`, `src/styles.css`, `assets/orbit.svg` | Original visual UI and graphics |
| `src/board.js`, `src/constellation.js`, `src/layout.js`, `src/widgets.js` | Spatial world, branch graph, timeline and widgets |
| `src/journal.js`, `src/backup.js`, `src/data.js`, `src/model.js` | Journal, import/export, task/state models |
| `src/bootstrap.js`, `src/auth/` | Local/cloud bootstrap and owner-only sign-in lifecycle |
| `src/cloud/` | Supabase client, repository, revision/conflict sync, owner tools |
| `supabase/migrations/`, `supabase/tests/` | Database structure, least-privilege RLS and pgTAP |
| `scripts/`, `.github/workflows/` | Guarded build, source-integrity verification, automated checks and manual staging |

The original V6 source and later reviewed changes have distinct manifests under `docs/reference/`. Do not overwrite original provenance to fix a failing test.

## Security and privacy

**Open-source does not mean open data.** The project remains a **single-owner private app**. Vercel Authentication restricts access at the hosting layer; Supabase Auth verifies the signed-in user; a server-managed owner check and restrictive row-level policies protect private records. The public Supabase *publishable* key is safe for browser use **only with those server controls**. Never ship service-role keys, user passwords, session tokens, exports or diary content.

Production sign-in is bound to the exact canonical hostname. The alternate domain **redirects**, rather than creating a second Auth origin. Full JSON exports are **not encrypted by the app**; keep them in encrypted owner-controlled storage and do not commit them.

Verified evidence includes hosted nonowner **READ/INSERT** HTTP denial, local authenticated **PATCH/DELETE** denial on disposable fixtures, and the owner-confirmed working Production login. This does **not** claim a comprehensive penetration test, hosted PATCH/DELETE certification, physical iOS/Android approval or post-authenticated CSP/header certification. See [evidence and gaps](docs/PROJECT_HISTORY.md).

## Run locally

Requires **Node.js 22** and npm. A fresh checkout can run:

```sh
npm ci --ignore-scripts
npm run dev          # source server and local prototype
npm run check        # syntax, unit tests, immutable-source verification, build and structure
npm run dev:dist     # serve the generated dist/ locally
```

Browser QA requires the pinned Python/Playwright dependencies and Chromium:

```sh
python -m pip install -r tests/requirements-browser.txt
python -m playwright install chromium
python tests/qa_m1.py
python tests/qa_m2.py
python tests/qa_m25.py
python tests/qa_m2_closeout.py
```

Without cloud inputs the app can build in local prototype mode. A configured cloud build requires **all three** `ORBIT_SUPABASE_URL`, `ORBIT_SUPABASE_PUBLISHABLE_KEY` and `ORBIT_SITE_URL`. The repository **does not automatically load `.env` files**. The guarded Production build is `npm run build:release`; `npm run verify:release` checks a clean worktree and the exact artifact and **does not deploy it**. The `package.json` setting `"private": true` prevents accidental npm publishing; it does **not** mean this GitHub repository is private.

## Development and release rules

- Preserve the one-world V6 aesthetic, six-window interactions, keyboard/mobile behavior and safe-import invariants. Don't make an unrelated framework/UI rewrite.
- Prefer PRs and exact-head CI. Existing workflows cover quality/browser, disposable local Supabase SQL + HTTP RLS, Production artifact dry-run, and anonymous Vercel access checks.
- **Automatic Vercel Git deployment is disabled.** Release only after explicit approval, with a verified Production source SHA and a manual `--skip-domain` staging phase.
- Do not run hosted schema/fixture changes, revoke Auth users, delete backups, loosen Vercel Authentication or promote a deployment without the owner's specific approval.
- Keep the project free-tier-friendly; avoid billable Supabase branches or optional paid services.

## Documentation map

Start here for ongoing work:

1. **[CHATGPT_HANDOFF.md](CHATGPT_HANDOFF.md)** — durable context checkpoint, exact deployed/repository identities, next-session actions.
2. **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — domain routing, security gates, backup, staging, rollback and incident checks.
3. **[docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md)** — M0–M6 chronology, PRs/CI links, verified vs unverified evidence.
4. **[docs/releases/1.0.0.md](docs/releases/1.0.0.md)** — actual 1.0.0 release note and limitations.
5. **[AGENTS.md](AGENTS.md)** — working constraints for future coding agents.

Older V5/V6 handoff and pre-launch milestone documents are retained for historical and design context. Where a dated record says "not yet published", that reflects **its date**; the above current-state documents supersede it.

## License

Copyright © 2026 DoorBlox. Licensed under the [MIT License](LICENSE). Third-party packages and assets retain their own terms.
