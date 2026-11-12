import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const path=join(root,'supabase/tests/fixtures/bp03_conditional_owner_rpc.sql.inc');
const latest=readFileSync(join(root,'supabase/migrations/20261108185344_orbit_private_extensions.sql'),'utf8');
const normalize=s=>s.replace(/\s+/g,' ').trim();

test('BP-04 proposed conditional SQL is present only in an un-applied local-test fixture',()=>{
  assert.ok(existsSync(path),'Missing source-only proposed RPC fixture; deliberately not in migration path');
  assert.equal(readdirSync(join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).length,7);
  for(const name of readdirSync(join(root,'supabase/migrations')))
    assert.doesNotMatch(name,/conditional|if_changed/i,'Migration replay must never install proposal');
});

test('BP-04 function has strict invoker, owner, ACL and revision parameter boundaries',()=>{
  const sql=readFileSync(path,'utf8');
  assert.match(sql,/create or replace function public\.load_owner_snapshot_if_changed\(p_known_revision bigint\)\s+returns jsonb\s+language plpgsql stable security invoker\s+set search_path\s*=\s*''/i);
  assert.match(sql,/owner_uuid uuid\s*:=\s*auth\.uid\(\)/i);
  assert.match(sql,/if owner_uuid is null then raise exception using errcode='42501'/i);
  assert.match(sql,/p_known_revision is null or p_known_revision<0/i);
  assert.match(sql,/case when current\.revision=p_known_revision\s+then jsonb_build_object\('revision',current\.revision,'unchanged',true\)/i);
  assert.match(sql,/from \(select coalesce\(\(select revision from private\.workspace_revisions where owner_id=owner_uuid\),0\) as revision\) as current/i);
  assert.match(sql,/revoke all on function public\.load_owner_snapshot_if_changed\(bigint\) from public,anon;/i);
  assert.match(sql,/grant execute on function public\.load_owner_snapshot_if_changed\(bigint\) to authenticated;/i);
  assert.doesNotMatch(sql,/security definer|service_role|p_owner_id|drop table|alter table/i);
});

test('BP-04 proposed changed projection mirrors latest complete owner snapshot including private extensions',()=>{
  const sql=readFileSync(path,'utf8');
  const original=latest.match(/'snapshot',jsonb_build_object\(([\s\S]*?)\n    \)\) into result;/);
  const candidate=sql.match(/'snapshot',jsonb_build_object\(([\s\S]*?)\n    \)\) end into result/);
  assert.ok(original&&candidate,'Projection anchors must allow an exact comparison against latest migration');
  assert.equal(normalize(candidate[1]),normalize(original[1]),
    'Changed path must not omit or alter any branch/task/journal/milestone/layout/preference/extension/profile fields');
  assert.match(candidate[1],/'extensions',coalesce\(\(select extensions from public\.preferences where owner_id=owner_uuid\)/);
});

test('BP-04 SQL proposal only reads private owner tables and cannot create a hosted executable migration',()=>{
  const sql=readFileSync(path,'utf8');
  assert.doesNotMatch(sql,/\b(insert|update|delete|truncate|grant all|create policy|drop policy)\b/i);
  assert.match(sql,/DO NOT COPY INTO supabase\/migrations/i);
});
