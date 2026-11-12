/**
 * BP-04 local source-contract guardrails for the proposed revision-only RPC.
 * These tests intentionally do not assert hosted parity or mutate SQL.
 * They catch accidental edits that would make conditional revision transport unsafe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const revisions=migration('20261101154355_orbit_owner_snapshots_publication.sql');
const tenant=migration('20261108161935_orbit_tenant_private_workspaces.sql');
const extension=migration('20261108185344_orbit_private_extensions.sql');
const tables=['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences'];

export function auditRevisionTriggerContract(sql){
  const declaration=/foreach\s+table_name\s+in\s+array\s+array\[([^\]]+)\]/i.exec(sql);
  if(!declaration)throw Error('Revision-covered tables list missing');
  const names=[...declaration[1].matchAll(/'([a-z_]+)'/g)].map(match=>match[1]);
  assert.deepEqual(names,tables,'Every snapshot-backed table needs revision triggers');
  assert.match(sql,/create trigger orbit_revision_lock before insert or update or delete on public\.%I for each statement execute function private\.lock_workspace_revision\(\)/i);
  assert.match(sql,/create trigger orbit_revision after insert or update or delete on public\.%I for each statement execute function private\.bump_workspace_revision\(\)/i);
}
export function auditOwnerRpcContract(sql,{extensions=false}={}){
  for(const name of ['load_owner_snapshot','save_owner_snapshot']){
    const definition=new RegExp('create or replace function public\\.'+name+'\\([^)]*\\)[\\s\\S]*?security invoker[\\s\\S]*?set search_path = \'\'','i');
    assert.match(sql,definition,name+' must remain invoker-scoped with empty search_path');
  }
  assert.match(sql,/owner_uuid uuid:=auth\.uid\(\)/i);
  assert.match(sql,/if owner_uuid is null then raise exception/i);
  assert.match(sql,/from private\.workspace_revisions where owner_id=owner_uuid for update/i,'CAS write must acquire owner revision lock');
  assert.match(sql,/if current_revision<>p_expected_revision then raise exception using errcode='PT409'/i,'Stale writers must get an explicit conflict');
  assert.match(sql,/from private\.workspace_revisions where owner_id=owner_uuid\),0\)/i,'Read must be owner-filtered');
  for(const table of ['branches','tasks','journal_entries','milestones','widget_layouts','preferences']){
    assert.match(sql,new RegExp('from public\\.'+table+' where owner_id=owner_uuid','i'),table+' snapshot projection must be tenant-scoped');
  }
  assert.match(sql,/select jsonb_build_object\('revision',[\s\S]*?'snapshot',jsonb_build_object\(/i,'Revision and projection must use the same SELECT');
  assert.match(sql,/\)\) into result;\s*return result;/i,'Read projection must remain one SQL statement');
  if(extensions){
    assert.match(sql,/'extensions',coalesce\(\(select extensions from public\.preferences where owner_id=owner_uuid\),'\{\}'::jsonb\)/i);
    assert.match(sql,/extensions=case when p_snapshot \? 'extensions'[\s\S]*?else public\.preferences\.extensions end/i,'Old clients must not erase private notes');
    assert.match(sql,/octet_length\(\(p_snapshot->'extensions'\)::text\)>900000/i,'Extension size limit must remain');
  }
}

test('BP-04: every local workspace table has a before-lock and after-bump revision trigger',()=>{
  auditRevisionTriggerContract(revisions);
});
test('BP-04: owner-scoped tenant RPC keeps lock, CAS, and single-statement snapshot semantics',()=>{
  auditOwnerRpcContract(tenant);
});
test('BP-04: final extension-aware RPC preserves tenant isolation and legacy extension safety',()=>{
  auditOwnerRpcContract(extension,{extensions:true});
});
test('BP-04: removed revision trigger is detected before a conditional-read rollout',()=>{
  assert.throws(()=>auditRevisionTriggerContract(revisions.replace('create trigger orbit_revision after','create trigger orbit_revision_disabled after')),/orbit_revision/i);
});
test('BP-04: owner-filter bypass or missing CAS is rejected',()=>{
  assert.throws(()=>auditOwnerRpcContract(tenant.replace('from public.tasks where owner_id=owner_uuid','from public.tasks')),/tasks snapshot projection/i);
  assert.throws(()=>auditOwnerRpcContract(tenant.replace('current_revision<>p_expected_revision','false')),/Stale writers/i);
});
test('BP-04: legacy private extensions cannot be silently discarded',()=>{
  assert.throws(()=>auditOwnerRpcContract(extension.replace('else public.preferences.extensions end','else excluded.extensions end'),{extensions:true}),/Old clients/i);
});
