"""Run real SQL/RLS/CAS tests ONLY in the named disposable local Docker database.

Prerequisites: local container orbit-m2-local-postgres, PostgreSQL >=15 and pgTAP.
No Supabase/hosted credentials, network API or project linkage are used. This
checks SQL semantics with an auth.uid() claim adapter, not OAuth/PostgREST.
"""
from pathlib import Path
import os
import json
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'orbit-m2-local-postgres'
DATABASE = 'orbit_m2_tests'
ENV = {key: value for key, value in os.environ.items() if key not in {
    'DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'}}
DOCKER = ['docker', '--host=unix:///var/run/docker.sock', 'exec', '-i', CONTAINER]
PSQL = DOCKER + ['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres']
OWNER = '11111111-1111-4111-8111-111111111111'
CLAIM = f"set role authenticated; select set_config('request.jwt.claim.sub','{OWNER}',false);"


def sql(statement, database=DATABASE, check=True):
    return subprocess.run(PSQL + ['-d', database], input=statement, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=ENV, check=check)



def wait_for_sleep(application_name):
    # Observe the server-side lock holder before starting its competitor. Timing
    # guesses can pass without ever exercising a real concurrency window.
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        state = sql("select count(*) from pg_stat_activity where application_name='" +
                    application_name + "' and wait_event='PgSleep';").stdout.strip()
        if state == '1':
            return
        time.sleep(.05)
    raise AssertionError('concurrency holder never reached pg_sleep: ' + application_name)


def test_files():
    sql(f'DROP DATABASE IF EXISTS {DATABASE} WITH (FORCE); CREATE DATABASE {DATABASE};', 'postgres')
    sql((ROOT / 'tests/db/bootstrap.sql').read_text())
    for migration in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
        sql(migration.read_text())
        print(f'PASS migration {migration.name}', flush=True)
    sql((ROOT/'supabase/verification/m3_private_grants_read_only.sql').read_text())
    print('PASS read-only grant/RLS/RPC preflight SQL syntax',flush=True)
    for test in sorted((ROOT / 'supabase/tests').glob('*.sql')):
        result = sql('set search_path=public,extensions;\n' + test.read_text())
        print(result.stdout, end='', flush=True)
        if re.search(r'^not ok\b', result.stdout, flags=re.M) or re.search(r'^# Looks like', result.stdout, flags=re.M):
            raise AssertionError(f'pgTAP failure: {test.name}')
        print(f'PASS pgTAP {test.name}', flush=True)


def least_privilege_guards():
    migration=(ROOT/'supabase/migrations/20261106120000_orbit_private_table_least_privilege.sql').read_text()
    sql(migration)  # harmless reapplication
    for grant,undo in [
        ('grant truncate on public.tasks to public;', 'revoke truncate on public.tasks from public;'),
        ('grant references(id) on public.tasks to public;', 'revoke references(id) on public.tasks from public;'),
    ]:
        sql('grant truncate on public.tasks to authenticated;'+grant)
        result=sql(migration,check=False)
        assert result.returncode!=0 and 'postcheck failed' in result.stdout, grant+result.stdout
        assert sql("select has_table_privilege('authenticated','public.tasks','TRUNCATE');").stdout.strip()=='t', 'failed migration did not roll back revocation'
        sql(undo+'revoke truncate on public.tasks from authenticated;')
    print('PASS migration idempotence and atomic rollback for inherited/column privilege drift',flush=True)


def fixture_cleanup_test():
    uid='22222222-2222-4222-8222-222222222222'
    plan=json.loads(subprocess.check_output(['node','scripts/hosted-write-plan.mjs',uid],cwd=ROOT,env=ENV,text=True))
    admin=plan['administrator']
    sql(f"insert into auth.users values('{OWNER}','owner-fixture@example.invalid'),('{uid}','nonowner-fixture@example.invalid');"
        f"update private.orbit_configuration set owner_id='{OWNER}';"
        f"insert into public.journal_entries(owner_id,id,entry_date,title) values('{OWNER}','owner-preservation','2026-11-06','Synthetic owner sentinel');")
    def count():
        return sql('select '+ ' + '.join(f"(select count(*) from public.{f['table']} where {'user_id' if f['table']=='profiles' else 'owner_id'}='{uid}')" for f in plan['fixtures'])+';').stdout.strip()
    def baseline():
        rows=sql(admin['baselineSql']).stdout.strip().splitlines()
        assert len(rows)==7
        assert all(r.split('|')[1]=='1' for r in rows)
        return {r.split('|')[0]:r.split('|')[2] for r in rows}
    def cleanup(hashes):
        return sql("select set_config('orbit_m3.fixture_baselines','"+json.dumps(hashes)+"',false);"+admin['cleanupSql'],check=False)
    sql(admin['seedSql']);assert count()=='7'
    rejected_seed=sql(admin['seedSql'],check=False)
    assert rejected_seed.returncode!=0 and count()=='7','seed must refuse existing data'
    hashes=baseline()
    assert cleanup({}).returncode!=0 and count()=='7','cleanup must require baseline'
    sql(f"update public.tasks set title='Changed synthetic fixture' where owner_id='{uid}';")
    assert cleanup(hashes).returncode!=0 and count()=='7','changed baseline must atomically refuse cleanup'
    # Only local synthetic test deliberately changed data. Rebaseline it after
    # asserting refusal; hosted operators must stop and review unexpected drift.
    assert cleanup(baseline()).returncode==0 and count()=='0'
    assert sql("select count(*) from public.journal_entries where id='owner-preservation';").stdout.strip()=='1'
    assert sql(f"select count(*) from auth.users where id='{uid}';").stdout.strip()=='1'
    sql(f"delete from public.journal_entries where owner_id='{OWNER}';update private.orbit_configuration set owner_id=null;delete from auth.users where id in ('{OWNER}','{uid}');")
    print('PASS generated fixture seed/cleanup, absent/drift baseline refusal, zero remaining fixture rows, owner sentinel and Auth user preserved',flush=True)


