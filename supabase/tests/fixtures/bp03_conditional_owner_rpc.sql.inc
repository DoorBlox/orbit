-- ORBIT W1 BP-03/BP-04: proposed revision-only owner snapshot RPC.
-- DO NOT COPY INTO supabase/migrations OR APPLY TO HOSTED SUPABASE.
-- This fixture is installed only inside disposable local test transactions.
-- Owner/Command HQ PR #104 permits source-only/local exploration, NOT rollout.
-- Projection below is verbatim from the reviewed private-extensions migration.
-- Read-only, owner-scoped, SECURITY INVOKER, no caller owner argument.

create or replace function public.load_owner_snapshot_if_changed(p_known_revision bigint) returns jsonb language plpgsql stable security invoker
set search_path = '' as $$
declare owner_uuid uuid:=auth.uid(); result jsonb;
begin
  if owner_uuid is null then raise exception using errcode='42501',message='Authenticated workspace required'; end if;
  if p_known_revision is null or p_known_revision<0 then
    raise exception using errcode='22023',message='Invalid known revision';
  end if;
  -- One SELECT: the revision and changed projection share a single MVCC snapshot.
  -- The CASE short-circuits all heavyweight collections on equal revision.
  select case when current.revision=p_known_revision
    then jsonb_build_object('revision',current.revision,'unchanged',true)
    else jsonb_build_object('revision',current.revision,
    'snapshot',jsonb_build_object(
      'branches',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'parentId',coalesce(parent_id,'root'),'label',label,'color',color)) order by created_at,id) from public.branches where owner_id=owner_uuid),'[]'),
      'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'projectId',project_id,'title',title,'dueDate',coalesce(due_date::text,''),'urgency',urgency,'effortMinutes',effort_minutes,'status',status,'criteria',criteria,'description',description,'resourceUrl',coalesce(resource_url,''),'createdAt',created_at,'completedAt',coalesce(completed_at::text,'')) order by created_at,id) from public.tasks where owner_id=owner_uuid),'[]'),
      'journalEntries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',entry_date,'title',title,'html',body_html,'createdAt',created_at,'updatedAt',updated_at) order by created_at,id) from public.journal_entries where owner_id=owner_uuid),'[]'),
      'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',id,'date',marker_date,'title',title) order by created_at,id) from public.milestones where owner_id=owner_uuid),'[]'),
      'spatialLayout',coalesce((select jsonb_object_agg(widget_key,jsonb_strip_nulls(jsonb_build_object('x',x,'y',y,'width',width,'height',height))) from public.widget_layouts where owner_id=owner_uuid),'{}'),
      'preferences',coalesce((select jsonb_build_object('colorMode',color_mode,'timezone',timezone) from public.preferences where owner_id=owner_uuid),'{"colorMode":"deadline","timezone":"Asia/Jakarta"}'),
      'extensions',coalesce((select extensions from public.preferences where owner_id=owner_uuid),'{}'::jsonb),
      'profile',coalesce((select jsonb_build_object('displayName',display_name) from public.profiles where user_id=owner_uuid),'{"displayName":"My space"}')
    )) end into result
  from (select coalesce((select revision from private.workspace_revisions where owner_id=owner_uuid),0) as revision) as current;
  return result;
end;
$$;

revoke all on function public.load_owner_snapshot_if_changed(bigint) from public,anon;
grant execute on function public.load_owner_snapshot_if_changed(bigint) to authenticated;
