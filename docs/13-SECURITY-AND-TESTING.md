# 13 — Security and test plan with honest execution status

## Current evidence — 6 November 2026

M2 conditional acceptance and M2.5 verification supersede the historical local-only
status below. The owner reports M2.5 CI passed and its protected Preview is deployed.
Hosted Auth, persistence, synchronization, conflict recovery, logout and nonowner
read isolation passed per recorded owner evidence. Physical-device and full hosted
write/CRUD authorization remain documented gaps; read isolation is not mutation
certification. Local SQL/Auth/API evidence and the 156-test/M2.5 browser results are
preserved in the milestone evidence archives.

The new M3 dependency advisory audit reports zero known vulnerabilities across
locked dependencies; the existing credential-signature scan found no matches in
32 browser/build/CI files. Neither result is a full security proof. M3's issue plan
is currently inaccessible through this session's GitHub API/HTML connection; do
not infer its exit criteria from the older milestone numbering below. No live
mutations or authorization changes are part of these audits.

## Historical M1 verified local results

`npm ci`, `npm run check` (49 Node results), static build, HTTP/origin checks, inherited five-viewport QA, new actual-origin `tests/qa_m1.py`, integrity tampering tests and limited signature scan pass. Changed pure data/recovery modules measure 95.69% line and 85.17% branch coverage; DOM and whole-app coverage are not claimed. Local CSP disallows external connections, eval and executable inline scripts; inline styles support existing spatial positioning. Automatic Vercel Git deployments are disabled pending separate approval.

See [actual commands and limits](decisions/M1-IMPLEMENTATION.md) and [targeted security review](decisions/M1-SECURITY-REVIEW.md). SQL/RLS/Auth/cloud, hosted protection, physical devices and full XSS/WCAG audits remain unverified. The following table is the **historical handoff authoring record**, superseded for local M0/M1 results by their evidence reports.


## What is tested so far

| Verification | Actual command/result | Scope/limitations |
|---|---|---|
| V6 unit baseline | `npm test` in unmodified source: PASS | one Node test file with pure model/CSV/layout assertions |
| V6 interactive smoke | `python tests/qa_v6.py`: PASS on desktop/tablet/390/320/landscape Chromium | loads bundled HTML into Playwright using mocked localStorage, **not** deployed-origin persistence or cross-user |
| Handoff JS syntax | `npm run lint`: PASS | Node `--check` for JS/MJS, not ESLint or full typecheck |
| Handoff unit tests | `npm test`: PASS | original tests + adapter/config tests, not DB or Auth |
| Handoff static build | `npm run build`: PASS | copies existing source into `dist`, no minification or framework replacement |
| Handoff structural check | `npm run verify:structure`: PASS (35 required paths) | checks paths, static reference, env-example safety |
| HTTP dist delivery and private-path filtering | `python tests/qa_http.py`: PASS | Real Node HTTP responses; browser origin still needs independent validation |
| Browser on real HTTP origin | `python tests/qa_origin.py`: BLOCKED (`ERR_BLOCKED_BY_ADMINISTRATOR`) | Chromium local-host navigation denied in author environment; retry in Codex |
| Original V6 source SHA256 | `npm run verify:source`: PASS (13 source files) | Preserved V6 JS/CSS/index/icon |
| Database migration execution | NOT RUN | Supabase CLI/Postgres/Docker unavailable in this environment |
| Supabase RLS tests | NOT RUN | pgTAP scaffold present, genuine row-allow/deny tests still required |
| GitHub Actions CI on GitHub | NOT RUN | repository not created/pushed |
| Vercel preview and protection | NOT RUN | no deployment, no account connection |
| Real-device accessibility & performance | NOT RUN | requires iPhone/Android, screen reader, throttling |

## Concrete security threats / mitigations

