-- 2.2 additive private workspace extensions, for per-user notes/drawings/links.
-- Requires tenant migration 20261108160000. No new tables, no public bucket,
-- no service role bypass, and no changes to original-owner publishing.
-- Apply to hosted only after an owner-approved restore-ready rollout.
begin;
alter table public.preferences
  add column extensions jsonb not null default '{}'::jsonb
  constraint preferences_extensions_object check (
    jsonb_typeof(extensions)='object' and octet_length(extensions::text)<=900000
  );

create or replace function public.load_owner_snapshot() returns jsonb language plpgsql security invoker
set search_path = '' as $$
declare owner_uuid uuid:=auth.uid(); result jsonb;
begin
  if owner_uuid is null then raise exception using errcode='42501',message='Authenticated workspace required'; end if;
  -- One SQL statement uses one MVCC snapshot for revision and all projections.
  select jsonb_build_object('revision',coalesce((select revision from private.workspace_revisions where owner_id=owner_uuid),0),
    'snapshot',jsonb_build_object(
      'branches',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'parentId',coalesce(parent_id,'root'),'label',label,'color',color)) order by created_at,id) from public.branches where owner_id=owner_uuid),'[]'),
      'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'projectId',project_id,'title',title,'dueDate',coalesce(due_date::text,''),'urgency',urgency,'effortMinutes',effort_minutes,'status',status,'criteria',criteria,'description',description,'resourceUrl',coalesce(resource_url,''),'createdAt',created_at,'completedAt',coalesce(completed_at::text,'')) order by created_at,id) from public.tasks where owner_id=owner_uuid),'[]'),
      'journalEntries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',entry_date,'title',title,'html',body_html,'createdAt',created_at,'updatedAt',updated_at) order by created_at,id) from public.journal_entries where owner_id=owner_uuid),'[]'),
      'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',marker_date,'title',title) order by created_at,id) from public.milestones where owner_id=owner_uuid),'[]'),
      'spatialLayout',coalesce((select jsonb_object_agg(widget_key,jsonb_strip_nulls(jsonb_build_object('x',x,'y',y,'width',width,'height',height))) from public.widget_layouts where owner_id=owner_uuid),'{}'),
      'preferences',coalesce((select jsonb_build_object('colorMode',color_mode,'timezone',timezone) from public.preferences where owner_id=owner_uuid),'{"colorMode":"deadline","timezone":"Asia/Jakarta"}'),
      'extensions',coalesce((select extensions from public.preferences where owner_id=owner_uuid),'{}'::jsonb),
      'profile',coalesce((select jsonb_build_object('displayName',display_name) from public.profiles where user_id=owner_uuid),'{"displayName":"My space"}')
    )) into result;
  return result;
end;
$$;

