# 08 — Supabase implementation runbook (future Codex milestones)

**Status: DESIGN + SQL PREPARED, NOT CONNECTED.** The current app has no `@supabase/supabase-js` dependency, no real login and no network repositories. `src/cloud/client-config.js` and `src/cloud/mappers.js` are testable but deliberately **not imported** by `src/app.js`. This preserves the user-approved prototype.

## 1. Provisioning (user actions, not automated by this handoff)

1. Create a **separate Supabase development project** (or approved local stack); do not connect to any existing production project by assumption.
2. Set email Auth provider and disable public signups. Manually provision the single intended account in the dashboard (no credentials in code/repo). Consider MFA if available/appropriate.
3. Configure Auth **Site URL** for the exact eventual production domain; allow local URL and explicit Vercel preview paths. Never use a broad production wildcard unnecessarily.
4. Copy project URL and **publishable key** to secure environment configuration. Never put secret/service-role keys into JS or tracked `.env`.
5. Set up separate preview/staging data; avoid a test deployment writing real diary entries.

Current docs: [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [local development](https://supabase.com/docs/guides/local-development), [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

## 2. Local migration sequence

```sh
npx supabase --version
npx supabase --help
npx supabase migration --help
npx supabase start
npx supabase db reset   # WARNING: destroys LOCAL database contents
npx supabase test db
```

`supabase/config.toml` is a minimal local-only template. It is **unvalidated by CLI in this environment**; Codex must inspect generated CLI config and adapt if current Supabase CLI differs. The hand-authored migration is in `supabase/migrations/20261101140000_orbit_initial_schema.sql`; use the CLI to regenerate/verify the filename if required and retain a single authoritative migration. Do not execute remote `db push` until an explicit approval and verified backup.

## 3. Actual login/session strategy

- Keep a public login shell separate from the private scrapbook mounting lifecycle. Never render cloud journal before authenticated user and loading complete.
- Prefer passwordless email OTP/magic link for a single owner; use `signInWithOtp({ email, options:{ emailRedirectTo }})` with exact allowed redirect and rate/error UI, or another user-approved provider.
- Use `supabase.auth.getUser()` when a verified user identity is needed; `getSession`/onAuthStateChange can drive client state but are not a security boundary. RLS uses JWT `auth.uid()` regardless.
- On refresh, restore session before fetching data; show a neutral loading state; handle expired token by clearing private in-memory content and showing sign-in.
- On logout, stop pending writes, clear private DOM/model/caches, call `signOut`, clear app-private indexed caches/drafts, return to public shell. Avoid storing private diary in persistent browser cache without explicit consent.
- Disabled account/session revocation and MFA (if used) require their own E2E cases.

## 4. Client configuration and data adapter

1. Install an **exact reviewed version** of `@supabase/supabase-js` with npm; update and commit `package-lock.json`.
2. Current native ESM app has no `import.meta.env`. Create a small build-time **allowlisted public config** (URL + publishable key only) or a comparably safe solution. Never expose secret/service-role keys, including via Vercel env named with public prefix.
3. Pass values through `resolveCloudConfig()` in `src/cloud/client-config.js`; instantiate using the real SDK. Configure auto session refresh and PKCE/redirect based on current SDK docs.
4. Define a repository interface like `loadOwnerSnapshot(): Promise<Snapshot>`, `saveTask(task): Promise<Task>`, `saveJournalEntry(entry): Promise<Entry>`, `moveBranch()`, `saveLayout()`. Use row mappers in `src/cloud/mappers.js`.
5. Integrate **vertically**: authenticate → fetch one branch/task → mutate/reload one task → journal → milestones → layouts/preferences → backup import. Preserve existing CSS/DOM while swapping persistence per capability.
6. No cloud call should happen on sample data unless user explicitly chooses import.

## 5. Persistence and concurrency

- On initial login, prefer server state. If current local storage has V6 content, show a **reviewable migration banner** with item counts; do not silently upload or overwrite.
- Import order within a transaction: validate + create ancestor branches, then tasks, then journal, milestones, layout and preferences. Data API calls across tables are not automatically a single transaction: use a reviewed Postgres RPC or staged import with explicit rollback. A private RPC must validate caller and ownership; prefer `SECURITY INVOKER` if possible.
- `updated_at` is server-managed; do not do silent client-last-writer-wins. Choose either version+compare-and-swap or a clear conflict-UI with explicit overwrite decision.
- Distinguish `saving`, `saved`, `offline`, `retry`, `conflict` in UI. Journal editing must survive transient network errors until user consciously resolves them.
- Decide whether attachments are needed separately. External links only in V6.

## 6. RLS and authorization

- All seven tables have RLS enabled. Policies use `TO authenticated`, `USING` and `WITH CHECK` on `auth.uid()` for every mutating table. `SELECT` is required for UPDATE to work. Composite FKs prevent referencing another owner's branches.
- Test anonymous denied, owner A allowed, owner B denied, owner ID reassignment denied; test cross-owner foreign key, cycle rejection, delete with children, status constraint.
- `anon` and `public` grants revoked. Authenticated role gets DML, **not bypassrls**. No client `service_role`.
- Run Supabase advisors after local migration; fix findings. Add real row-isolation pgTAP tests before enabling a production database.

## 7. Storage policy (deliberately deferred)

`resource_url` is an external http/https link. No upload input, no bucket, and no Storage policy yet. A future private `owner_id/object_id` prefix requires private bucket with `storage.objects` policies scoped to `auth.uid()`; only implement when an attachment feature is approved.

## 8. Observable acceptance

- Fresh owner signs in: no sample tasks silently uploaded.
- Owner adds task and journal page: refresh + second authenticated device shows both.
- Guest and second account cannot read any private rows, even with direct REST URL and guessed IDs.
- Date changes journal marker; completed task disappears from graph but remains on timeline/history; widget positions sync correctly.
- Network failure preserves edit and shows unsaved state, retry eventually succeeds without data loss.
- No private body/credential appears in Vercel logs, browser source, GitHub artifacts, or QA screenshots.

**Do not run** `npx supabase db reset --linked` or `db push` against user projects as part of the first Codex task.
