# ORBIT — The Spatial Scrapbook

**An authentic ORBIT V6 browser prototype, preserved and packaged for staged production engineering in Codex.**

The UI is an open, pannable 2D scrapbook with six floating glass widgets (constellation, timeline, active tasks, completed tasks, personal space, paper-like dated journal). It has movable/resizable windows, radial freely nested branches, animated atmosphere, in-place task actions, deadline/urgency sorting, timeline markers for journal entries, and JSON/CSV export. These interactions currently run **entirely in the browser using localStorage**. There is **no actual login or cloud data sync** yet.

## Read this first

- [Codex handoff](CODEX_HANDOFF.md) — current architecture, evidence and next step.
- [Codex first task](CODEX_FIRST_TASK.md) — ready-to-paste Milestone 0 assignment.
- [Agent/repository rules](AGENTS.md) — design preservation and security boundaries.
- [Feature audit](docs/02-EXISTING-FEATURE-AUDIT.md), [PRD](docs/03-PRD.md), [system architecture](docs/06-SYSTEM-ARCHITECTURE.md), [Codex roadmap](docs/14-CODEX-IMPLEMENTATION-ROADMAP.md).
- [Source integrity manifest](docs/reference/V6_SOURCE_MANIFEST.json). Original V6 instructions are archived at `docs/reference/AGENTS_V6_ORIGINAL.md`.

## Prerequisites and local commands

Node.js 22 and npm 10+; browser of your choice. Zero third-party npm dependencies are required for current V6 source.

```sh
npm ci
npm run dev          # http://127.0.0.1:4173, source development server
npm run check        # syntax, unit, static build, structure
npm run dev:dist     # serve production distribution after npm run build
```

The `dev` server is **local only** (binds loopback) and shouldn't be exposed to the internet; Vercel serves the filtered `dist` output. The `lint` script is a Node syntax checker rather than ESLint; `test` runs Node's built-in test runner. If Python + Chromium/Playwright are available, run `python tests/qa_v6.py` for historical simulated-browser QA.

`npm run build` creates `dist/index.html`, the original browser `dist/src/*.js` and CSS, and `dist/assets/orbit.svg`. Inactive `src/cloud` adapters are intentionally excluded. It does not minify or rewrite the prototype. `dist/` is ignored by Git. The standalone `ORBIT_Offline_Preview.html` is also included for inspection, not for production deployment. **Do not enter real private journal information into a publicly accessible prototype.** Browser storage is not cross-device, and JSON backups are unencrypted.

## Production roadmap (what is and isn't connected)

| Area | Status today |
|---|---|
| Spatial UI / graph / task actions / timeline / journal / CSV+JSON | Browser-functional, localStorage only |
| Git repository structure / static build / pinned npm lockfile | Prepared; run checks locally |
| GitHub quality CI | Configured in `.github/workflows/quality.yml`, not yet executed in GitHub |
| Vercel `Other` static configuration | Prepared `vercel.json`; no live deployed site |
| Supabase schema / RLS / seed / client mappers | Prepared draft files; DB NOT executed/tested |
| Supabase Auth / remote data repositories / storage | Not implemented |
| Hardware mobile QA / production monitoring | Not verified |

Read [implementation gaps](docs/04-MVP-GAP-ANALYSIS.md), [Supabase integration](docs/08-SUPABASE-INTEGRATION.md), [security & testing](docs/13-SECURITY-AND-TESTING.md), and [deployment](docs/12-VERCEL-DEPLOYMENT.md).

## Repository map

```text
.
├── index.html                  # PRESERVED V6 app entry
├── src/                        # PRESERVED V6 logic and design + inactive cloud adapters
├── assets/                     # original icon
├── tests/                      # original tests, handoff mapper tests, QA scripts
├── scripts/                    # Node dev server, syntax/build/structure/source validation
├── supabase/                   # draft schema migration, test scaffold, local seed/config
├── docs/                       # 01..15 engineering docs + original product/design docs
│   └── reference/              # V6 SHA manifest, archived original AGENTS/README
├── .github/workflows/quality.yml
├── package.json & package-lock.json
├── vercel.json                 # Vercel static build/headers
├── .env.example                # future ONLY, no real secrets
├── AGENTS.md                   # Codex repository instructions
├── CODEX_HANDOFF.md
└── CODEX_FIRST_TASK.md
```

