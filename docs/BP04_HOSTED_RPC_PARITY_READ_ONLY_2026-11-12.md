# ORBIT W1 — BP-04 live RPC and revision-contract parity (read only)

**Evidence date:** 12 November 2026 UTC. **Status:** partial catalog/object parity verified; no hosted changes performed. This is evidence for the single [master BP roadmap](../plans/ORBIT_POST_2_4_EXECUTION.md), **not permission to deploy** the [conditional revision-only RPC RFC](BP03_CONDITIONAL_OWNER_SNAPSHOT_RFC_2026-11-12.md).

## Scope and method

Read-only queries against the existing ORBIT Supabase project `ixfgavgtwuzdgucjriec` via the connected Supabase SQL interface. No private owner records, user identities, application rows, credentials, OAuth sessions, Storage objects, DDL or DML were read or changed. Source comparison used immutable migration `supabase/migrations/20261108185344_orbit_private_extensions.sql` from the then-current `main` and `pg_get_functiondef(oid)` for only the two owner snapshot functions. Compared extracted PL/pgSQL bodies after collapsing whitespace; a changed expression or clause fails this comparison. The comparison **is not** a byte-level comparison of the complete `CREATE FUNCTION` definition, permissions, optimizer plan or PostgreSQL execution proof. Separate catalog checks cover security attributes and grants.

## Reproduced findings

| Check | Observed result | Interpretation |
| --- | --- | --- |
| Applied migration ledger | Exactly 7 version/name pairs: 20261101153811 initial_schema, 20261101154355 owner_snapshots_publication, 20261102054113 business_conflict_http_status, 20261106142540 private_table_least_privilege, 20261108161935 tenant_private_workspaces, 20261108185344 private_extensions, 20261108185405 private_media | Matches repository's seven ordered migration filenames; does not prove execution of a fresh replay |
| `public.load_owner_snapshot()` | Hosted body 2,271 chars, local final body 2,271; whitespace-normalized comparison equal | Current owner read projection includes the latest private extension source and matches the reviewed local function body |
| `public.save_owner_snapshot(jsonb,bigint)` | Hosted body 6,150 chars, local final body 6,150; whitespace-normalized comparison equal | Current write/CAS body matches the reviewed local function body, including PT409 conflicts and legacy extension retention |
| Function execution mode | Both `prosecdef=false`, `proconfig` empty search_path | SECURITY INVOKER and explicit empty search path remain |
| Function EXECUTE privileges | `anon=false`, `authenticated=true` for both; ACL entries `postgres`, `authenticated`, `service_role`, no PUBLIC/anon entry | Expected role boundary currently holds; no anonymous EXECUTE grant detected |
| Revision triggers | 14 / 14 enabled `tgenabled='O'`: exactly `orbit_revision_lock` BEFORE and `orbit_revision` AFTER for each of profiles, branches, tasks, journal_entries, milestones, widget_layouts, preferences | Trigger coverage of all seven snapshot-backed tables exists, as required for conditional read correctness |
| RLS for those seven tables | `relrowsecurity=true` on every one | Source-compatible row-level isolation is enabled |
| Policies | 36 catalog policies across seven snapshot-backed tables plus `private.workspace_revisions`: 5 per public table (four owner CRUD + restrictive tenant predicate), 1 owner-scoped revision policy | Visible owner-scoped predicates follow `auth.uid()`; this does not substitute for live second-account authorization tests |

## Reproduce without private data

The following read-only catalog queries are sufficient, scoped only to structure:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef, p.proconfig, p.proacl,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       pg_get_functiondef(p.oid) as ddl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('load_owner_snapshot','save_owner_snapshot')
order by p.proname;

select c.relname, c.relrowsecurity, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences')
  and t.tgname in ('orbit_revision_lock','orbit_revision') and not t.tgisinternal
order by c.relname,t.tgname;

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where (schemaname='private' and tablename='workspace_revisions')
   or (schemaname='public' and tablename in
      ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences'))
order by schemaname,tablename,policyname;
```

## Remaining acceptance / blockers

1. These catalog checks **do not prove** RLS A/B user-session enforcement, function concurrency/MVCC isolation under hostile concurrent writers, actual HTTP permission responses, or signed-in two-device CAS correctness. Run disposable local concurrent tests and separately owner-authorized real-account QA before rollout.
2. Current hosted function bodies match the source's **full snapshot** RPC only. No conditional/revision-only RPC has been installed, activated, or authorized. Existing polling still returns full JSON on unchanged revision, even though PR #101 avoids redundant client normalization.
3. Complete parity across unrelated private/public tables, Storage policies, grants, enum/check constraints, trigger bodies and provenance of migration execution remains separately reviewable. Do not use this partial audit to waive those gates.
4. No production deployment, domain alias, Auth/RLS/Storage change, deletion or paid service action was performed.

**Rollback:** documentation-only revert; no database rollback applicable. Future conditional-RPC deployment requires its own explicit owner approval, migration backup, staged contract tests, feature gate and rollback.
