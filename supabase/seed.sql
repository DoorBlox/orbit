-- Development-only conditional fixture. NEVER insert real journal/user data here.
-- Create a local test Auth user with email orbit-dev@example.invalid using Supabase Studio,
-- then run the seed after the initial migration on your LOCAL Supabase stack.
-- If that user does not exist, this seed is a harmless no-op.
do $orbit_dev_seed$
declare dev_owner uuid;
begin
 select id into dev_owner from auth.users where email = 'orbit-dev@example.invalid' limit 1;
 if dev_owner is null then
   raise notice 'ORBIT seed skipped: create local test Auth user orbit-dev@example.invalid first';
   return;
 end if;
 insert into public.profiles(user_id,display_name) values (dev_owner,'ORBIT Development')
 on conflict(user_id) do nothing;
 insert into public.branches(owner_id,id,parent_id,label,color) values
 (dev_owner,'inbox',null,'Unsorted',null),
 (dev_owner,'learning',null,'Learning','#6597E6'),
 (dev_owner,'coursework','learning','Coursework',null),
 (dev_owner,'just-because',null,'Just Because','#8B86CF')
 on conflict(owner_id,id) do nothing;
 insert into public.tasks(owner_id,id,project_id,title,due_date,urgency,effort_minutes,status,criteria) values
 (dev_owner,'seed-task-1','coursework','Review one practice worksheet','2026-11-08',3,25,'ready','Check the instructions and complete the first section'),
 (dev_owner,'seed-task-2','just-because','Sketch a tiny icon',null,1,20,'captured','Make something without an obligation'),
 (dev_owner,'seed-task-3','inbox','Example completed action','2026-10-28',2,10,'completed','Confirm this item leaves the active map')
 on conflict(owner_id,id) do nothing;
 insert into public.journal_entries(owner_id,id,entry_date,title,body_html) values
 (dev_owner,'seed-journal-1','2026-11-01','Example page','<p>This is sample writing, not a real diary entry.</p>')
 on conflict(owner_id,id) do nothing;
 insert into public.milestones(owner_id,id,marker_date,title) values
 (dev_owner,'seed-milestone-1','2026-12-01','A sample milestone')
 on conflict(owner_id,id) do nothing;
 insert into public.preferences(owner_id,color_mode,timezone) values
 (dev_owner,'deadline','Asia/Jakarta') on conflict(owner_id) do nothing;
end
$orbit_dev_seed$;
