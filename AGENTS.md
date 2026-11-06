# ORBIT: Codex repository working instructions

## Mission and actual baseline
ORBIT V6 is a **working local-only static HTML/CSS/JavaScript ES-module prototype**, not an authenticated production app. Convert it incrementally into a secure, owner-only, multi-device system without recreating or visually redesigning it. Consult `CODEX_HANDOFF.md`, `CODEX_FIRST_TASK.md`, and `docs/01-...` through `docs/15-...` before significant work. The original V6 agent instructions are preserved at `docs/reference/AGENTS_V6_ORIGINAL.md`. These repository rules supersede the historical instructions only where they concern production engineering or verification.

## Design preservation -- non-negotiable
- Keep the pastel animated atmosphere, glass-like surfaces, **one navigable spatial scrapbook world**, and its six independently draggable/resizable windows (timeline, constellation, active, completed, space, journal). **No replacement tab/sidebar/card dashboard.**
- Preserve mobile touch controls and navigation. Preserve the user's custom arbitrary-depth radial graph, elastic dragging, free-standing glowing task text, inline details, sorting, and completed task exclusion from the constellation.
- Keep milestone labels unclipped; editable journal date; timeline markers for written pages; paper-like WYSIWYG journal; permanent Just Because branch; global backup/restore compatibility.
- Current HTML/CSS/JS under `index.html`, `src/` and `assets/` must stay byte-identical during milestone M0. Check SHA256 provenance at `docs/reference/V6_SOURCE_MANIFEST.json` (original V6 versions of `AGENTS.md`/`vercel.json` are intentionally archived/updated).
- Before changing visuals after M0, document a diagnosed usability/accessibility bug, show before/after desktop/mobile evidence, and obtain user approval for material visual changes. Apply Apple Design and anti-slop principles thoughtfully, not as a license for redesign.

## Architecture boundaries
- Keep the current vanilla ES modules and dependency-free build for the baseline. **Do not migrate to Next.js/React/Vite without an ADR, measurable need, and explicit approval.**
- Source of truth in M0: localStorage via `src/storage.js`; cloud code under `src/cloud/` is **prepared and inactive**. Do not claim Cloud/Supabase sync is already functional.
- Future persistence uses a small repository layer so graph, timeline, and journal consume one owner snapshot; do not duplicate task state across widgets.
- The proposed Postgres migration at `supabase/migrations/20261101140000_orbit_initial_schema.sql` is an **offline draft** and has **not been executed**. Validate it on a disposable local Supabase database before any linked/remote migration.
- Never connect, change, delete, or deploy to a real user's Supabase or Vercel project without verifying the target and receiving explicit authorization for that action. No force push or automatic release.

## Security rules
- Single-owner personal journal application by default. Ensure Supabase Auth and authenticated-owner RLS for EVERY private table; verify both signed-out and a different signed-in user cannot read/write private records via direct API.
- Never ship user journal content, tokens, passwords, service-role/secret keys in browser code, build artifacts, PR output, diagnostics, CI logs, or checked-in files. Public Supabase publishable key is allowed **only after RLS is independently verified**.
- Treat journal HTML, imported CSV/JSON, external URLs and task descriptions as untrusted. A UI-only sanitizer is not sufficient proof against XSS. Prefer security-invoker database operations; avoid unreviewed SECURITY DEFINER RPCs.
- No real private content in publicly accessible preview; a private GitHub repository does not protect a Vercel URL. Set Vercel Deployment Protection to cover all deployments for the prototype, then test incognito denial. Actual app Auth is still required.
- Changes to permissions, schema, Auth redirects, and deployment are independent review gates. Never run a destructive remote migration as a first step.

## Coding and verification expectations
- Node.js 22, npm lockfile, pure ES modules; use `npm ci`, `npm run check` (`lint`, `test`, `build`, `verify:structure`); historical browser QA can run with `python tests/qa_v6.py` when Playwright is installed.
- Note: `npm run lint` **only checks JS syntax**; it is not ESLint or TypeScript validation. Do not infer coverage, runtime safety, or SQL correctness from this check.
- Add unit + integration + browser E2E tests for each meaningful change; validate keyboard/320px/390px/tablet/landscape, reduced motion, error states, and actual origin persistence. Keep failure evidence and rollback instructions.
- Update numbered docs, changelog, and `CODEX_HANDOFF.md` when behavior or architecture changes. Record actual commands/results, distinguish not-run from PASS.
- In GitHub use minimal-permission CI; Vercel Git integration should handle preview deployments, not duplicate deploy secrets in CI.

## Code review workflow and optional skills
1. **Inspect before editing:** read relevant code, docs, test outputs and `git status`; define acceptance criteria and scope.
2. **Incremental work:** one vertical slice and a small diff per PR. Test it and preserve design behavior.
3. **Evidence:** report what changed, pass/fail/not-run with commands, security implications, and the next safe step.
4. **Skills:** use available equivalents of `ecc-search-first`, `ecc-blueprint`, `antislop-chatgpt`, `apple-design`, `ecc-postgres-patterns`, `ecc-database-migrations`, `ecc-security-review`, `ecc-tdd-workflow`, `ecc-e2e-testing`, `ecc-verification-loop`, Vercel and Supabase. They may NOT be installed in Codex; absence never blocks normal standards-based work.

## First assignment
Open `CODEX_FIRST_TASK.md`. Execute **only Milestone 0**. No cloud provisioning, design changes, deployment, or remote writes in the first Codex task.
