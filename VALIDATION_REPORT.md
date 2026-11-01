# ORBIT V6 Codex handoff — validation and honest status

**Prepared:** 2026-11-01  |  **Scope:** package/source/static build/docs/inactive Supabase planning only  |  **No hosted deployment or remote database modification.**

## Actual toolchain

- Node.js: **22.16.0**, npm: **10.9.2**. Frontend: native HTML, CSS, browser ES modules (no npm runtime dependencies).
- Chromium at `/usr/bin/chromium` and Python Playwright for `page.set_content` simulated browser testing.
- Python standard libraries for JSON, TOML, SHA256 and ZIP validation. PyYAML parsed CI workflow.
- Supabase CLI, PostgreSQL `psql`, Docker: **not available**; so migration execution/pgTAP/auth isolation are **not verified**.

## Verification evidence

| Check | Status | Exact evidence / limitations |
|---|---|---|
| Real original V6 source in handoff | **VERIFIED** | `node scripts/verify-source.mjs` — 13 originally preserved files SHA256 match V6 ZIP; root V6 `AGENTS.md`, README archived; `vercel.json` updated intentionally |
| npm lockfile reproducibility | **VERIFIED** | `npm ci --ignore-scripts --offline --no-audit --no-fund` passed; zero package dependencies |
| Browser JavaScript syntax | **VERIFIED** | `npm run lint` Node `--check` passed 19 JS/MJS files; not ESLint/TypeScript |
| Node tests | **VERIFIED** | `npm test` passed 6 test files/subtests in TAP (5 mapper/config cases + one inherited comprehensive pure-model test) |
| Static distribution | **VERIFIED** | `npm run build` copies original index, 11 browser source files and SVG only; inactive cloud adapters and private repo files excluded |
| Project structural test | **VERIFIED** | `npm run verify:structure` passed 35 required project paths |
| Documentation completeness | **VERIFIED** | `python scripts/validate_handoff.py` verified all numbered 01–15 docs, parsed JSON/TOML, relative links, source checksums, declaration presence for 7 owner-private tables/RLS policy statements |
| Browser simulated viewports | **VERIFIED** | `python tests/qa_v6.py` passed desktop/tablet/390px/320px/landscape using HTML `page.set_content` and mocked localStorage; this is not a network-origin/security test |
| HTTP serving/denylist | **VERIFIED** | `python tests/qa_http.py` passed `GET /`, JS, CSS, SVG and denied direct access to `.env.example`, docs, SQL, package metadata |
| Real HTTP-origin Chromium persisted session | **BLOCKED** | `python tests/qa_origin.py` reached Chromium `Page.goto`, failed `net::ERR_BLOCKED_BY_ADMINISTRATOR`. HTTP endpoint itself worked. Run on local user/Codex environment. This does not implicate ORBIT code by itself |
| Git dry-run repository readiness | **VERIFIED** | Fresh extracted copy: `git init -q` and `git add -n .` identified 92 intended tracked files; excludes `dist/`, dependency tree and `.env` secrets. No commit/push made |
| GitHub Actions file | **PREPARED BUT NOT VERIFIED** | `.github/workflows/quality.yml` parsed as YAML; action versions pinned to verified full SHA; no GitHub workflow dispatched |
| Supabase SQL syntax/migration | **PREPARED BUT NOT VERIFIED** | `supabase/migrations/*.sql` hand-authored; static shape/policy names checked, but SQL not executed in PostgreSQL / CLI |
| Row Level Security isolation | **REQUIRES CODEX IMPLEMENTATION** | owner policies drafted; pgTAP presence scaffold exists; actual `anon`/owner A/owner B access tests and forged owner mutation tests still required |
| Auth + cloud data operations | **REQUIRES CODEX IMPLEMENTATION** | future mappers/config only; no import in source UI, no SDK installed, no users or sessions provisioned |
| Online Vercel protection and browser QA | **REQUIRES USER CONFIGURATION** | static build config ready, private repo and deployment not yet created; ALL DEPLOYMENTS protection must be set and tested |
| Real phone hardware/performance | **PREPARED BUT NOT VERIFIED** | simulated Chromium layouts pass; physical Safari/Android/VoiceOver and 2,000-task stress not verified |
| Secrets scan | **VERIFIED (limited)** | `python scripts/check_secrets.py`: no common key signatures in reviewed browser/build/CI files; limited regex scan, not a full secret audit |

## Clean ZIP extraction test

The `PROJECT_CODEX_HANDOFF.zip` archive was independently extracted to `/mnt/data/orbit_handoff_verify_extract/PROJECT_CODEX_HANDOFF`. From that clean extraction, `npm ci --ignore-scripts --offline --no-audit --no-fund`, `npm run check`, `python scripts/validate_handoff.py`, `python scripts/check_secrets.py`, and `python tests/qa_http.py` **all passed**. This verifies that the handoff does not rely on unzipped transient build artifacts or globally installed npm packages for the static build. It does **not** verify cloud connectivity or real-origin Chromium browser behavior.

## Known risks and next gates

1. **P0 Privacy:** no application authentication exists. Even a private GitHub repository would produce a public Vercel URL unless deployment protection configured. Do NOT use real diary entries online until Auth + verified owner RLS + security testing are complete.
2. **P0 Data:** `localStorage` is per-origin, not cross-device; JSON backup is unencrypted; no automatic migration to cloud.
3. **P0/1 SQL:** proposed Postgres migration and local Supabase CLI configuration not tested. Must validate in disposable **local** Supabase, run schema/policy/owner-isolation/transaction/concurrency tests before any remote push.
4. **P1 XSS:** V6 rich-text journal still uses `document.execCommand` and an allowlist HTML sanitizer. Verify malicious paste/import cases and adopt a maintained rich-text editor / robust sanitizer before cloud integration.
5. **P1 UX:** accessibility alternatives, reduced-motion, failed-save recovery, screen reader, touch/gesture tests on real devices still needed.
6. **P2 Performance:** moving pastel atmosphere and radial graph require real hardware load tests with 100/500/2,000 tasks.

## What Codex should do first

Follow `CODEX_FIRST_TASK.md` (Milestone 0), independently verify this report, run `python tests/qa_origin.py` on a normal local origin, inspect original source and package state. Do **not** accept these authoring-environment results as a replacement for Codex's own machine tests.

For additional details see `docs/13-SECURITY-AND-TESTING.md`, `docs/14-CODEX-IMPLEMENTATION-ROADMAP.md`.
