-- Disposable local test only: transaction rolls back all synthetic identities/config.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','orbit-owner@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','orbit-stranger@example.invalid');
update private.orbit_configuration set owner_id='11111111-1111-4111-8111-111111111111';
select ok(not public_read_enabled,'public reads default disabled') from private.orbit_configuration;
select ok(not has_table_privilege('anon','public.tasks','select'),'anon has no task grant');
select ok(not has_table_privilege('authenticated','private.orbit_configuration','update'),'owner cannot configure allowlist or enable public reads');
select ok(not has_function_privilege('anon','public.publish_content(text,text,text,text,date)','execute'),'anonymous publication RPC denied');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef),'no exposed security-definer RPC');
select is((select array_agg(column_name::text order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='published_content'),array['id','kind','title','excerpt','published_date','updated_at'],'public projection has only safe columns');

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select ok(public.orbit_owner_access(),'allowlisted UUID accepted');
select is((public.load_owner_snapshot()->>'revision')::bigint,0::bigint,'empty owner revision zero');
select lives_ok($$select public.save_owner_snapshot('{
 "branches":[{"id":"inbox","parentId":"root","label":"Unsorted"}],
 "tasks":[{"id":"secret-task","projectId":"inbox","title":"Chosen task title","dueDate":"2026-11-02","urgency":3,"effortMinutes":20,"status":"ready","criteria":"PRIVATE_CRITERIA","description":"PRIVATE_DESCRIPTION","resourceUrl":"https://private.example.invalid/","createdAt":"2026-11-01T00:00Z"}],
 "journalEntries":[{"id":"secret-journal","date":"2026-11-01","title":"Chosen journal title","html":"<p>PRIVATE_JOURNAL_BODY</p>"}],
 "milestones":[{"id":"milestone","date":"2026-11-03","title":"Chosen milestone"}],
 "spatialLayout":{"timeline":{"x":445,"y":105,"width":1400,"height":525}},
 "preferences":{"colorMode":"urgency","timezone":"Asia/Jakarta"},"profile":{"displayName":"Synthetic owner"}
}'::jsonb,0)$$,'owner snapshot saves normalized records atomically');
select is((select count(*) from public.tasks),1::bigint,'owner reads private task');
select is((public.load_owner_snapshot()->'snapshot'->'preferences'->>'colorMode'),'urgency','preferences load from normalized table');
select is((public.load_owner_snapshot()->'snapshot'->'journalEntries'->0->>'html'),'<p>PRIVATE_JOURNAL_BODY</p>','owner journal loads');
select lives_ok($$update public.profiles set display_name=display_name$$,'owner can update profiles');
select lives_ok($$with deleted as(delete from public.profiles returning *) insert into public.profiles select * from deleted$$,'owner can delete and recreate profiles');
select lives_ok($$update public.branches set label=label$$,'owner can update branches');
select lives_ok($$with deleted as(delete from public.branches returning *) insert into public.branches select * from deleted$$,'owner can delete and recreate branches');
select lives_ok($$update public.tasks set title=title$$,'owner can update tasks');
select lives_ok($$with deleted as(delete from public.tasks returning *) insert into public.tasks select * from deleted$$,'owner can delete and recreate tasks');
select lives_ok($$update public.journal_entries set title=title$$,'owner can update journal_entries');
select lives_ok($$with deleted as(delete from public.journal_entries returning *) insert into public.journal_entries select * from deleted$$,'owner can delete and recreate journal_entries');
select lives_ok($$update public.milestones set title=title$$,'owner can update milestones');
select lives_ok($$with deleted as(delete from public.milestones returning *) insert into public.milestones select * from deleted$$,'owner can delete and recreate milestones');
select lives_ok($$update public.widget_layouts set x=x$$,'owner can update widget_layouts');
select lives_ok($$with deleted as(delete from public.widget_layouts returning *) insert into public.widget_layouts select * from deleted$$,'owner can delete and recreate widget_layouts');
select lives_ok($$update public.preferences set color_mode=color_mode$$,'owner can update preferences');
select lives_ok($$with deleted as(delete from public.preferences returning *) insert into public.preferences select * from deleted$$,'owner can delete and recreate preferences');
select throws_ok($$select public.save_owner_snapshot((public.load_owner_snapshot()->'snapshot'),0)$$,'PT409',null,'stale revision rejected');
select throws_ok($$select public.save_owner_snapshot(jsonb_set((public.load_owner_snapshot()->'snapshot'),'{tasks,0,projectId}','"missing"'),(public.load_owner_snapshot()->>'revision')::bigint)$$,'23503',null,'invalid FK rejected inside snapshot RPC');
select is((select count(*) from public.tasks),1::bigint,'failed snapshot retains original rows');
select throws_ok($$select public.save_owner_snapshot(jsonb_set((public.load_owner_snapshot()->'snapshot'),'{branches}','[{"id":"inbox","parentId":"root","label":"Unsorted"},{"id":"a","parentId":"b","label":"A"},{"id":"b","parentId":"a","label":"B"}]'),(public.load_owner_snapshot()->>'revision')::bigint)$$,'P0001',null,'cyclic branches rejected');
select is((select count(*) from public.branches),1::bigint,'cyclic snapshot rolled back');
create temporary table old_revision as select (public.load_owner_snapshot()->>'revision')::bigint as revision;
update public.tasks set title='Updated chosen task title' where id='secret-task';
select ok((public.load_owner_snapshot()->>'revision')::bigint>(select revision from old_revision),'direct owner DML also advances revision');
select throws_ok($$select public.save_owner_snapshot(public.load_owner_snapshot()->'snapshot',(select revision from old_revision))$$,'PT409',null,'direct-write stale revision rejected');
select throws_ok($$update public.tasks set owner_id='22222222-2222-4222-8222-222222222222'$$,'42501',null,'owner reassignment blocked');
select throws_ok($$insert into public.tasks(owner_id,id,project_id,title) values('11111111-1111-4111-8111-111111111111','bad','foreign-branch','Bad')$$,'23503',null,'cross-owner or nonexistent branch denied');
select lives_ok($$select public.publish_content('task','secret-task','Updated chosen task title','Explicit public excerpt','2026-11-02')$$,'owner explicitly publishes safe task projection');
select is((select count(*) from public.published_content),1::bigint,'owner can read publication with public gate off');
update public.tasks set title='NEW_PRIVATE_UNCONFIRMED_TITLE' where id='secret-task';
select throws_ok($$select public.publish_content('task','secret-task','Updated chosen task title','Explicit public excerpt',null)$$,'PT409',null,'private title changed after confirmation requires new review');
select is((select title from public.published_content where kind='task'),'Updated chosen task title','unconfirmed newer title never published');
update public.tasks set title='Updated chosen task title' where id='secret-task';

select throws_ok($$select public.publish_content('journal','secret-journal','Chosen journal title','<script>unsafe</script>',null)$$,'22023',null,'publication rejects HTML excerpt');
select lives_ok($$select public.publish_content('journal','secret-journal','Chosen journal title','Only chosen journal excerpt','2026-11-01')$$,'explicit journal excerpt publishes without body');
select ok(not exists(select 1 from public.published_content p where to_jsonb(p)::text like '%PRIVATE_%'),'private fields absent projection');
create temporary table before_atomic_failure as select public.load_owner_snapshot() as state,
  (select jsonb_agg(to_jsonb(p) order by id) from public.published_content p) as publications;
select throws_ok($$select public.save_owner_snapshot(jsonb_set(jsonb_set(public.load_owner_snapshot()->'snapshot','{journalEntries}','[]'),'{tasks,0,projectId}','"missing"'),(public.load_owner_snapshot()->>'revision')::bigint)$$,'23503',null,'late snapshot failure after publication pruning rejected');
select is(public.load_owner_snapshot(),(select state from before_atomic_failure),'all seven collections and revision roll back after late failure');
select is((select jsonb_agg(to_jsonb(p) order by id) from public.published_content p),(select publications from before_atomic_failure),'publication pruning rolls back with failed snapshot');
select lives_ok($$select public.publish_content('milestone','milestone','Chosen milestone','Chosen milestone excerpt',null)$$,'owner can publish milestone');
select lives_ok($$delete from public.milestones where id='milestone'; set constraints all immediate$$,'direct source deletion succeeds');
select is((select count(*) from public.published_content where kind='milestone'),0::bigint,'direct deletion also unpublishes final absent source');


-- Every private table rejects both stranger own-row insert and owner-ID forgery.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select ok(not public.orbit_owner_access(),'nonowner UUID denied independently of provider/email claims');
select throws_ok($$select public.load_owner_snapshot()$$,'42501',null,'stranger snapshot denied');
select throws_ok($$select public.save_owner_snapshot('{}',0)$$,'42501',null,'stranger save denied');
select throws_ok($$select public.publish_content('task','secret-task','Updated chosen task title','steal',null)$$,'42501',null,'stranger publication denied');
select throws_ok($$select public.unpublish_content('task','secret-task')$$,'42501',null,'stranger unpublish denied');
select is((select count(*) from public.profiles),0::bigint,'stranger profiles filtered');
select is((select count(*) from public.branches),0::bigint,'stranger branches filtered');
select is((select count(*) from public.tasks),0::bigint,'stranger tasks filtered');
select is((select count(*) from public.journal_entries),0::bigint,'stranger journal filtered');
select is((select count(*) from public.milestones),0::bigint,'stranger milestones filtered');
select is((select count(*) from public.widget_layouts),0::bigint,'stranger layout filtered');
select is((select count(*) from public.preferences),0::bigint,'stranger preferences filtered');
select is((select count(*) from public.published_content),0::bigint,'protected preview stranger sees no publication');
select throws_ok($$insert into public.profiles(user_id) values('22222222-2222-4222-8222-222222222222')$$,'42501',null,'stranger own profile denied');
select throws_ok($$insert into public.branches(owner_id,id,label) values('22222222-2222-4222-8222-222222222222','foreign-branch','Foreign')$$,'42501',null,'stranger own branch denied');
select throws_ok($$insert into public.tasks(owner_id,id,project_id,title) values('22222222-2222-4222-8222-222222222222','t','inbox','Foreign')$$,'42501',null,'stranger own task denied');
select throws_ok($$insert into public.journal_entries(owner_id,id,entry_date) values('22222222-2222-4222-8222-222222222222','j','2026-11-01')$$,'42501',null,'stranger own journal denied');
select throws_ok($$insert into public.milestones(owner_id,id,title,marker_date) values('22222222-2222-4222-8222-222222222222','m','Foreign','2026-11-01')$$,'42501',null,'stranger own milestone denied');
select throws_ok($$insert into public.widget_layouts(owner_id,widget_key,x,y) values('22222222-2222-4222-8222-222222222222','timeline',0,0)$$,'42501',null,'stranger own layout denied');
select throws_ok($$insert into public.preferences(owner_id) values('22222222-2222-4222-8222-222222222222')$$,'42501',null,'stranger own preference denied');
select throws_ok($$insert into public.tasks(owner_id,id,project_id,title) values('11111111-1111-4111-8111-111111111111','forged','inbox','Foreign')$$,'42501',null,'forged owner task denied');
select throws_ok($$insert into public.profiles(user_id) values('11111111-1111-4111-8111-111111111111')$$,'42501',null,'forged owner profiles insert denied');
select throws_ok($$insert into public.branches(owner_id,id,label) values('11111111-1111-4111-8111-111111111111','forged','Forged')$$,'42501',null,'forged owner branches insert denied');
select throws_ok($$insert into public.journal_entries(owner_id,id,entry_date) values('11111111-1111-4111-8111-111111111111','forged','2026-11-01')$$,'42501',null,'forged owner journal_entries insert denied');
select throws_ok($$insert into public.milestones(owner_id,id,title,marker_date) values('11111111-1111-4111-8111-111111111111','forged','Forged','2026-11-01')$$,'42501',null,'forged owner milestones insert denied');
select throws_ok($$insert into public.widget_layouts(owner_id,widget_key,x,y) values('11111111-1111-4111-8111-111111111111','journal',0,0)$$,'42501',null,'forged owner widget_layouts insert denied');
select throws_ok($$insert into public.preferences(owner_id) values('11111111-1111-4111-8111-111111111111')$$,'42501',null,'forged owner preferences insert denied');
select throws_ok($$update private.orbit_configuration set owner_id=auth.uid()$$,'42501',null,'stranger cannot allowlist self');
select throws_ok($$select * from private.orbit_configuration$$,'42501',null,'configuration cannot be enumerated');
with changed as(update public.tasks set title='stolen' returning *) select is((select count(*) from changed),0::bigint,'stranger update affects zero rows');
with changed as(delete from public.journal_entries returning *) select is((select count(*) from changed),0::bigint,'stranger delete affects zero rows');
with changed as(update public.profiles set display_name='stranger' returning *) select is((select count(*) from changed),0::bigint,'stranger profiles update denied');
with changed as(update public.branches set label='stranger' returning *) select is((select count(*) from changed),0::bigint,'stranger branches update denied');
with changed as(update public.journal_entries set title='stranger' returning *) select is((select count(*) from changed),0::bigint,'stranger journal_entries update denied');
with changed as(update public.milestones set title='stranger' returning *) select is((select count(*) from changed),0::bigint,'stranger milestones update denied');
with changed as(update public.widget_layouts set x=100 returning *) select is((select count(*) from changed),0::bigint,'stranger widget_layouts update denied');
with changed as(update public.preferences set color_mode='deadline' returning *) select is((select count(*) from changed),0::bigint,'stranger preferences update denied');
with changed as(delete from public.profiles returning *) select is((select count(*) from changed),0::bigint,'stranger profiles delete denied');
with changed as(delete from public.branches returning *) select is((select count(*) from changed),0::bigint,'stranger branches delete denied');
with changed as(delete from public.tasks returning *) select is((select count(*) from changed),0::bigint,'stranger tasks delete denied');
with changed as(delete from public.milestones returning *) select is((select count(*) from changed),0::bigint,'stranger milestones delete denied');
with changed as(delete from public.widget_layouts returning *) select is((select count(*) from changed),0::bigint,'stranger widget_layouts delete denied');
with changed as(delete from public.preferences returning *) select is((select count(*) from changed),0::bigint,'stranger preferences delete denied');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*) from public.published_content),0::bigint,'anonymous protected preview empty');
select throws_ok($$select * from public.profiles$$,'42501',null,'anon profiles read denied');
select throws_ok($$update public.profiles set display_name=display_name$$,'42501',null,'anon profiles update denied');
select throws_ok($$delete from public.profiles$$,'42501',null,'anon profiles delete denied');
select throws_ok($$select * from public.branches$$,'42501',null,'anon branches read denied');
select throws_ok($$update public.branches set label=label$$,'42501',null,'anon branches update denied');
select throws_ok($$delete from public.branches$$,'42501',null,'anon branches delete denied');
select throws_ok($$select * from public.tasks$$,'42501',null,'anon tasks read denied');
select throws_ok($$update public.tasks set title=title$$,'42501',null,'anon tasks update denied');
select throws_ok($$delete from public.tasks$$,'42501',null,'anon tasks delete denied');
select throws_ok($$select * from public.journal_entries$$,'42501',null,'anon journal_entries read denied');
select throws_ok($$update public.journal_entries set title=title$$,'42501',null,'anon journal_entries update denied');
select throws_ok($$delete from public.journal_entries$$,'42501',null,'anon journal_entries delete denied');
select throws_ok($$select * from public.milestones$$,'42501',null,'anon milestones read denied');
select throws_ok($$update public.milestones set title=title$$,'42501',null,'anon milestones update denied');
select throws_ok($$delete from public.milestones$$,'42501',null,'anon milestones delete denied');
select throws_ok($$select * from public.widget_layouts$$,'42501',null,'anon widget_layouts read denied');
select throws_ok($$update public.widget_layouts set x=x$$,'42501',null,'anon widget_layouts update denied');
select throws_ok($$delete from public.widget_layouts$$,'42501',null,'anon widget_layouts delete denied');
select throws_ok($$select * from public.preferences$$,'42501',null,'anon preferences read denied');
select throws_ok($$update public.preferences set color_mode=color_mode$$,'42501',null,'anon preferences update denied');
select throws_ok($$delete from public.preferences$$,'42501',null,'anon preferences delete denied');
select throws_ok($$insert into public.profiles(user_id) values('11111111-1111-4111-8111-111111111111')$$,'42501',null,'anon profiles insert denied');
select throws_ok($$insert into public.branches(owner_id,id,label) values('11111111-1111-4111-8111-111111111111','forged','Forged')$$,'42501',null,'anon branches insert denied');
select throws_ok($$insert into public.journal_entries(owner_id,id,entry_date) values('11111111-1111-4111-8111-111111111111','forged','2026-11-01')$$,'42501',null,'anon journal_entries insert denied');
select throws_ok($$insert into public.milestones(owner_id,id,title,marker_date) values('11111111-1111-4111-8111-111111111111','forged','Forged','2026-11-01')$$,'42501',null,'anon milestones insert denied');
select throws_ok($$insert into public.widget_layouts(owner_id,widget_key,x,y) values('11111111-1111-4111-8111-111111111111','journal',0,0)$$,'42501',null,'anon widget_layouts insert denied');
select throws_ok($$insert into public.preferences(owner_id) values('11111111-1111-4111-8111-111111111111')$$,'42501',null,'anon preferences insert denied');
select throws_ok($$insert into public.tasks(owner_id,id,project_id,title) values('11111111-1111-4111-8111-111111111111','anon','inbox','Anon')$$,'42501',null,'anon tasks insert denied');
select throws_ok($$select * from public.tasks$$,'42501',null,'anonymous private task read denied');
select throws_ok($$select * from public.journal_entries$$,'42501',null,'anonymous private journal read denied');
select throws_ok($$select p.id,t.description from public.published_content p join public.tasks t on true$$,'42501',null,'anonymous join cannot recover private columns');
select throws_ok($$select * from private.publication_sources$$,'42501',null,'anonymous source mapping denied');
select throws_ok($$select public.load_owner_snapshot()$$,'42501',null,'anonymous snapshot RPC denied');
reset role;
update private.orbit_configuration set public_read_enabled=true;
set local role anon;
select is((select count(*) from public.published_content),2::bigint,'explicit admin gate enables only approved public projections');
select ok(not exists(select 1 from public.published_content p where to_jsonb(p)::text like '%secret-%' or to_jsonb(p)::text like '%PRIVATE_%'),'anonymous publication response excludes private identifiers and bodies');
select throws_ok($$insert into public.published_content(kind,title) values('task','Forged')$$,'42501',null,'anonymous cannot publish');
select throws_ok($$select p.id,j.body_html from public.published_content p join public.journal_entries j on true$$,'42501',null,'enabled public gate does not weaken private journal grants');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select lives_ok($$select public.unpublish_content('task','secret-task')$$,'owner can unpublish');
select is((select count(*) from public.published_content),1::bigint,'unpublish removes only intended projection');
select lives_ok($$select public.save_owner_snapshot(jsonb_set(public.load_owner_snapshot()->'snapshot','{journalEntries}','[]'),(public.load_owner_snapshot()->>'revision')::bigint)$$,'deleting journal in snapshot succeeds');
select is((select count(*) from public.published_content),0::bigint,'deleted source removes its publication atomically');
reset role;
select * from finish();
rollback;
