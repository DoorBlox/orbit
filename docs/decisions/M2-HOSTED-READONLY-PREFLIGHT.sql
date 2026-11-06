-- READ ONLY. Optional administrator inspection, not an owner assignment/migration.
-- Select orbit-development (ixfgavgtwuzdgucjriec) before running.
-- Prepared only: no live Supabase execution was available to the reviewing agent.
begin transaction read only;

select count(*) = 1 as exactly_one_configuration,
       coalesce(bool_and(owner_id = '20daa320-348a-4991-a844-f27569dbc2b3'::uuid),false)
         and count(owner_id) = 1 as intended_owner,
       coalesce(bool_and(public_read_enabled is false),false) as public_reads_off
from private.orbit_configuration;

-- Seven private application tables plus publication/internal tables.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' and c.relname in
  ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences','published_content'))
   or (n.nspname='private' and c.relname in
  ('orbit_configuration','workspace_revisions','publication_sources'))
order by n.nspname,c.relname;

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename in
  ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences','published_content'))
   or schemaname='private'
order by schemaname,tablename,policyname;

-- Effective table privileges, including inherited PUBLIC grants.
select r.role_name,n.nspname as schema_name,c.relname as table_name,
       p.operation,has_table_privilege(r.role_name,c.oid,p.operation) as granted
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join (values ('anon'),('authenticated')) as r(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) as p(operation)
where (n.nspname='public' and c.relname in
  ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences','published_content'))
   or (n.nspname='private' and c.relname in
  ('orbit_configuration','workspace_revisions','publication_sources'))
order by n.nspname,c.relname,r.role_name,p.operation;

-- Public RPCs must be invoker; only the two private boolean lookups are definers.
select n.nspname as schema_name,p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,p.proconfig as function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       case when p.proname in ('save_owner_snapshot','publish_content')
         then position('PT409' in pg_get_functiondef(p.oid))>0
         else null end as includes_business_conflict_http_409
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in
  ('orbit_owner_access','load_owner_snapshot','save_owner_snapshot','publish_content','unpublish_content'))
   or (n.nspname='private' and p.proname in ('is_orbit_owner','public_reads_enabled'))
order by n.nspname,p.proname;

-- Row-lock and revision triggers must be present/enabled for all seven tables.
select c.relname as table_name,t.tgname,t.tgenabled
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences')
  and t.tgname in ('orbit_revision_lock','orbit_revision') and not t.tgisinternal
order by c.relname,t.tgname;

rollback;
