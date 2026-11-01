-- pgTAP structural and RLS presence checks (not executed in this handoff environment).
-- After npx supabase start: npx supabase test db
begin;
select plan(14);
select has_table('public', 'profiles', 'profiles table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select has_table('public', 'branches', 'branches table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.branches'::regclass), 'branches has RLS enabled');
select has_table('public', 'tasks', 'tasks table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks has RLS enabled');
select has_table('public', 'journal_entries', 'journal_entries table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.journal_entries'::regclass), 'journal_entries has RLS enabled');
select has_table('public', 'milestones', 'milestones table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.milestones'::regclass), 'milestones has RLS enabled');
select has_table('public', 'widget_layouts', 'widget_layouts table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.widget_layouts'::regclass), 'widget_layouts has RLS enabled');
select has_table('public', 'preferences', 'preferences table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.preferences'::regclass), 'preferences has RLS enabled');
select * from finish();
rollback;
