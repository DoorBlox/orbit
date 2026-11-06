-- Read-only pre/postflight for an authorized administrator on the verified target.
-- Does not exercise TRUNCATE or any mutation, and returns no workspace content.
begin read only;
with tables(name) as (values
 ('profiles'),('branches'),('tasks'),('journal_entries'),('milestones'),('widget_layouts'),('preferences'))
select name,
 (select relrowsecurity from pg_class where oid=format('public.%I',name)::regclass) as rls_enabled,
 has_table_privilege('authenticated',format('public.%I',name),'SELECT') as can_select,
 has_table_privilege('authenticated',format('public.%I',name),'INSERT') as can_insert,
 has_table_privilege('authenticated',format('public.%I',name),'UPDATE') as can_update,
 has_table_privilege('authenticated',format('public.%I',name),'DELETE') as can_delete,
 has_table_privilege('authenticated',format('public.%I',name),'TRUNCATE') as can_truncate,
 has_table_privilege('authenticated',format('public.%I',name),'TRIGGER') as can_create_trigger,
 has_table_privilege('authenticated',format('public.%I',name),'REFERENCES') as can_reference,
 has_any_column_privilege('authenticated',format('public.%I',name),'REFERENCES') as can_reference_any_column
from tables order by name;
select owner_id='20daa320-348a-4991-a844-f27569dbc2b3'::uuid as expected_owner,
       not public_read_enabled as public_reads_disabled from private.orbit_configuration;
select signature,has_function_privilege('authenticated',signature,'EXECUTE') as executable
from (values ('public.orbit_owner_access()'),('public.load_owner_snapshot()'),
 ('public.save_owner_snapshot(jsonb,bigint)')) f(signature);
commit;
