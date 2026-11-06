# M3 private-table grants correction — local only

The owner reports a live read-only audit found direct `TRUNCATE`, `TRIGGER` and
`REFERENCES` grants to `authenticated` on all seven private workspace tables.
PR #3's comment could not be retrieved here (GitHub GraphQL Forbidden); the owner's
explicit report is the confirmed scope, not a newly performed live audit.

## Finding and smallest correction

The initial migration grants CRUD without first removing Supabase's pre-existing
`ALL` privileges for `authenticated`. Adding CRUD does not remove other grants.
Our local bootstrap reproduces that default. RLS cannot constrain TRUNCATE;
TRIGGER/REFERENCES are also unnecessary structural privileges. The finding is a
release gate even though no arbitrary-SQL/TRUNCATE API endpoint is exposed by ORBIT.
Do not run a hosted TRUNCATE probe to demonstrate it.

`20261106120000_orbit_private_table_least_privilege.sql` revokes exactly these
three privileges on `profiles`, `branches`, `tasks`, `journal_entries`, `milestones`,
`widget_layouts`, `preferences` from `authenticated`, in a transaction. It does not
change CRUD grants, existing triggers/FKs/RLS/functions, defaults for future tables,
other tables/roles, workspace data or owner configuration. Existing triggers/FKs
continue to execute without the caller holding trigger-creation/reference privileges.

The migration checks effective privileges (including column REFERENCES) and retained
CRUD before commit. If PUBLIC/inherited rights or missing CRUD prevent the expected
result, it aborts atomically; review that deployment drift instead of automatically
revoking unrelated roles. Reapplication is safe. Applied historical migrations remain
byte-identical. This file has **not** been applied to hosted Supabase.

## Local evidence

`python tests/db/run_local.py` exercises all migrations on a disposable PostgreSQL
15.14 database: 14 structural + 133 isolation/snapshot/publication + 58 privilege
assertions, actual permission-denied TRUNCATE/TRIGGER/REFERENCES operations, three
concurrency scenarios, reapplication and rollback on inherited/column grant drift.
The new suite failed before the migration and passes afterward.

The same harness executes the generated seven-row fixture seed/cleanup SQL locally:
refuses pre-existing data, missing baseline and changed full-row hashes; atomically
cleans only unchanged recorded fixtures, verifies zero residual rows, and preserves
an owner sentinel and the nonowner Auth account. These are local synthetic results,
not hosted mutation authorization or evidence.

## Consequential live actions still required

1. Authorized operator confirms project `ixfgavgtwuzdgucjriec` and records read-only
   preflight using `supabase/verification/m3_private_grants_read_only.sql`.
2. Separately authorize/apply **only** this reviewed migration through the project's
   migration workflow. Do not run a bulk push of historical migrations or restore
   owner data. Set operational lock/statement timeouts appropriate to that channel;
   pause/review rather than waiting indefinitely for table locks.
3. Run the same read-only postflight: CRUD/RLS/RPC execute remain true; TRUNCATE,
   TRIGGER and table/column REFERENCES false; expected owner/public gate unchanged.
   A failure requires review, not broadening privileges. No automatic down migration
   re-grants unsafe privileges; application code rollback leaves this correction.
4. Execute only the separately approved disposable nonowner fixture plan and retain
   per-operation denial/baseline/cleanup evidence. No owner writes or test-user deletion.

The operator must approve any live grants change; this commit is review material only.
