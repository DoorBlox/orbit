# ORBIT repository instructions for coding agents

> **Active 9 Nov 2026 source-only development:** PR #24 merged `bc910fbc`; branch `feat/2.2-google-oauth-notes-20261109` implements Google-first sign-in, private media, extra task URLs, notes and journal/sticky drawing. **NOT deployed.** Two additive SQL migrations still unapplied, no OAuth/Production settings changed. Owner Google Cloud setup required. See [rollout](docs/OAUTH_2_2_ROLLOUT.md). No framework migration; Excalidraw file interoperability is not full embedded React Excalidraw. Preserve exact-origin Auth/RLS, run CI only on reviewed PR. Older single-owner rules below are historical.

> **Latest 9 Nov 2026 update (read before the historical checkpoints below):** PR #21 (`d96d920`) and PR #23 (`11421a8`) are merged; protected Preview `dpl_Bri19261zEWUzRGoEkx6EfAwDkwr` is READY. Production remains on `fc5af5a` with Vercel Authentication on all deployments. Current branch `feat/2.1-branch-collapse-20261109` removes the LOCAL PROTOTYPE caption without changing the clock and adds collapsible branch groups; this view state is per-account/browser and exported in backups, not cloud-synced. Batch source changes and use Actions once per completed review slice. The 8 Nov update below is historical.

> **Latest 8 Nov 2026 update (read before the historical checkpoints below):** 1.1 foundations, ORBIT 2.0 tenant/signup source and 2.1 Space controls are in `main`. Hosted Supabase has migration `20261108161935 orbit_tenant_private_workspaces`, with unchanged owner row counts verified afterward. GitHub's [Protect main](https://github.com/DoorBlox/orbit/rules/26803051) ruleset is active. **Vercel Production is still 1.0.0 (`fc5af5a`) with Vercel Authentication for all deployments.** Multi-user Production exposure remains untested/not released. The older owner-only RLS and no-ruleset statements below are historical. Follow the latest section of [CODEX_HANDOFF.md](CODEX_HANDOFF.md).


