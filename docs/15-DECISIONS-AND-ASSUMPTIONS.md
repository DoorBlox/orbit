# 15 — Architecture decision record and skill utilization

## Owner acceptance — 6 November 2026

M2 is conditionally accepted for protected, password-based private use. The owner
accepts the documented remaining physical-device and hosted write/CRUD authorization
gaps for that scope; read-isolation PASS does not certify hosted mutations.
Preserve the completed evidence and hosted temporary nonowner. M2.5 Motion Polish
was subsequently authorized for autonomous implementation. P0/P1 are complete
on `codex/m25-motion-polish`; [results and limits](decisions/M2_5-IMPLEMENTATION.md)
record the passing checks. P2 is deferred; no merge or deployment has occurred. No deployment, Production, Supabase/Auth/RLS,
DNS or protection changes follow from this acceptance. Earlier provider/status
assumptions below are historical where superseded by this decision.

## M1 decisions

- D-016: Keep the original V6 SHA manifest immutable and verify its Git blobs at commit 06f8039. A separate reviewed M1 source inventory admits intentional changes and rejects unexpected changes. CI needs full history. After source diff review, `npm run record:source -- --reviewed` refreshes existing approved entries; new paths/reasons require explicit manifest review. Never rewrite the V6 manifest.
- D-017: Retain current localStorage keys and V5/V6 backups. Malformed values remain protected/exportable; complete restore validates before mutation and writes recoverable originals first. This does not provide transactions or cross-tab concurrency.
- D-018: No new frontend runtime dependencies, editor/framework migration or cloud integration. Shared Jakarta civil dates preserve the journal's existing convention. Automatic Vercel Git deployment is disabled pending separate target/protection/deployment approval.


## Accepted and held design choices

| ID | Decision | Evidence / rationale | Change process |
|---|---|---|---|
| D-001 | Preserve original V6 source/UI | user explicitly asked for conversion, NOT recreation | ADR + screenshots + regression required |
| D-002 | Keep static HTML/CSS/JS modules | no npm runtime deps, works in local browser | change only for measurable need |
| D-003 | Retain one spatial world with six free-floating resizable windows | V6 source and screenshots; no fixed grid | user product approval for change |
| D-004 | Preserve all task views' canonical shared state | `src/app.js`/`src/widgets.js` | repository interface, not duplicated state |
| D-005 | Keep root `HISYAM` and Just Because branch | user design decision; hardcoded root currently | profile customization deferred |
| D-006 | Store V6 string entity IDs in Postgres | backwards-compatible backups and UI assignment | potentially migrate via reviewed ADR later |
| D-007 | Single-owner private account model only | not a collaboration app | new roles require threat model + RLS redesign |
| D-008 | Use Supabase Auth/RLS Data API before custom backend | fits owner CRUD, least privileged | Edge/server only for secret-bearing future integrations |
| D-009 | No real Storage bucket until binary attachments implemented | existing `resourceUrl` only | separate feature scope |
| D-010 | No cloud integration silently activated in handoff | no owner config, RLS execution unverified | Codex M2-M3 with local tests |
| D-011 | Avoid AGPL copying from Spicy Lyrics | original pastel atmosphere CSS is independent | license review for future assets/code |
| D-012 | Use Vercel Other + dist copy build | vanilla static app, minimize transformations | verify on hosted preview |
| D-013 | Vercel Authentication All Deployments for proto preview | private repo alone doesn't restrict live URL | user config and incognito check |
| D-014 | Do not commit LICENSE until explicitly chosen | private source, licensing decision missing | user decision |
| D-015 | Do not silently import browser journal | sensitive private content | consent + review + atomicity required |

## Assumptions requiring confirmation later

