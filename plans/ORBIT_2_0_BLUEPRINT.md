# ORBIT 2.0–2.3 — implementation blueprint

Date: 2026-11-08 (Asia/Jakarta). Source of truth: `CODEX_HANDOFF.md`, `AGENTS.md`, `docs/OPERATIONS.md` and `docs/PROJECT_HISTORY.md`. Base release 1.0.0 remains owner-only and serving from source `fc5af5a`. **This plan is not a deployment order**.

## 9 Nov 2026 implementation addendum

PR #24 (B01 collapse) merged. Source-only branch `feat/2.2-google-oauth-notes-20261109` advances A01 (Google OAuth-first UI), T01 (several labeled task links, not full checklists), J01 (shared native pen editor and `.excalidraw` external interchange for journal AND notes), K01 (paper stickies), and M01 (private signed image attachments with proposed per-user Storage RLS). **Not** a Production release; upstream embedded Excalidraw editor, themes, notifications, remote MCP, calendar/Drive and structured checklists remain separately scoped. Binary image backups and automatic cleanup remain future operations. The two additive migrations are pending and must preserve original owner content plus older client saves. [Google-first rollout & owner setup](../docs/OAUTH_2_2_ROLLOUT.md). Batch tests and avoid repeated GitHub Actions.

## Product constraints

Keep one zoomable/pannable spatial world, six original draggable/resizable windows, radial task organization, brown notebook paper, and the V6 identity. Native HTML/CSS/JS ES modules remain the host; add isolated packages only when a feature warrants them. Source stays public and MIT; workspace, journals, uploaded media and task details remain private per account. No default paid subscription and no silent migration of existing owner content.

## Sequenced work units

Every work unit requires an independent small PR, exact-head CI, tests and documented rollback. Work units with no shared files may proceed concurrently; a dependency means its acceptance gates have to pass first.

| ID | Release | Goal and affected interfaces | Dependencies | Acceptance and rollback |
| --- | --- | --- | --- | --- |
| F01 | 1.1 | Root displays profile name, safe branch deletion/reparent/undo, journal sorted by civil date, fullscreen respects viewport (`src/data.js`, `layout.js`, `constellation.js`, `app.js`, `journal.js`) | 1.0.0 | Unit/browser tests, no lost task IDs or journal content; revert code only |
| S01 | 2.0 | Replace singleton owner *workspace access* with tenant-specific authority, retaining publication ownership restriction (`supabase/migrations`, `supabase/tests`, RPCs) | F01 optional | A/B/C isolation on all seven tables, CAS snapshots, forged owner ID denial and per-user revisions; shadow test migration; stop/roll back before live apply if any failure |
| A01 | 2.0 | Multi-user sign up/in, email verification, password reset, profiles, independent onboarding, account export/deletion (`src/auth/`, `bootstrap.js`) | S01 | No Vercel account requirement, no public data access, signed-out wiping, testing of existing owner's login and a second user; restore old app and keep DB additive |
| H01 | 2.0 | Production hosting accessible to ordinary users with Supabase Auth, Vercel protection retained on previews (`Vercel project protection`, `vercel.json`, domain aliases) | S01, A01, hosted adversarial tests | Anonymous can load sign-in but never read/write personal data; Preview still protected. Rollback by restoring Production protection and known-good alias |
| B01 | 2.1 | Branch organization: expand/collapse, keyboard tree editing, search/reparent, safe deletion and undo (`constellation.js`, `layout.js`) | F01 | No cycles, no orphans, deterministic layout, user-controlled collapse; revert UI independently |
| W01 | 2.1 | “Your space” becomes main control panel; move save/import/export, profile, auth, appearance, technical camera controls from fixed dock into widget (`widgets.js`, `bootstrap.js`, `auth/shell.js`, CSS) | A01 | Dock gone, all actions accessible on touch and keyboard, notification state visible; revert presentation |
| I01 | 2.1 | One import entry point + selective export (`backup.js`, `csv.js`, parser and UI) | A01 | Preview schema, validate untrusted files, dry-run, choose merge/replace, support tasks/branches/journals/full-space; no silent overwrite; roll back import UI with backups intact |
| T01 | 2.1 | Rich task context: multiple URLs, instructions, linked files, checklists and structured metadata (`model.js`, editor, schema) | A01 | AI-readable schema, source titles and references, size limits, sanitization, versioned import/export; additive DB migration |
| N01 | 2.1 | User reminders/notification preferences with timezone and quiet hours | A01, T01 | Opt-in browser permission, in-app alerts, clear “only while open” limitations; remote scheduled push only after durability plan |
| J01 | 2.2 | Classic + Excalidraw journal page types; editable brown paper canvas, persisted scene JSON, dates unchanged | A01, I01 | Scene import/export roundtrip, old journal pages unaffected, no editor dependency in default bootstrap; rollback hides drawing UI without deleting scenes |
| M01 | 2.2 | Private images/assets for journals and sticky notes (`Supabase Storage`, RLS, size/type validation, secure URL lifetimes) | J01, S01 | A/B isolation, MIME and file-size caps, revocation, no public bucket; retain files if UI rolled back |
| K01 | 2.2 | Multiple paper-like draggable/resizable sticky notes in the spatial world; plain, drawing and image modes | M01 | Independent positions/sizes and content, keyboard/touch, V6 glass and paper design; rollback widget code |
| U01 | 2.2 | Appearance: curated light/dark/system themes, restrained liquid glass, animated ambient background, reduced-motion and transparency controls | W01 | Contrast tested, touch 44px, keyboard visible, no overblurring paper, smooth/optional animation, no generic dashboard rewrite |
| C01 | 2.3 | Authenticated ORBIT remote MCP/ChatGPT plugin with user-delegated scopes and audit trail | S01, A01, T01 | `search_tasks`, `create_task`, `update_task`, `list_branches`, journal reading only by selected scope; OAuth per user; explicit confirmation for destructive bulk writes; revoke access |
| G01 | 2.3 | Calendar and school schedule: ICS first; optional Google Calendar/Drive with minimal OAuth scopes | A01, T01 | Explicit connection, source attribution, sync conflict handling, disconnection and token revocation |
| X01 | 3.x | WhatsApp bot, extension, native Android/iOS shells | Secure API + stable 2.x | Separate release criteria, no insecure service-role shortcuts or unnecessary recurring costs |