> **Current as of 8 November 2026.** ORBIT 1.0.0 is **already live**, single-owner and private, at [orbit.starscene.com](https://orbit.starscene.com/). Source is intentionally public and [MIT licensed](LICENSE). Read [CODEX_HANDOFF.md](CODEX_HANDOFF.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), and [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before meaningful work. Older M0-first-task and pre-launch documents are **history**, not a command to repeat onboarding.

## Objective, ownership, and state

Keep building the existing ORBIT spatial scrapbook incrementally. The serving Production deployment is `dpl_9rgHVEreGqspHtNY27WnPyMduFik`, built from app source `fc5af5a8cd2c99d1e104615e72c3cd2b460f60d6`. Repository `main` contains newer CI/docs commits. The canonical domain is `orbit.starscene.com`; `orbit.allintime.space` intentionally redirects to it to preserve exact-origin Auth.

No action is automatically permitted merely because the user earlier authorized the completed release. **New** Production promotion, alias/DNS change, RLS/SQL mutation, Auth-user change, full data restore, secret access or paid resource requires task-specific approval. Read-only inspection, documentation updates and tests against disposable local environments are preferred. Do not ask for credentials or private backups in chat or GitHub.

## UX invariants — preserve V6

- **One continuous, freely pannable/zoomable coordinate plane**, not a tab bar, ordinary fixed-page grid, or dashboard. Six translucent, independent draggable/resizable widgets: timeline, constellation, active, completed, space and journal.
- Keep native HTML/CSS/JavaScript ES modules, spatial camera and constellation's independent radial camera. Do not migrate to React/Next/Vite without an ADR and explicit owner approval.
- Preserve the arbitrary-depth radial branches, Just Because branch, active/completed task distinction, glowing free-standing task text and inline detail, responsive spatial navigator, title-bar drag and accessible resize.
- Preserve dedicated timeline lanes for milestones/deadlines/dated journal links, exact `YYYY-MM-DD` journal date behavior, sanitized paper-like editing, V5→V6 backup compatibility and undo.
- Keep calm animated pastel backgrounds, glass materials, reduced-motion semantics, keyboard support and mobile touch/pinch behavior. Diagnose actual usability issues and show before/after evidence before any **material** visual changes.
- Original V6 provenance is locked in `docs/reference/V6_SOURCE_MANIFEST.json`; M1/M2 manifests track subsequent reviewed changes. **Never rewrite the original or historical source manifest to silence CI.**

## Auth, backend and privacy

- Public MIT source **does not** mean public scrapbook data. Keep Vercel Authentication `deploymentType=all`, Supabase user verification and server-managed owner allowlist, private-table RLS and least-privilege grants.
- The private application is **live and cloud-backed**, not future scaffolding. `src/bootstrap.js` selects local/cloud mode and controls private mounting; `src/auth/` verifies identity and authorization; `src/cloud/` owns snapshots, revision conflicts, recovery and imports/exports. Some old README files under `src/` are historical and cannot be edited casually because source hashes are reviewed.
- **Exact production sign-in origin** `https://orbit.starscene.com/` is intentional; don't weaken `AuthController` same-origin checks or add wildcard OAuth redirects to accommodate a secondary hostname.
- Validate all imported JSON/CSV and diary HTML as untrusted; avoid unsafe rendering, client-side-only authorization, user-editable JWT claims and careless `SECURITY DEFINER` functions.
- Never expose or log service-role keys, session cookies, JWTs, the `VERCEL_TOKEN` Actions secret, owner journal text, or complete JSON backups. A public publishable key is different from a privileged secret.
- No automatic import of localStorage into cloud. A Production restore/import replaces owner content and requires specific owner consent. Full JSON backups are unencrypted unless protected externally.

## Code and verification workflow

1. **Inspect first.** Check the exact `main` SHA, staged/Production deployment metadata, current task-related code and prior tests. Use the real repository, not old handoff guesses.
2. **Small PRs.** Make scoped changes, add unit/integration/browser tests when behavior changes, record limitations and actual evidence.
3. **Node 22 and locked dependencies:** `npm ci --ignore-scripts`, `npm run check`, targeted browser scripts (see README). `npm run lint` checks JavaScript **syntax only**. Do not claim full coverage or a physical-device pass from Playwright alone.
4. **Supabase:** prefer `.github/workflows/local-supabase-rls.yml` (205 pgTAP + local bearer HTTP checks) and disposable local fixtures. Real hosted nonowner READ/INSERT HTTP passed; real hosted PATCH/DELETE was **not** executed. Do not run surprise live probes/fixtures.
5. **Release:** `.github/workflows/m6-release-dry-run.yml` checks a synthetic-key Production artifact. `.github/workflows/m6-stage-only-production.yml` is manually dispatched, **pins older reviewed app SHA `fc5af5a`**, and stages with `--prod --skip-domain`. Update source pin deliberately for any *future* release. `vercel.json` disables automatic Git deploy. Verify protection, each alias and rollback readiness before approved reassignment.
6. **Evidence and documentation:** Update README, `CODEX_HANDOFF.md`, release notes/changelog and runbook after significant changes. Label **PASS**, **FAIL**, **NOT RUN**, **owner-attested**, and **independently verified** accurately.

## Known limitations and no-cost boundary

The owner's canonical Production login and redirect were explicitly confirmed. Authenticated Production CSP/header capture, hosted nonowner PATCH/DELETE, full physical iOS/Android/assistive-tech testing, Google OAuth/Email OTP acceptance and independent backup restore were not certified. Supabase leaked-password protection is Pro-tier; do not require a subscription. Public GitHub branch protection/rulesets were not enabled at last check and are a useful optional hardening task.

**Next action is the user's new request**, not the obsolete "first execute M0" task. Historical M0 scripts, decisions, design snapshots and validation logs remain useful for provenance. Source of truth: [handoff](CODEX_HANDOFF.md), [operations](docs/OPERATIONS.md), [history](docs/PROJECT_HISTORY.md) and direct provider checks.
