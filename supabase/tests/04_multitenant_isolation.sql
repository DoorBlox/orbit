-- ORBIT 2.0 disposable pgTAP: three-user private-workspace isolation.
-- Runs ONLY on local Supabase and rolls back every synthetic identity/row.
begin;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','orbit-a@example.invalid'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','orbit-b@example.invalid'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','orbit-c@example.invalid');
update private.orbit_configuration set owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select ok(public.orbit_workspace_access(),'A has verified workspace access');
select ok(public.orbit_owner_access(),'A retains separate original-owner publishing authority');
select lives_ok($$insert into public.branches(owner_id,id,label) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','inbox','A private inbox')$$,'A creates an inbox');
select lives_ok($$insert into public.tasks(owner_id,id,project_id,title) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','shared-task','inbox','A private task')$$,'A creates a task');
select lives_ok($$insert into public.journal_entries(owner_id,id,entry_date,title) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','shared-journal','2026-11-08','A private journal')$$,'A creates a journal');
select is((public.load_owner_snapshot()->'snapshot'->'tasks'->0->>'title'),'A private task','A load snapshot gets own task');
select lives_ok($insert into public.preferences(owner_id,extensions) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"testMarker":"tenant-a"}'::jsonb)$,
  'A can save private extension metadata');
select is((public.load_owner_snapshot()->'snapshot'->'extensions'->>'testMarker'),
  'tenant-a','A loads only own extension metadata');

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select ok(public.orbit_workspace_access(),'B has verified workspace access');
select ok(not public.orbit_owner_access(),'B cannot publish via original-owner authority');
select is((select count(*) from public.tasks),0::bigint,'B cannot view A task');
select is((select count(*) from public.journal_entries),0::bigint,'B cannot view A journal');
select is((public.load_owner_snapshot()->>'revision')::bigint,0::bigint,'B begins at revision zero');
select is((public.load_owner_snapshot()->'snapshot'->'extensions')::text,'{}','B cannot read A private extension metadata');
select lives_ok($$insert into public.branches(owner_id,id,label) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','inbox','B private inbox')$$,'B creates same-ID inbox');
select lives_ok($$insert into public.tasks(owner_id,id,project_id,title) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','shared-task','inbox','B private task')$$,'B creates same-ID task');
select lives_ok($$insert into public.journal_entries(owner_id,id,entry_date,title) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','shared-journal','2026-11-08','B private journal')$$,'B creates same-ID journal');
select is((select count(*) from public.tasks),1::bigint,'B sees only one B task');
select is((public.load_owner_snapshot()->'snapshot'->'journalEntries'->0->>'title'),'B private journal','B load snapshot gets only B journal');
with changed as(update public.tasks set title='B attempted modification' where owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning *)
 select is((select count(*) from changed),0::bigint,'B cannot update A task');
with changed as(delete from public.journal_entries where owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning *)
 select is((select count(*) from changed),0::bigint,'B cannot delete A journal');
select throws_ok($$insert into public.tasks(owner_id,id,project_id,title) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','forged','inbox','Forged')$$,'42501',null,'B cannot forge A owner_id');
select throws_ok($$select public.publish_content('task','shared-task','A private task','bad',null)$$,'42501',null,'B cannot publish A source');
select ok((public.load_owner_snapshot()->>'revision')::bigint>0,'B direct DML increments B revision');

select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select ok(public.orbit_workspace_access(),'C has verified workspace access');
select ok(not public.orbit_owner_access(),'C cannot publish');
select is((select count(*) from public.branches),0::bigint,'C cannot see A/B branches');
select is((select count(*) from public.tasks),0::bigint,'C cannot see A/B tasks');
select is((select count(*) from public.journal_entries),0::bigint,'C cannot see A/B journals');
select is((public.load_owner_snapshot()->>'revision')::bigint,0::bigint,'C revision begins empty');
select lives_ok($$insert into public.profiles(user_id,display_name) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','C private profile')$$,'C creates own profile');
select is((public.load_owner_snapshot()->'snapshot'->'profile'->>'displayName'),'C private profile','C snapshot contains own display name');

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select is((select count(*) from public.tasks),1::bigint,'A still sees exactly own task');
select is((select title from public.tasks where id='shared-task'),'A private task','B cannot alter A title');
select is((select title from public.journal_entries where id='shared-journal'),'A private journal','B cannot delete A journal');
select is((select count(*) from public.profiles),0::bigint,'A cannot see C private profile');
select is((public.load_owner_snapshot()->'snapshot'->'extensions'->>'testMarker'),
  'tenant-a','A notes survive B and C activity');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select public.load_owner_snapshot()$$,'42501',null,'anonymous cannot call snapshot');
select throws_ok($$select public.orbit_workspace_access()$$,'42501',null,'anonymous cannot call workspace RPC');
select throws_ok($$select * from public.journal_entries$$,'42501',null,'anonymous cannot read journals');
reset role;
select * from finish();
rollback;