## Initial GitHub setup — user-controlled, no automatic push

Create a **private**, empty GitHub repository using your own account. Inside extracted project folder:

```sh
git init
git add .
git commit -m "chore: preserve ORBIT V6 and engineering handoff"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_PRIVATE_REPO.git
git push -u origin main
```

Replace the example repository URL. Check `git status` and `git diff --cached --stat` before commit. Don't run `git push --force`. For Codex, open this folder directly in VS Code/ChatGPT Codex and paste [the first-task prompt](CODEX_FIRST_TASK.md).

## Planned Vercel deployment

Import the private repo in Vercel (Root `.`, Framework **Other**, Node **22**, Build `npm run build`, Output `dist`). **Enable Vercel Authentication / All Deployments protection before sharing any URL**, then verify incognito access fails. This protects the prototype URL, but does **not** replace Supabase Auth/RLS for future personal data. GitHub Actions only runs quality checks; Vercel Git integration handles builds. See [deployment runbook](docs/12-VERCEL-DEPLOYMENT.md).

## Planned Supabase integration

Provision a separate development project or local Supabase stack. `supabase/migrations/20261101140000_orbit_initial_schema.sql` is a hand-authored draft and **has not been applied**. Validate and test it using current Supabase CLI / pgTAP / actual owner- and cross-owner-RLS scenarios before linking a hosted database. **Never use the Supabase secret/service-role key in the frontend.** The publishable key can only be used safely with verified RLS.

`.env.example` describes names for later integration but the current frontend ignores them. Do **not** add real `.env` credentials to Git. No `LICENSE` file was created because a license has not been chosen.

## Documentation index

| File | Contents |
|---|---|
| [01](docs/01-PROJECT-OVERVIEW.md) | Overview and provenance |
| [02](docs/02-EXISTING-FEATURE-AUDIT.md) | Source-level feature inventory |
| [03](docs/03-PRD.md) | User stories, FR/NFR, acceptance |
| [04](docs/04-MVP-GAP-ANALYSIS.md) | Gap ranking and blockers |
| [05](docs/05-UI-UX-DESIGN-SYSTEM.md) | Actual tokens, layout and UI preservation |
| [06](docs/06-SYSTEM-ARCHITECTURE.md) | Static and target architecture |
| [07](docs/07-DATABASE-ERD.md) | Schema/ERD and integrity |
| [08](docs/08-SUPABASE-INTEGRATION.md) | Migration/Auth/RLS/integration plan |
| [09](docs/09-API-CONTRACTS.md) | Data operations and errors |
| [10](docs/10-FRONTEND-BACKEND-MAPPING.md) | UI-action-by-action backend contracts |
| [11](docs/11-GITHUB-SETUP.md) | Repo/CI/branch control |
| [12](docs/12-VERCEL-DEPLOYMENT.md) | Protected preview/release runbook |
| [13](docs/13-SECURITY-AND-TESTING.md) | Threats, status, test plan |
| [14](docs/14-CODEX-IMPLEMENTATION-ROADMAP.md) | M0–M6 dependencies/commands/DoD |
| [15](docs/15-DECISIONS-AND-ASSUMPTIONS.md) | ADR, skill matrix, unresolved choices |

For exact executed checks and known blockers, read [validation report](VALIDATION_REPORT.md).

**Privacy first:** prototype sample data may be used for smoke testing; real journal entries require Auth+owner RLS and verified secure syncing before cloud exposure.

## M1 verification and review

M1 retains static native modules and the spatial scrapbook. See [M1 evidence](docs/decisions/M1-IMPLEMENTATION.md).
Run `npm ci && npm run check` with Node 22 and full Git history (original provenance commit required).
For browser QA: `python -m pip install -r tests/requirements-browser.txt`, `python -m playwright install chromium`,
`npm run build && npm run test:browser`. System Chromium is used when present; set `ORBIT_BROWSER_BUNDLED=1` to use Playwright's installed browser.
Automatic Vercel Git deployments are disabled pending separate approval/protection verification. No application credentials are required locally.
