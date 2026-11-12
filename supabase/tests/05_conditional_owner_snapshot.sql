-- BP-03/BP-04 disposable-only SQL tests. pg_prove mounts supabase/tests.
-- Include the draft in this rolled-back transaction; it is NOT a migration.
begin;
set local search_path=public,extensions;
\ir fixtures/bp03_conditional_owner_rpc.sql.inc
select no_plan();

select ok(has_function_privilege('authenticated','public.load_owner_snapshot_if_changed(bigint)','EXECUTE'),
  'authenticated role may invoke the new owner RPC');
select ok(not has_function_privilege('anon','public.load_owner_snapshot_if_changed(bigint)','EXECUTE'),
  'anonymous role has no EXECUTE');
select ok(not (select p.prosecdef from pg_proc p where p.oid='public.load_owner_snapshot_if_changed(bigint)'::regprocedure),
  'conditional RPC is not SECURITY DEFINER');
select is((select p.provolatile from pg_proc p where p.oid='public.load_owner_snapshot_if_changed(bigint)'::regprocedure),
  's','read-only RPC is STABLE for one calling-query MVCC snapshot');
select is((select p.proconfig from pg_proc p where p.oid='public.load_owner_snapshot_if_changed(bigint)'::regprocedure),
  array['search_path=']::text[],'conditional RPC uses empty search_path');

insert into auth.users(id,email) values
 ('cccccccc-1111-4111-8111-111111111111','conditional-owner-a@example.invalid'),
 ('dddddddd-2222-4222-8222-222222222222','conditional-owner-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-1111-4111-8111-111111111111',true);
select is(public.load_owner_snapshot_if_changed(0),
 '{"revision":0,"unchanged":true}'::jsonb,'empty owner A revision 0 is minimal');
select throws_ok($$select public.load_owner_snapshot_if_changed(null)$$,'22023',null,
  'null known revision is rejected');
select throws_ok($$select public.load_owner_snapshot_if_changed(-1)$$,'22023',null,
  'negative known revision is rejected');

insert into public.branches(owner_id,id,label)
  values(auth.uid(),'inbox','A synthetic inbox');
insert into public.tasks(owner_id,id,project_id,title)
  values(auth.uid(),'shared-task','inbox','A PRIVATE synthetic title');
insert into public.journal_entries(owner_id,id,entry_date,title,body_html)
  values(auth.uid(),'shared-journal','2026-11-12','A PRIVATE journal','<p>A PRIVATE body</p>');
insert into public.preferences(owner_id,extensions)
  values(auth.uid(),'{"testMarker":"A PRIVATE extension"}'::jsonb);
create temporary table conditional_a_rev as
  select (public.load_owner_snapshot()->>'revision')::bigint as revision;
select ok((select revision from conditional_a_rev)>0,'A data changes bumped its revision');
select is(public.load_owner_snapshot_if_changed((select revision from conditional_a_rev)),
  jsonb_build_object('revision',(select revision from conditional_a_rev),'unchanged',true),
  'equal changed revision returns only two safe keys');
select is(public.load_owner_snapshot_if_changed(0),public.load_owner_snapshot(),
  'stale known revision returns complete canonical owner snapshot (including private fields)');
select is(public.load_owner_snapshot_if_changed(0)->'snapshot'->'extensions'->>'testMarker',
  'A PRIVATE extension','changed response preserves private extensions');
select is(public.load_owner_snapshot_if_changed(0)->'snapshot'->'journalEntries'->0->>'title',
  'A PRIVATE journal','changed response preserves private journals');
select throws_ok($$select public.save_owner_snapshot(public.load_owner_snapshot()->'snapshot',0)$$,
  'PT409',null,'original save RPC still rejects stale revision-CAS writes');

select set_config('request.jwt.claim.sub','dddddddd-2222-4222-8222-222222222222',true);
select is(public.load_owner_snapshot_if_changed(0),'{"revision":0,"unchanged":true}'::jsonb,
  'new owner B cannot see owner A revision');
select ok(public.load_owner_snapshot_if_changed((select revision from conditional_a_rev))->'snapshot'->'tasks'='[]'::jsonb,
  'B stale/future revision sees only B empty tasks, never A');
select ok(public.load_owner_snapshot_if_changed((select revision from conditional_a_rev))->'snapshot'->'extensions'='{}'::jsonb,
  'B cannot read A private extension metadata');
insert into public.branches(owner_id,id,label) values(auth.uid(),'inbox','B synthetic inbox');
insert into public.tasks(owner_id,id,project_id,title)
  values(auth.uid(),'shared-task','inbox','B PRIVATE synthetic title');
select is(public.load_owner_snapshot_if_changed(0)->'snapshot'->'tasks'->0->>'title',
 'B PRIVATE synthetic title','same-ID tasks remain tenant-isolated');
select ok((public.load_owner_snapshot_if_changed(0))::text not like '%A PRIVATE%',
  'B results do not contain A private strings');

select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select public.load_owner_snapshot_if_changed(0)$$,'42501',null,
  'authenticated role with no auth.uid must fail closed');
set local role anon;
select throws_ok($$select public.load_owner_snapshot_if_changed(0)$$,'42501',null,
  'anonymous role cannot execute the draft RPC');
reset role;
select * from finish();
rollback;
