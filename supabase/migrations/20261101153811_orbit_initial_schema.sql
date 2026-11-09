-- ORBIT production schema proposal, REVISION 1 (prepared offline, not applied).
-- PRESERVE V6 string IDs. Root "root" is virtual; store NULL parent_id in SQL.
-- ALL private tables carry owner_id referencing auth.users; composite FKs prevent cross-owner links.
-- Do not run against an existing production DB without inspection and backup.
-- Supabase CLI migration generation/test still required; see docs/08-SUPABASE-INTEGRATION.md.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'My space' check (char_length(display_name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 90 and id <> 'root'),
  parent_id text null,
  label text not null check (char_length(label) between 1 and 72),
  color text null check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id,id),
  constraint branches_parent_fkey foreign key (owner_id,parent_id)
    references public.branches(owner_id,id) on delete no action deferrable initially deferred,
  constraint branches_no_self_parent check (parent_id is null or parent_id <> id)
);

create table public.tasks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  project_id text not null,
  title text not null check (char_length(title) between 1 and 180),
  due_date date null,
  urgency smallint not null default 1 check (urgency between 1 and 5),
  effort_minutes integer not null default 0 check (effort_minutes between 0 and 1440),
  status text not null default 'captured' check (status in
    ('captured','needs_clarity','ready','scheduled','in_progress','waiting','completed','parked')),
  criteria text not null default '' check (char_length(criteria) <= 1200),
  description text not null default '' check (char_length(description) <= 3000),
  resource_url text null check (resource_url is null or (char_length(resource_url) <= 600 and resource_url ~* '^https?://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  primary key (owner_id,id),
  constraint tasks_branch_fkey foreign key (owner_id,project_id)
    references public.branches(owner_id,id) on delete no action deferrable initially deferred
);

create table public.journal_entries (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  entry_date date not null,
  title text not null default '' check (char_length(title) <= 120),
  body_html text not null default '' check (char_length(body_html) <= 80000),
  format_version smallint not null default 1 check (format_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id,id)
);

create table public.milestones (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  title text not null check (char_length(title) between 1 and 110),
  marker_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id,id)
);

create table public.widget_layouts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  widget_key text not null check(widget_key in ('timeline','constellation','active','completed','space','journal')),
  x numeric(12,2) not null check(x between -5000 and 7500),
  y numeric(12,2) not null check(y between -5000 and 7500),
  width integer null check(width between 200 and 4000),
  height integer null check(height between 200 and 4000),
  updated_at timestamptz not null default now(),
  primary key (owner_id, widget_key),
  constraint layout_size_pair check ((width is null and height is null) or (width is not null and height is not null))
);

create table public.preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  color_mode text not null default 'deadline' check(color_mode in ('deadline','urgency')),
  timezone text not null default 'Asia/Jakarta' check(char_length(timezone) between 1 and 80),
  updated_at timestamptz not null default now()
);

-- RLS filtering always leads with owner_id. Indexes support real existing UI queries.
create index branches_owner_parent_idx on public.branches(owner_id,parent_id);
create index tasks_owner_due_idx on public.tasks(owner_id,due_date) where due_date is not null;
create index tasks_owner_status_due_idx on public.tasks(owner_id,status,due_date);
create index tasks_owner_project_idx on public.tasks(owner_id,project_id);
create index journal_owner_date_idx on public.journal_entries(owner_id,entry_date desc);
create index milestones_owner_date_idx on public.milestones(owner_id,marker_date);

-- Keep server updated_at authoritative. Functions are SECURITY INVOKER by default.
create function public.orbit_touch_updated_at() returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger touch_profiles_updated before update on public.profiles
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_branches_updated before update on public.branches
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_tasks_updated before update on public.tasks
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_journal_entries_updated before update on public.journal_entries
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_milestones_updated before update on public.milestones
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_widget_layouts_updated before update on public.widget_layouts
  for each row execute function public.orbit_touch_updated_at();
create trigger touch_preferences_updated before update on public.preferences
  for each row execute function public.orbit_touch_updated_at();

-- Guard against moving a branch into a descendant. Root uses NULL parent_id.
create function public.orbit_reject_branch_cycle() returns trigger language plpgsql
set search_path = '' as $$
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'Branch cannot be its own parent'; end if;
  if exists (
    with recursive ancestor_chain as (
      select b.id, b.parent_id, array[b.id] as visited
      from public.branches b where b.owner_id = new.owner_id and b.id = new.parent_id
      union all
      select b.id, b.parent_id, a.visited || b.id
      from public.branches b
      join ancestor_chain a on a.parent_id = b.id
      where b.owner_id = new.owner_id and not b.id = any(a.visited)
    )
    select 1 from ancestor_chain where id = new.id
  ) then raise exception 'A branch cannot move inside its descendants'; end if;
  return new;
end;
$$;
create trigger reject_branch_cycle before insert or update of parent_id on public.branches
  for each row execute function public.orbit_reject_branch_cycle();

-- No public read/write grants. Data API access for signed-in user is gated by RLS.
alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon;
grant select, insert, update, delete on table public.profiles to authenticated;
alter table public.branches enable row level security;
revoke all on table public.branches from public, anon;
grant select, insert, update, delete on table public.branches to authenticated;
alter table public.tasks enable row level security;
revoke all on table public.tasks from public, anon;
grant select, insert, update, delete on table public.tasks to authenticated;
alter table public.journal_entries enable row level security;
revoke all on table public.journal_entries from public, anon;
grant select, insert, update, delete on table public.journal_entries to authenticated;
alter table public.milestones enable row level security;
revoke all on table public.milestones from public, anon;
grant select, insert, update, delete on table public.milestones to authenticated;
alter table public.widget_layouts enable row level security;
revoke all on table public.widget_layouts from public, anon;
grant select, insert, update, delete on table public.widget_layouts to authenticated;
alter table public.preferences enable row level security;
revoke all on table public.preferences from public, anon;
grant select, insert, update, delete on table public.preferences to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "branches_select_own" on public.branches for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "branches_insert_own" on public.branches for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "branches_update_own" on public.branches for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "branches_delete_own" on public.branches for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "tasks_select_own" on public.tasks for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "tasks_insert_own" on public.tasks for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "tasks_delete_own" on public.tasks for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "journal_entries_select_own" on public.journal_entries for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "journal_entries_insert_own" on public.journal_entries for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "journal_entries_update_own" on public.journal_entries for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "journal_entries_delete_own" on public.journal_entries for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "milestones_select_own" on public.milestones for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "milestones_insert_own" on public.milestones for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "milestones_update_own" on public.milestones for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "milestones_delete_own" on public.milestones for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "widget_layouts_select_own" on public.widget_layouts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "widget_layouts_insert_own" on public.widget_layouts for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "widget_layouts_update_own" on public.widget_layouts for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "widget_layouts_delete_own" on public.widget_layouts for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "preferences_select_own" on public.preferences for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "preferences_insert_own" on public.preferences for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "preferences_update_own" on public.preferences for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "preferences_delete_own" on public.preferences for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Non-authenticated users: no table grants and no matching policy.
-- Note: Storage not provisioned; V6 only stores external resource URLs, not uploads.
-- For multi-user collaboration in the future, add separate reviewed membership roles/policies.