## Security details for S01

Current base schema already has `owner_id` on private records and composite foreign keys. Existing permissive RLS policies restrict rows to `auth.uid()`, but a second **restrictive** `orbit_single_owner` policy and `private.is_orbit_owner()` prevent other users. A correct migration cannot just remove the restrictive policy. Inspect **all** functions and triggers: `load_owner_snapshot`, `save_owner_snapshot`, `private.lock_workspace_revision`, `private.bump_workspace_revision`, `private.workspace_revisions`, `private.publication_sources`, `public.published_content`, plus publication functions. Keep public publishing restricted to original owner until a separate explicitly scoped tenant publication design. Authorize workspace reads/writes by verified `auth.uid()` and each table's original owner RLS. Do not introduce service-role bypass or user-editable metadata authority.

Before hosted apply: check original owner UUID and row counts **read-only** (never disclose owner/journal content), confirm encrypted offline owner backup, run isolated SQL/HTTP A/B/C tests and baseline owner snapshot read/write in disposable database, and prepare an explicit deployment rollback plan. A code rollback does **not** undo a destructive migration or restore deleted journal entries.

The existing snapshot RPC replaces entire owner-specific records; after migration, test concurrently editing two different users, stale revisions, foreign-key attempts, direct DML revision bumps, and cross-user publication source IDs. Media and tenant deletion should follow separate opt-in reviewed migrations. Keep a separate schema version and do not rewrite historical migrations.

## Hosting and onboarding

Current Vercel Authentication `deploymentType=all` means visitors need a Vercel login. The planned public Production app should present **Supabase Auth** (email/password with verified email; OAuth later), while protected previews still require developer access. Changing Vercel protection occurs **after** S01/A01 tests, not before. Start with invite-only accounts to control free-tier abuse, then evaluate public signup and recovery email delivery. Existing user is not moved or deleted.

## Excalidraw integration

Excalidraw is MIT-licensed but its embeddable component uses React. Prefer a bounded **React island** loaded only within a journal/sticky-note editor, keeping the native ORBIT host. Review versioned npm peer dependencies, license and security; build the editor into static assets with pinned dependencies. Persist scene JSON separately from the existing HTML journal body, preserve a textured warm brown paper visual using `viewBackgroundColor` or a controlled editor background, and keep image attachments in private scoped storage. Never put an unrestricted webview/iframe over the authenticated space without sandboxing and input validation. Keep old journal export format and add a versioned scene export.

## ChatGPT MCP, permissions and AI safety

Provide an HTTPS MCP server/OAuth adapter built for ChatGPT's plugin/app connection flow, *not* unrestricted Supabase SQL access. Use user-delegated tokens with limited scopes, fine-grained task/journal tools, rate limits, audit logs, and confirmations for delete/import. The default tool list should read tasks/branches and create/update tasks. Journal reading, image access, and bulk changes should be separate optional scopes. Treat user-authored task text, URLs and documents as untrusted input (prompt injection risk). Never put an unrestricted Supabase service-role key or other user's journal into ChatGPT responses.

## Verification and engineering rules

- Node 22 + `npm ci --ignore-scripts && npm run check`; targeted Chromium/browser regressions from the existing quality workflow.
- Multi-user changes must pass pgTAP, isolated local HTTP bearer A/B/C authorization (READ, INSERT, UPDATE/PATCH, DELETE), direct RPC tests and client lifecycle tests. Hosted testing only with designated disposable accounts, after approval of fixture creation and cleanup.
- Every visual change must be checked at phone/desktop widths with real browser screenshots, focus/keyboard and reduced motion. Prefer semantic tokens rather than global glows and generic dashboards.
- Update `CHANGELOG.md`, `README.md`, `CODEX_HANDOFF.md`, `docs/OPERATIONS.md`, and release notes after accepted work.
- Tag/version: 1.1.x for organization fixes, 2.0.0 for multi-user isolation and public app auth, 2.1.x for workflow, 2.2.x for media/drawing/themes, 2.3.x for MCP and integrations.
- Release only tested approved pinned source with `--prod --skip-domain`, verify Vercel protection and exact origin, then separately promote approved aliases. Preserve known-good deployment and backup.

## Immediate priority

1. Protect `main`: no force pushes/deletion; require `static-quality` and security jobs before merges. Repo ruleset was absent on 2026-11-08; GitHub admin UI changes require administrative action.
2. Complete F01 and its regression tests in a small PR.
3. Build and test S01 **without applying the migration to hosted Production**, followed by A01.
4. Only after tenant-safe hosted acceptance change the public Production Vercel authentication gate.
