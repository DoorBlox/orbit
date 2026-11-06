# Disposable local SQL verification

`python tests/db/run_local.py` runs all ordered migrations, the structural pgTAP suite,
133 owner-isolation/publication/rollback assertions, and three real two-session
concurrency scenarios. It fails on pgTAP `not ok` output as well as SQL errors.
Concurrency tests observe the lock holder in `pg_stat_activity` before starting
its competitor. The dedicated `orbit_m2_tests` database is dropped in `finally`.
No hosted database URL, linked project, OAuth credential or Supabase key is used.

Prerequisites: the **local** Docker container `orbit-m2-local-postgres`, PostgreSQL
15 or later, and the pgTAP extension. The validated fallback used the official
`postgres:15.14-bookworm` image with digest
`sha256:496f07cd16dff6406cee521a66b37080be917ea063f017336affdfcb1c61f90e`
and Debian package `postgresql-15-pgtap` version `1.2.0-3`. This image is only a
throwaway SQL test runtime, not the production deployment recommendation.
Bind its port to `127.0.0.1:55432:5432`, keep no persistent volume, and use only
synthetic data. The test container uses local trust authentication; never reuse
that configuration for a hosted or network-accessible database.

On this managed environment, read cloud-runtime Docker guidance before startup;
use the local socket explicitly and retain the platform proxy/CA configuration.
The container's optional `apt.postgresql.org` source was blocked. Disabling only
`/etc/apt/sources.list.d/pgdg.list` **inside this disposable container** allowed
installing pgTAP from the already allowed official Debian mirror. No host package
source, network policy, TLS verification or production runtime was modified.

The bootstrap creates minimal `auth.users`, `anon`/`authenticated` roles and an
`auth.uid()` JWT-claim adapter. This validates PostgreSQL grants, RLS, triggers,
transaction rollback and concurrency; it does **not** validate Supabase Auth,
Google OAuth, JWT signature verification, PostgREST or hosted project settings.
The full local Supabase image could not start because its VFS layer extraction
exhausted Docker storage. Do not label these SQL tests a full Supabase-stack pass.

The appended migration was created with exact Supabase CLI `2.122.0` via
`supabase migration new orbit_owner_snapshots_publication`. Its generated timestamp
`20261101103110` preceded the immutable draft's future timestamp; the lead approved
changing only the generated filename to `20261101140001` for chronological order.
The initial migration bytes remain unchanged.

Optional local security advisors:

```sh
npx --yes supabase@2.122.0 db advisors \
  --db-url postgresql://postgres@127.0.0.1:55432/orbit_m2_tests \
  --type security --fail-on error
```

Run only while the dedicated disposable database exists. The test harness normally
cleans it up. Treat advisor output separately from execution of the SQL tests.
After testing, remove only the task-owned container with
`docker --host=unix:///var/run/docker.sock rm --force orbit-m2-local-postgres`.

Business conflict integration fix: the additive CLI-generated migration
`20261102053522_orbit_business_conflict_http_status.sql` changes only deterministic
snapshot/title conflicts to PostgREST `PT409` (HTTP 409). PostgREST 14 retries
`40001` indefinitely for an unchanged stale revision. Applied migrations are
unchanged; real database serialization failures retain their normal semantics.
The SQL suite expects `PT409`; the concurrent-session harness still verifies
conflict behavior by the unchanged diagnostic message. Real HTTP integration is
verified separately in `tests/integration/`.

## M3 least-privilege follow-up

The runner now also applies `20261106120000_orbit_private_table_least_privilege.sql`
locally, runs the read-only verification SQL and 58 privilege assertions, checks
reapplication/atomic rollback on inherited table/column privileges, and executes
baseline-guarded generated fixture cleanup with synthetic owner-data preservation.
Together with the existing 14 + 133 assertions, this is 205 pgTAP assertions plus
three real concurrency scenarios and the procedural guard/cleanup regressions.
Hosted mutation/grant changes remain unauthorized by this local test command.
