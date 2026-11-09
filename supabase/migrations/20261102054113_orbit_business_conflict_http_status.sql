-- Created by Supabase CLI 2.122.0 migration new orbit_business_conflict_http_status.
-- Applied migrations remain immutable. Only deterministic business conflicts
-- change from SQLSTATE 40001 to PostgREST PT409 (HTTP 409). Database-generated
-- serialization failures retain their normal retry semantics.
-- PostgREST 14 retries 40001, which otherwise loops forever on stale revisions.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions
-- CREATE OR REPLACE preserves each existing function's restricted EXECUTE grants.

create or replace function public.save_owner_snapshot(p_snapshot jsonb,p_expected_revision bigint) returns jsonb language plpgsql security invoker
set search_path = '' as $$
declare owner_uuid uuid:=auth.uid(); current_revision bigint; key_name text; item jsonb; publication uuid;
begin
  if not private.is_orbit_owner() then raise exception using errcode='42501',message='Owner access required'; end if;
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
  for publication in select s.publication_id from private.publication_sources s where
    (s.kind='task' and not exists(select 1 from public.tasks where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='branch' and not exists(select 1 from public.branches where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='journal' and not exists(select 1 from public.journal_entries where owner_id=owner_uuid and id=s.source_id)) or
    (s.kind='milestone' and not exists(select 1 from public.milestones where owner_id=owner_uuid and id=s.source_id))
  loop delete from public.published_content where id=publication; end loop;
  -- Check deferred relations inside the RPC so errors occur before returning.
  set constraints public.branches_parent_fkey,public.tasks_branch_fkey immediate;
  return jsonb_build_object('revision',(select revision from private.workspace_revisions where owner_id=owner_uuid));
end;
$$;

create or replace function public.publish_content(p_kind text,p_source_id text,p_expected_title text,p_excerpt text default '',p_publication_date date default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare owner_uuid uuid:=auth.uid(); source_title text; publication uuid; result jsonb;
begin
  if not private.is_orbit_owner() then raise exception using errcode='42501',message='Owner access required'; end if;
  -- Serialize publication with source writes/deletion; the independent safe
  -- projection must never outlive a concurrent committed source deletion.
  insert into private.workspace_revisions(owner_id) values(owner_uuid) on conflict do nothing;
  perform revision from private.workspace_revisions where owner_id=owner_uuid for update;
  if p_kind='task' then select title into source_title from public.tasks where owner_id=owner_uuid and id=p_source_id;
  elsif p_kind='branch' then select label into source_title from public.branches where owner_id=owner_uuid and id=p_source_id;
  elsif p_kind='journal' then select coalesce(nullif(title,''),'Untitled') into source_title from public.journal_entries where owner_id=owner_uuid and id=p_source_id;
  elsif p_kind='milestone' then select title into source_title from public.milestones where owner_id=owner_uuid and id=p_source_id;
  else raise exception using errcode='22023',message='Invalid publication kind'; end if;
  if source_title is null then raise exception using errcode='22023',message='Publication source not found'; end if;
  if source_title is distinct from p_expected_title then
    raise exception using errcode='PT409',message='Publication title changed; review it again';
  end if;
  if p_excerpt is null or p_excerpt ~ '[<>]' or char_length(p_excerpt)>2000 or source_title ~ '[<>]' then
    raise exception using errcode='22023',message='Publication must be plain text';
  end if;
  select publication_id into publication from private.publication_sources where kind=p_kind and source_id=p_source_id for update;
  if publication is null then
    insert into public.published_content(kind,title,excerpt,published_date) values(p_kind,source_title,p_excerpt,p_publication_date) returning id into publication;
    insert into private.publication_sources(publication_id,kind,source_id) values(publication,p_kind,p_source_id);
  else
    update public.published_content set title=source_title,excerpt=p_excerpt,published_date=p_publication_date,updated_at=now() where id=publication;
  end if;
  select to_jsonb(p) into result from public.published_content p where id=publication;
  return result;
end;
$$;