def concurrent_test():
    sql(f"insert into auth.users values('{OWNER}','orbit-concurrency@example.invalid');"
        f"update private.orbit_configuration set owner_id='{OWNER}';")
    snapshot = """'{"branches":[],"tasks":[],"journalEntries":[],"milestones":[],"spatialLayout":{},"preferences":{"colorMode":"deadline"}}'::jsonb"""
    # Session A holds the revision lock after saving. Session B must observe
    # the committed newer revision and fail, rather than overwrite A silently.
    first = subprocess.Popen(PSQL + ['-d', DATABASE], stdin=subprocess.PIPE,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=ENV)
    first.stdin.write("set application_name='orbit_m2_cas_a';" + CLAIM + f'begin; select public.save_owner_snapshot({snapshot},0); select pg_sleep(2); commit;')
    first.stdin.close()
    wait_for_sleep('orbit_m2_cas_a')
    second = sql(CLAIM + f'select public.save_owner_snapshot({snapshot},0);', check=False)
    first_output = first.stdout.read()
    first.wait(timeout=10)
    if first.returncode != 0 or second.returncode == 0 or 'Snapshot conflict' not in second.stdout:
        raise AssertionError(f'concurrent CAS failed: A={first.returncode}, B={second.returncode}\n{first_output}\n{second.stdout}')
    print('PASS two-session CAS: one commit, one Snapshot conflict; no silent overwrite', flush=True)
    # Start a direct table write transaction, which takes the same revision
    # lock BEFORE row locks. Snapshot save waits then reports stale revision.
    revision = sql(CLAIM + "select (public.load_owner_snapshot()->>'revision')::bigint;").stdout.splitlines()[-1]
    direct = subprocess.Popen(PSQL + ['-d', DATABASE], stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=ENV)
    direct.stdin.write("set application_name='orbit_m2_direct_a';" + CLAIM + "begin; update public.preferences set color_mode='urgency'; select pg_sleep(2); commit;")
    direct.stdin.close()
    wait_for_sleep('orbit_m2_direct_a')
    snapshot_write = sql(CLAIM + f'select public.save_owner_snapshot({snapshot},{revision});', check=False)
    direct_output = direct.stdout.read()
    direct.wait(timeout=10)
    if direct.returncode != 0 or snapshot_write.returncode == 0 or 'Snapshot conflict' not in snapshot_write.stdout:
        raise AssertionError(f'direct-DML CAS failed: A={direct.returncode}, B={snapshot_write.returncode}\n{direct_output}\n{snapshot_write.stdout}')
    mode = sql(CLAIM + "select color_mode from public.preferences;").stdout.splitlines()[-1]
    assert mode == 'urgency', 'committed direct update lost'
    print('PASS direct-DML versus CAS: direct update retained, snapshot conflict, no lock inversion', flush=True)
    sql(CLAIM + "insert into public.journal_entries(owner_id,id,entry_date,title) values(auth.uid(),'publication-race','2026-11-01','Approved race fixture');")
    publisher = subprocess.Popen(PSQL + ['-d', DATABASE], stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=ENV)
    publisher.stdin.write("set application_name='orbit_m2_publish_a';" + CLAIM + "begin; select public.publish_content('journal','publication-race','Approved race fixture','Explicit race excerpt',null); select pg_sleep(2); commit;")
    publisher.stdin.close()
    wait_for_sleep('orbit_m2_publish_a')
    deletion = sql(CLAIM + "delete from public.journal_entries where id='publication-race';", check=False)
    publisher_output = publisher.stdout.read()
    publisher.wait(timeout=10)
    if publisher.returncode != 0 or deletion.returncode != 0:
        raise AssertionError(f'publication/delete failed: A={publisher.returncode}, B={deletion.returncode}\n{publisher_output}\n{deletion.stdout}')
    remaining = sql(CLAIM + "select count(*) from public.published_content;").stdout.splitlines()[-1]
    assert remaining == '0', 'concurrent source deletion left an orphan public projection'
    print('PASS publication versus source deletion: serialized, no orphan public projection', flush=True)



def main():
    try:
        test_files()
        least_privilege_guards()
        fixture_cleanup_test()
        concurrent_test()
        print('PASS local PostgreSQL SQL/RLS/atomicity/concurrency checks; hosted/OAuth/PostgREST NOT tested')
    except subprocess.CalledProcessError as error:
        print(error.stdout, file=sys.stderr)
        raise
    finally:
        # The dedicated test database contains only synthetic fixtures. Clear it
        # even when assertions fail, leaving no owner or public gate configured.
        sql(f'DROP DATABASE IF EXISTS {DATABASE} WITH (FORCE);', 'postgres', check=False)


if __name__ == '__main__':
    main()
