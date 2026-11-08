-- ORBIT 2.0 tenant isolation proposal. DO NOT APPLY TO HOSTED PRODUCTION
-- until local A/B/C bearer+SQL tests, backup, owner acceptance and release gates pass.
-- Added after all applied migrations. Keep original owner publication privileges.
begin;

-- Original row-scoped SELECT/INSERT/UPDATE/DELETE policies already match auth.uid().
-- Remove ONLY the old global singleton gate for private workspace tables. Keep a
-- restrictive non-anonymous predicate as defense in depth.
do $$
declare tbl text;
begin
  foreach tbl in array array['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences'] loop
    execute format('drop policy if exists orbit_single_owner on public.%I',tbl);
    execute format('create policy orbit_tenant_authenticated on public.%I as restrictive for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',tbl);
  end loop;
end;
$$;

-- Revisions remain user-scoped. Each user may read/write only their own CAS row.
drop policy if exists workspace_revision_owner on private.workspace_revisions;
create policy workspace_revision_owner on private.workspace_revisions for all to authenticated
  using(owner_id=(select auth.uid()))
  with check(owner_id=(select auth.uid()));

create or replace function private.lock_workspace_revision() returns trigger language plpgsql security invoker
set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into private.workspace_revisions(owner_id) values(auth.uid()) on conflict do nothing;
    perform revision from private.workspace_revisions where owner_id=auth.uid() for update;
  end if;
  return null;
end;
$$;

create or replace function private.bump_workspace_revision() returns trigger language plpgsql security invoker
set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into private.workspace_revisions(owner_id,revision) values(auth.uid(),1)
    on conflict(owner_id) do update set revision=private.workspace_revisions.revision+1;
  end if;
  return null;
end;
$$;

-- This RPC only answers if the verified user may open THEIR OWN workspace.
-- It grants no publication/admin capabilities; keep orbit_owner_access separate.
create function public.orbit_workspace_access() returns boolean language sql stable security invoker
set search_path = '' as $$ select auth.uid() is not null; $$;
revoke all on function public.orbit_workspace_access() from public, anon;
grant execute on function public.orbit_workspace_access() to authenticated;

-- Existing owner-only publication projection must not be deleted when another
-- tenant deletes a coincidentally equal source ID.
create or replace function private.unpublish_deleted_source() returns trigger language plpgsql security invoker
set search_path = '' as $$
declare source_exists boolean; source_kind text;
begin
  if not private.is_orbit_owner() then return null; end if;
  source_kind=case tg_table_name when 'tasks' then 'task' when 'branches' then 'branch'
    when 'journal_entries' then 'journal' else 'milestone' end;
  execute format('select exists(select 1 from public.%I where owner_id=$1 and id=$2)',tg_table_name)
    into source_exists using old.owner_id,old.id;
  if not source_exists then
    delete from public.published_content where id in(select publication_id from private.publication_sources
      where kind=source_kind and source_id=old.id);
  end if;
  return null;
end;
$$;

-- Each verified user can load only their own owner_id-scoped data and revision.
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
      'profile',coalesce((select jsonb_build_object('displayName',display_name) from public.profiles where user_id=owner_uuid),'{"displayName":"My space"}')
    )) into result;
  return result;
end;
$$;

-- Preserve exactly the last reviewed snapshot algorithm, PT409 CAS semantics,
-- owner_id-scoped DELETE/INSERT, composite FKs and owner-only publication cleanup.
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
  insert into public.preferences(owner_id,color_mode,timezone) values(owner_uuid,coalesce(p_snapshot->'preferences'->>'colorMode','deadline'),coalesce(p_snapshot->'preferences'->>'timezone','Asia/Jakarta'))
    on conflict(owner_id) do update set color_mode=excluded.color_mode,timezone=excluded.timezone;
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