| Threat | Current evidence | Mitigation before production |
|---|---|---|
| Unauthenticated hosted private content | no auth in `src/app.js` | AuthGate, session lifecycle + owner RLS; Vercel All Deployments protection on prototype |
| Client-side key bypass | no keys now | publishable key only, RLS owner policies and tests, no service-role in browser |
| Insecure journal HTML/paste | `src/journal.js` sanitizes allowlist, uses `innerHTML` for internal render, `execCommand` for formatting | independent XSS tests, CSP, structured editor or maintained sanitizer; do not trust backup HTML |
| Cross-account linking | new SQL composite FKs | migration execution, RLS owner + Alice/Bob tests for branches/tasks |
| Branch cycles | local validator and new SQL trigger | test direct SQL moves and concurrent updates |
| Silent localStorage failures | `src/storage.js` catches writes | explicit save errors, retry/recovery, no 'Saved' before DB ack |
| Unintended import overwrite | `src/app.js` restores arrays and persists in steps | atomic reviewed import, schema-version checks, file limits, dry-run and rollback |
| Dangerous external URL | `validateHttpUrl` enforces http/https; CSV export escapes some formula prefixes | URL revalidation server-side, safe rel attributes, CSV injection coverage incl leading whitespace |
| Public files/secrets in deploy | source folder includes docs and test artifacts | output only `dist`; check deployment archive for secrets and private exported backups |
| Account session revocation | no auth yet | close/gate UI on logout/expiration; MFA as approved, short tokens |
| Dependency/supply chain | runtime deps zero; CI pinned actions | only install reviewed packages, lockfile and limited CI permissions |
| Lost offline edits or conflicts | localStorage only, no sync | draft and server revision strategy, concurrency tests, no silent last-writer overwrite |
| Privacy in telemetry | none now | error redaction, avoid logging diary content/tokens |

## Testing pyramid / command plan

**Local static:** `npm ci && npm run check` (Node 22). Existing tests run in-process with `node --test`; add targeted tests per new module. Avoid fake coverage claims.

**Interactive E2E:** keep historical `tests/qa_v6.py` while adding Playwright suite that launches `npm run dev` via actual localhost server and exercises: capture/edit/complete/reopen, branch mutation, milestone create/delete, journal date/format/save, timeline marker, backup, window movement, 320/390/mobile landscape, keyboard focus. Take screenshots on state changes, not only initial render.

**Supabase integration:** `npx supabase start`, `npx supabase db reset` (**LOCAL only**), `npx supabase test db`. `supabase/tests/01_schema_and_rls.sql` is a **pgTAP presence scaffold**; add row-allow/deny tests with real auth.users fixtures and cross-owner FK assertions before production. Run advisors and inspect policy definitions/grants.

**Hosted preview:** HTTPS sign-in/log-out/expired session, incognito anonymous denial, user A/B cross-read prevention via Data API, sync across devices, offline write recovery, invalid CSV/JSON and XSS injection, Vercel deployment protection.

**Performance:** 100/500/2000 tasks, low-end Android phone or CPU throttling, inspector for layout shifts/reflows, memory and frame budget, reduced motion. **Targets are proposed, not measured.**

## Security audit before connecting cloud

- Verify all data tables use RLS with authenticated role and `USING` + `WITH CHECK`; UPDATE also needs SELECT.
- Verify grants, indexes, functions, trigger ownership and any views/RPCs. No public `SECURITY DEFINER` endpoints.
- Verify direct forged owner_id/user_id attempts cannot leak or transfer rows.
- Verify Storage bucket does not exist until intentionally implemented.
- Verify Auth redirects (production + preview) and disable signup; no token reflected in logs.
- Sanitize every journal load/save/import path; test links and malicious HTML; avoid inline script allowance in CSP where feasible.
- Check builds/commits for actual secrets and private backups; automated regex scanning is not a full security audit.
- Test rollback restores code and preserves data integrity after schema changes.

## Anti-slop skill result (current project)

- **Integrity:** PASS for labeling local prototype; release labels must change as functionality changes.
- **Design:** PASS on distinctiveness of spatial scrapbook and paper journal.
- **Usability:** NEEDS WORK (actual Safari/VoiceOver/Android, contrast and stress testing).
- **Implementation:** PASS for unmodified UI module graph + runnable static build, NEEDS WORK for auth, persistence, cloud test evidence.

## Severity and ownership

P0: private content access / lost data / bypassed RLS → block release. P1: orphaned data, broken mobile controls, unverified migration → block relevant milestone. P2: excessive blur, low FPS, visual polish → prioritize by measured effect. Human owner reviews all production-security decisions.
