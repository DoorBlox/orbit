# BP-04 — Supabase migration-history parity and safe future procedure

**Evidence date:** 9 November 2026. **Project:** ixfgavgtwuzdgucjriec. **Scope:** seven already-applied schema migrations and their GitHub source files. **Safety:** all live Supabase operations performed for this assessment were read-only; no hosted migration command, history repair, SQL mutation, data copy, Storage deletion or paid provider change.

## Why this needed work

The seven local SQL filenames had timestamps that differed from the versions already recorded in hosted Supabase's migration ledger. On 9 November, all seven hosted statements were compared directly to the GitHub SQL by descriptive migration name with read-only queries. **Five were identical byte-for-byte; two differed only by a terminal newline.** This does NOT establish that every database object or grant independently matches a clean replay; it establishes precise migration-statement content correspondence.

Supabase's official CLI documentation explains that local and remote migration histories are matched **by timestamp**, not descriptive filename suffix or SQL similarity. Running a future remote push with the old filenames could therefore attempt to treat already-applied SQL as new history entries. Do not run that command casually.

## Verified source-to-hosted mapping

| Migration name | Old repository version | Hosted applied version / aligned local filename | Git content blob SHA |
| --- | --- | --- | --- |
| orbit_initial_schema | 20261101140000 | 20261101153811 | 92fc175b048e640305b4924b224baf33eff56421 |
| orbit_owner_snapshots_publication | 20261101140001 | 20261101154355 | ec616dc7f071bb0fac4ec90550f680b26eb6299e |
| orbit_business_conflict_http_status | 20261102053522 | 20261102054113 | 7d1fb01d75bfbad7af1e816ea289afacc1a82b11 |
| orbit_private_table_least_privilege | 20261106120000 | 20261106142540 | 86e85d6b75fd73370235bc048d5013c23e556fcf |
| orbit_tenant_private_workspaces | 20261108160000 | 20261108161935 | 03b3c87263321118044ebc63cb8db0ea4dd0763e |
| orbit_private_extensions | 20261109015000 | 20261108185344 | 04e1f2245f8949abcd3cdca31c2fb5f98639c2a4 |
| orbit_private_media | 20261109020000 | 20261108185405 | 723f40692647461b5f23a5ffb8f69bc139d8cafc |

### Source-only alignment

This BP-04 source change **renames the seven local migration files to the hosted applied version IDs without modifying any SQL blob content**. The same Git blob SHA is reused for each new path. It updates three hardcoded reference paths (structure check, historical handoff validation, local legacy DB test) and adds tests/migration_history.test.mjs to prevent future accidental filename/version or SQL-body drift. The schema must be rebuilt and its RLS tests run on a disposable LOCAL Supabase stack in required CI.

No external database history has been edited. The actual Production version IDs remain the seven values above. Historical documents may legitimately mention original filenames; do not rewrite dated M0–M6 evidence to pretend the renamed files existed then.

## Required verification before accepting this PR

- GitHub PR is limited to seven identical-blob renames, reference updates, static tests and current documentation; no SQL statement edits.
- Node tests: seven local timestamp/name mappings and reviewed exact Git blob signatures; old filename aliases absent.
- scripts/verify-structure.mjs and scripts/validate_handoff.py use the new initial/least-privilege filenames and current CHATGPT_HANDOFF.md.
- Required CI static-quality includes syntax, unit tests, reviewed source/build and browser behavior; local-postgres-rls starts the disposable stack, applies ALL seven aligned SQL files, runs pgTAP and real LOCAL bearer-session HTTP isolation; synthetic release artifact and anonymous Production-protection jobs stay green.
- There is **no hosted database write**. A CI pass validates clean local replay and schema tests; it does **not** prove historical row data backup integrity or complete hosted object-level parity.

## Next hosted migration — safe approval gate

1. **Before any future schema change:** check [CHATGPT_HANDOFF.md](../CHATGPT_HANDOFF.md), exact GitHub main/release source, the seven-hosted migration IDs, and the current Supabase CLI version. ORBIT CI currently pins CLI 2.84.2. Supabase released new CLI v3 behavior in November 2026, so consult the version-specific help rather than reusing old flags.
2. In an explicitly authorized, read-only connected CLI session, use migration listing to verify that **each existing local timestamp is matched by the remote history**. If linked, the current docs describe a remote target option for the CLI; do not assume a command targets hosted Production by default. Do not expose database passwords or admin tokens.
3. Only then request and inspect a **dry-run plan** of future changes and capture the exact pending versions. If it proposes replaying any of these seven reviewed existing migrations, STOP; investigate instead of continuing.
4. Build proposed NEW migrations in an isolated local stack, verify per-owner RLS and Auth bearer HTTP tests, capture a separate owner-approved backup/recovery plan, and inspect security advisors and the diff.
5. **Never run a hosted push, migration repair, restore, destructive SQL or version-ledger edit without separate scoped owner authorization.** Explicitly record the resulting hosted version and after-state. A GitHub merge by itself is not database approval.
6. If a future local/remote history mismatch still exists, consult current official Supabase CLI documentation. Migration repair changes the migration history table; it is NOT the same as applying SQL and is still a hosted write requiring authorization. Do not fix this by adding duplicate migrations or falsely claiming a green local test proves hosted parity.

## Rollback

If this source-only filename alignment fails local replay or source-integrity tests, keep main unchanged; revise or close the PR. If it is merged and later causes a local CI/tool mismatch, revert the source-only rename and references in GitHub before any new remote migration is authorized. A Git revert does not change or recover hosted database state; no database restore is part of this step.

## References

- [Supabase: Database migrations and history mismatch](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI: migration list and repair](https://supabase.com/docs/reference/cli/supabase-migration-list)
- [Supabase CLI: dry-run and remote targets](https://supabase.com/docs/reference/cli/supabase-db-push)
- [Supabase CLI v3 migration notes](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3)
- [Current project state](CURRENT_STATE.md) · [execution blueprint](../plans/ORBIT_POST_2_4_EXECUTION.md)