- A-01: Owner uses personal devices and needs no collaboration/guest accounts.
- A-02: Journal content is private and should not appear in third-party telemetry or test fixtures.
- A-03: Preferred date/timezone is Asia/Jakarta unless owner changes it later.
- A-04: External resources are URL links only; file uploads are out of MVP scope.
- A-05: Only sample/demo content will be used in the first protected Vercel preview.
- A-06: PostgreSQL schema and Supabase CLI config are drafts, not proven executable on the owner's instance.
- A-07: Hosting and Supabase service costs/plan availability will be confirmed by owner when creating projects.
- A-08: Authentication provider and domain are not chosen; no fake URL or access token is embedded.
- A-09: No rights to copy Spicy Lyrics AGPL code without accepting its license obligations; none copied in handoff.

## Skill utilization matrix (skills used in ChatGPT, not automatically installed in Codex)

| Skill | Why used | Phase covered | Codex availability |
|---|---|---|---|
| `supabase` | current RLS/CLI/Auth security patterns, SQL boundaries | 4–5, 8, 13 | external plugin skill, not assumed in Codex |
| `vercel/deployments-cicd` | current Git deployment/protection/build guidance | 6–7, 10, 12 | external plugin skill, not assumed |
| `ecc-blueprint` | incremental milestone DAG, acceptance and rollback | 10/14 | only if installed in Codex |
| `ecc-search-first` | preserve repository code, avoid premature framework/library swap | 1–2 | only if installed |
| `ecc-postgres-patterns` | FK/index/schema choices | 5/7 | only if installed |
| `ecc-database-migrations` | migration safety, local first, no destructive remote push | 5/7/14 | only if installed |
| `ecc-security-review` | auth, XSS, secrets, RLS and threat checks | 5/13 | only if installed |
| `ecc-verification-loop` | evidence-oriented build/test/report | 1/13 | only if installed |
| `antislop-chatgpt` | unique design preservation, anti-generic UX audit | 2/5 | only if installed |
| `apple-design` (existing ORBIT workflow) | HIG principles, glass/accessibility/mobile review | 2/5 | only if installed |

`ecc-tdd-workflow`, `ecc-e2e-testing`, `ecc-frontend-patterns`, `ecc-backend-patterns`, `ecc-api-design`, and `ecc-deployment-patterns` are suggested **Codex execution aids**, not asserted as invoked here. Codex must inspect its own installed skill catalog. The presence of instructions in a ChatGPT skill does not install dependencies or grant cloud permissions.

## Deferred engineering decisions

- Rich-text editor choice (Tiptap recommended for structured document model, but test actual version and migration compatibility before adding).
- Conflict strategy (per-row revision/version versus owner-visible conflict resolution), especially journal edits across devices.
- Private offline draft cache encryption and logout cleanup.
- Soft-delete duration and undo semantics for journal/milestones/tasks.
- Accessibility alternative to radial map for keyboard/screen reader, without altering visual design.
- Notification schedules, Pomodoro, Classroom integration and potential additional user roles: future RFCs only.

## Source and docs provenance

- `docs/reference/V6_SOURCE_MANIFEST.json` contains original SHA256 for actual archive bytes.
- Historical V6 docs under `docs/` remain as source context; numbered handoff docs and root AGENTS take precedence for future production implementation.
- Official references: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/local-development ; https://vercel.com/docs/builds/configure-a-build ; https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan .
- Data examples in `supabase/seed.sql` are invented **synthetic development fixtures**, not claims about user's actual tasks or journal entries.


## M2 approved scope (2 November 2026, Asia/Jakarta)

The owner authorized a $0-only separate Supabase development project under doorblox's projects, protected Vercel previews, and cloud integration in M2. The app remains vanilla ES modules; the pinned Supabase SDK is isolated in one esbuild bundle. Authorization uses an administratively configured Auth UUID, independent of login provider. Google is the initial provider. Public viewing uses a separate explicit publication projection and is disabled in development. Local imports require explicit review and confirmation; journal data is never automatically uploaded. No production database, paid resource, public deployment, merge or release is authorized. M2.5 is Motion Polish; M3 is ORBIT 1.0.0.
