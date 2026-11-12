# ORBIT — The Spatial Scrapbook

**W5 reconciliation (12 November 2026):** Live Production remains **ORBIT 2.4**, independently verified canonical Vercel alias `orbit.starscene.com` → READY deployment `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`, source `4e57aca785259192b92010c5d0e1634a4c1efe14`. Latest W5 observed GitHub main `a3b5203ef755e10a3976cb8e722c89ab7d5a0d00` is later **SOURCE ONLY**. Source merges, CI and localhost MCP **are not Production**, and owner/device acceptance remains pending. Requery all state before release.


**Start here — [Live BP/feature progress](docs/PROGRESS.md) · [GitHub PR activity](https://github.com/DoorBlox/orbit/pulls) · [GitHub Releases](https://github.com/DoorBlox/orbit/releases) · [One master roadmap](plans/ORBIT_POST_2_4_EXECUTION.md).** ORBIT now has **six workers (W1–W6) coordinated by Command HQ**. W5 keeps release notes, branch hygiene and progress readable; W6 owns cross-feature acceptance evidence. [Six-worker protocol](docs/ORBIT_PARALLEL_COMMAND_PROTOCOL.md). Source merges are **not** automatically Preview/Production or verified signed-in acceptance.


**Engineering: ChatGPT + connected GitHub/Vercel/Supabase.** Continue development via [CHATGPT_HANDOFF.md](CHATGPT_HANDOFF.md) and [tool/skill playbook](docs/CHATGPT_TOOL_PLAYBOOK.md). You do not need a Codex app or CLI. Older CODEX-named documents are retained only for project history and compatibility.

**Unified development roadmap:** the original [BP-00–BP-16 execution plan](plans/ORBIT_POST_2_4_EXECUTION.md) now also contains SP/PJ (private Projects), BR/TOUCH (tree and minimap UX), FO (Pomodoro), PUB (curated portfolio/blog) and AUTH-MASCOT units with dependencies and priorities. There is **no separate feature roadmap**. Six original windows are a compatibility baseline, not a cap. Private Journal/Projects never publish automatically.

**Start here for current status and next work:** [Verified state](docs/CURRENT_STATE.md) · [Execution blueprint](plans/ORBIT_POST_2_4_EXECUTION.md) · [Documentation rules](docs/DOCUMENTATION_PROTOCOL.md) · [Design evidence brief](docs/DESIGN_EVIDENCE_PLAN.md). The currently documented live app is **ORBIT 2.4**; newer Projects and image-free official Excalidraw are source merged and not yet live. [PR #57](https://github.com/DoorBlox/orbit/pull/57) retired the old manual 1.0 stage workflow. Release/publishing approval remains separately gated. Historic pre-2.4 snapshots below are not active release instructions.

**Current live release (9 Nov 2026):** ORBIT 2.4 at [orbit.starscene.com](https://orbit.starscene.com/), Git `4e57aca`, Vercel `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4`. Ten themes, ambient animation option, sticky-aware draggable mini-map, richer private journal/sticky writing and task checklists. The six movable spatial windows remain; private media is Supabase Storage. The full upstream Excalidraw editor (#31), private media library (#29), and ChatGPT MCP connector (#32) are not yet shipped. #26 image rendering still requires authenticated Production verification.


**Historical 2.4 source-review snapshot (superseded by live release):** ten saved visual themes, independent background animation, draggable mini-map with sticky markers, stronger journal/sticky formatting, scroll-safe Space controls and private task checklists. Original six movable windows and spatial world remain. Real embedded Excalidraw ([#31](https://github.com/DoorBlox/orbit/issues/31)) and scoped ChatGPT connector ([#32](https://github.com/DoorBlox/orbit/issues/32)) are separate security/version-verified work units; current native drawing UI is not presented as upstream Excalidraw. Release gated by CI, Preview and inspected Production artifacts.


**Historical 2.2-era patch proposal (not current deployment status):** [#26](https://github.com/DoorBlox/orbit/issues/26) targets private image previews blocked by the Production image Content Security Policy. The source branch also adds independent **Copy** for paper sticky notes (text, drawing, tint and private image reference). Live beta still has the image-display limitation until tested and released.

## What ORBIT does

One pannable/zoomable spatial world contains six independently draggable and resizable translucent widgets:

- **Constellation:** arbitrary-depth radial branches and active tasks, with a separate internal camera and collapsible branch groups.
- **Continuum / Timeline:** deadlines, milestones and links to dated journal pages.
- **Things to do** and **Already done:** active/completed views over shared task data.
- **Your space:** personal workspace controls, layout and recovery features.
- **Journal:** paper-like dated rich-text pages, autosave, undo and Markdown export.

**Source-only since 2.4:** official lazy Excalidraw, private image-inclusive portable recovery, private Projects, gallery, ICS and local MCP prototype exist in newer merged source, not on Production. No hosted OAuth/MCP connector has been released.

The app also supports keyboard controls, touch/pinch navigation, responsive phone layouts, reduced motion, CSV task/branch imports and selective exports, and full JSON backup/restore (with V5/V6 compatibility). The V6 visual identity and single-world navigation are intentionally preserved.

## Current deployment (verified 12 November 2026)

| Property | Actual serving release |
| --- | --- |
| Canonical domain | [orbit.starscene.com](https://orbit.starscene.com/) |
| App release | **2.4**, 9 November 2026 |
| Git source SHA | `4e57aca785259192b92010c5d0e1634a4c1efe14` |
| Vercel deployment | `dpl_8B3xvG3J5rhPFDfxkeUXXHu9K2N4` — READY, production |
| Later source | GitHub `main`, **NOT DEPLOYED** |
| Owner image QA | [#26](https://github.com/DoorBlox/orbit/issues/26) remains unverified |

See [progress](docs/PROGRESS.md), [release record](docs/releases/2.4.md) and [operations](docs/OPERATIONS.md). Package version 1.0.0 and backup schema 6 are different version identities.

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

**Open-source does not mean open data.** The Production sign-in shell is public on the canonical domain. Supabase authentication and tenant-scoped RLS protect each private workspace; raw deployment and Preview URLs remain Vercel-Auth protected. The public Supabase *publishable* key is safe for browser use **only with those server controls**. Never ship service-role keys, user passwords, session tokens, exports or diary content.

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
