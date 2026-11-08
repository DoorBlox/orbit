> **Archived M0-only onboarding prompt.** ORBIT is already in protected Production as of 7 November 2026. This file is retained for historical M0 provenance and must **not** be used as the next task. To resume, read [CODEX_HANDOFF.md](CODEX_HANDOFF.md), [README.md](README.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md).

# Copy/paste into Codex — FIRST TASK (Milestone 0, read-only baseline)

## Objective
Audit the real ORBIT V6 source I just extracted from this repository and establish a reproducible baseline. **Do NOT redesign, refactor, create cloud resources, apply database migrations, or deploy yet.** This is Milestone 0 in `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`.

## Prompt for Codex

> You're the principal software engineer working in my ORBIT repository. First read root `AGENTS.md`, `CODEX_HANDOFF.md`, the V6 source manifest at `docs/reference/V6_SOURCE_MANIFEST.json`, `docs/02-EXISTING-FEATURE-AUDIT.md`, `docs/06-SYSTEM-ARCHITECTURE.md`, `docs/13-SECURITY-AND-TESTING.md` and `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`.
>
> Inspect actual `index.html`, all `src/*.js`/`src/styles.css`, scripts, lockfile, tests, and git status; do not speculate about files or APIs. Ensure the original V6 UI/source bytes match the manifest. Run `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run verify:structure` on Node 22; run inherited Python Chromium QA only if Playwright is available. Test serving `dist/` via `npm run dev:dist` and check real-origin localStorage persistence if feasible. Do not upload private data or request secrets.
>
> Write a concise baseline report at `docs/decisions/M0-BASELINE.md` recording actual commands, PASS/FAIL/NOT RUN, known issues by severity, expected-vs-actual screenshot behavior at desktop and mobile, and prioritized risks. Flag that Supabase SQL/CLI config, RLS, GitHub Actions, and Vercel protection are prepared but not executed. Preserve the project architecture (vanilla modules, spatial scrapbook UX); do not change any original V6 UI/source file in this task. If any check fails, diagnose and propose the smallest remediation without silently changing scope. Finally show the diff and ask before Milestone 1 or 2.

## Acceptance / Definition of Done
- SHA256 original files validated against manifest; no original V6 UI changes.
- Exact commands/tests and outcomes recorded, including missing tools.
- `npm ci`, syntax checks, tests, static build and structure pass (or a specific reproducible blocker is identified).
- No cloud credentials, database changes, Git push, or deployment.
- Report is a human-readable local file at `docs/decisions/M0-BASELINE.md`.
