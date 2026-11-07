-- Disposable local regression only; never execute test SQL on hosted owner data.
begin;
set local search_path=public,extensions;
select no_plan();
select ok(has_table_privilege('authenticated',format('public.%I',t),p),
          format('%s retains authenticated %s',t,p))
from unnest(array['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences']) t
cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) p;
select ok(not has_table_privilege('authenticated',format('public.%I',t),p),
          format('%s denies effective authenticated %s',t,p))
from unnest(array['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences']) t
cross join unnest(array['TRUNCATE','TRIGGER','REFERENCES']) p;
create schema least_privilege_probe;
grant usage,create on schema least_privilege_probe to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select throws_ok(format('truncate table public.%I cascade',t),'42501',null,
                 format('actual nonowner TRUNCATE denied: %s',t))
from unnest(array['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences']) t;
select throws_ok('create trigger forbidden_probe before update on public.tasks for each row execute function public.orbit_touch_updated_at()',
                 '42501',null,'actual nonowner CREATE TRIGGER denied');
select throws_ok('create table least_privilege_probe.forbidden_reference (uid uuid, id text, foreign key(uid,id) references public.tasks(owner_id,id))',
                 '42501',null,'actual nonowner REFERENCES denied');
reset role;
select * from finish();
rollback;
