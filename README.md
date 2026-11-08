# ORBIT — The Spatial Scrapbook

A personal, infinite-feeling 2D scrapbook. Move through one zoomable world of tasks, memories, milestones and dated journal pages—without turning it into a conventional dashboard.

**ORBIT 1.0.0 is live for its single owner.** The source is public and [MIT licensed](LICENSE); **the workspace is not public**.

**In development:** 1.1 organization fixes, 2.0 tenant/signup source and the 2.1 Space control panel are merged to `main`, but **are not on the live site**. The hosted database has its 2.0 private tenant schema; Production still serves the original 1.0.0 owner-only app behind Vercel Authentication. New-user signup is **not yet publicly released**. See [Changelog](CHANGELOG.md), [Operations](docs/OPERATIONS.md) and [open development PRs](https://github.com/DoorBlox/orbit/pulls).

**[Open ORBIT](https://orbit.starscene.com/)** · [Release notes](docs/releases/1.0.0.md) · [Project history](docs/PROJECT_HISTORY.md) · [Operations & recovery](docs/OPERATIONS.md) · [Continue in a new chat](CODEX_HANDOFF.md)

## What ORBIT does

One pannable/zoomable spatial world contains six independently draggable and resizable translucent widgets:

- **Constellation:** arbitrary-depth radial branches and active tasks, with a separate internal camera.
- **Continuum / Timeline:** deadlines, milestones and links to dated journal pages.
- **Things to do** and **Already done:** active/completed views over shared task data.
- **Your space:** personal workspace controls, layout and recovery features.
- **Journal:** paper-like dated rich-text pages, autosave, undo and Markdown export.

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

1. **[CODEX_HANDOFF.md](CODEX_HANDOFF.md)** — durable context checkpoint, exact deployed/repository identities, next-session actions.
2. **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — domain routing, security gates, backup, staging, rollback and incident checks.
3. **[docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md)** — M0–M6 chronology, PRs/CI links, verified vs unverified evidence.
4. **[docs/releases/1.0.0.md](docs/releases/1.0.0.md)** — actual 1.0.0 release note and limitations.
5. **[AGENTS.md](AGENTS.md)** — working constraints for future coding agents.

Older V5/V6 handoff and pre-launch milestone documents are retained for historical and design context. Where a dated record says "not yet published", that reflects **its date**; the above current-state documents supersede it.

## License

Copyright © 2026 DoorBlox. Licensed under the [MIT License](LICENSE). Third-party packages and assets retain their own terms.
