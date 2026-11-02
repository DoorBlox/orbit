-- Only for the disposable local SQL harness; not a hosted Auth implementation.
create schema if not exists auth;
create schema if not exists extensions;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
grant usage on schema auth,public,extensions to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
-- Match Supabase public-schema object grants, then migrations constrain access.
alter default privileges in schema public grant all on tables to anon,authenticated;

create extension if not exists pgtap with schema extensions;