create or replace function public.save_owner_snapshot(p_snapshot jsonb,p_expected_revision bigint) returns jsonb language plpgsql security invoker
set search_path = '' as $$
declare owner_uuid uuid:=auth.uid(); current_revision bigint; key_name text; item jsonb; publication uuid;
begin
  if owner_uuid is null then raise exception using errcode='42501',message='Authenticated workspace required'; end if;
  if p_expected_revision is null or p_expected_revision<0 or jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception using errcode='22023',message='Invalid snapshot';
  end if;
  foreach key_name in array array['branches','tasks','journalEntries','milestones'] loop
    if jsonb_typeof(p_snapshot->key_name) is distinct from 'array' then raise exception using errcode='22023',message='Invalid snapshot collection'; end if;
  end loop;
  if jsonb_array_length(p_snapshot->'tasks')>10000 or jsonb_array_length(p_snapshot->'branches')>4000 or jsonb_array_length(p_snapshot->'journalEntries')>600 or jsonb_array_length(p_snapshot->'milestones')>500
    or jsonb_typeof(p_snapshot->'spatialLayout') is distinct from 'object' or jsonb_typeof(p_snapshot->'preferences') is distinct from 'object' then
    raise exception using errcode='22023',message='Invalid snapshot limits';
  end if;
  if p_snapshot ? 'extensions' and
    (jsonb_typeof(p_snapshot->'extensions') is distinct from 'object' or
     octet_length((p_snapshot->'extensions')::text)>900000)
    then raise exception using errcode='22023',message='Invalid private extensions';
  end if;
  insert into private.workspace_revisions(owner_id) values(owner_uuid) on conflict do nothing;
  select revision into current_revision from private.workspace_revisions where owner_id=owner_uuid for update;
  if current_revision<>p_expected_revision then raise exception using errcode='PT409',message='Snapshot conflict'; end if;
  -- Every statement is one transaction; constraint/error failure rolls all back.
  -- Defer composite FKs for arbitrary branch order and replacement semantics.
  set constraints public.branches_parent_fkey,public.tasks_branch_fkey deferred;
  delete from public.tasks where owner_id=owner_uuid;
  delete from public.branches where owner_id=owner_uuid;
  delete from public.journal_entries where owner_id=owner_uuid;
  delete from public.milestones where owner_id=owner_uuid;
  delete from public.widget_layouts where owner_id=owner_uuid;
  for item in select value from jsonb_array_elements(p_snapshot->'branches') loop
    insert into public.branches(owner_id,id,parent_id,label,color) values(owner_uuid,item->>'id',nullif(item->>'parentId','root'),item->>'label',nullif(item->>'color',''));
  end loop;
  for item in select value from jsonb_array_elements(p_snapshot->'tasks') loop
    insert into public.tasks(owner_id,id,project_id,title,due_date,urgency,effort_minutes,status,criteria,description,resource_url,created_at,completed_at)
    values(owner_uuid,item->>'id',item->>'projectId',item->>'title',nullif(item->>'dueDate','')::date,coalesce((item->>'urgency')::smallint,1),coalesce((item->>'effortMinutes')::integer,0),coalesce(item->>'status','captured'),coalesce(item->>'criteria',''),coalesce(item->>'description',''),nullif(item->>'resourceUrl',''),coalesce(nullif(item->>'createdAt','')::timestamptz,now()),nullif(item->>'completedAt','')::timestamptz);
  end loop;
  for item in select value from jsonb_array_elements(p_snapshot->'journalEntries') loop
    insert into public.journal_entries(owner_id,id,entry_date,title,body_html,created_at,updated_at)
    values(owner_uuid,item->>'id',(item->>'date')::date,coalesce(item->>'title',''),coalesce(item->>'html',''),coalesce(nullif(item->>'createdAt','')::timestamptz,now()),coalesce(nullif(item->>'updatedAt','')::timestamptz,now()));
  end loop;
  for item in select value from jsonb_array_elements(p_snapshot->'milestones') loop
    insert into public.milestones(owner_id,id,title,marker_date) values(owner_uuid,item->>'id',item->>'title',(item->>'date')::date);
  end loop;
  for key_name,item in select key,value from jsonb_each(p_snapshot->'spatialLayout') loop
    insert into public.widget_layouts(owner_id,widget_key,x,y,width,height) values(owner_uuid,key_name,(item->>'x')::numeric,(item->>'y')::numeric,(item->>'width')::integer,(item->>'height')::integer);
  end loop;
  -- A legacy 1.0 client never sends extensions. Preserve existing private notes
  -- and drawings when that client writes a valid old snapshot.
  insert into public.preferences(owner_id,color_mode,timezone,extensions)
    values(owner_uuid,coalesce(p_snapshot->'preferences'->>'colorMode','deadline'),
      coalesce(p_snapshot->'preferences'->>'timezone','Asia/Jakarta'),
      coalesce(p_snapshot->'extensions','{}'::jsonb))
    on conflict(owner_id) do update set color_mode=excluded.color_mode,timezone=excluded.timezone,
      extensions=case when p_snapshot ? 'extensions'
        then excluded.extensions else public.preferences.extensions end;
  insert into public.profiles(user_id,display_name) values(owner_uuid,coalesce(p_snapshot->'profile'->>'displayName','My space'))
    on conflict(user_id) do update set display_name=excluded.display_name;
  -- Remove only deleted sources; existing publication text is an independent
  -- approved snapshot, never automatically republished from private edits.
  if private.is_orbit_owner() then
    for publication in select s.publication_id from private.publication_sources s where
    (s.kind='task' and not exists(select 1 from public.tasks where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='branch' and not exists(select 1 from public.branches where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='journal' and not exists(select 1 from public.journal_entries where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='milestone' and not exists(select 1 from public.milestones where owner_id=owner_uuid and id=s.source_id))
    loop delete from public.published_content where id=publication; end loop;
  end if;
  -- Check deferred relations inside the RPC so errors occur before returning.
  set constraints public.branches_parent_fkey,public.tasks_branch_fkey immediate;
  return jsonb_build_object('revision',(select revision from private.workspace_revisions where owner_id=owner_uuid));
end;
$$;

commit;
