-- M3 least privilege: remove only the three unnecessary direct table grants
-- confirmed by the owner's read-only hosted audit. No data, policy, trigger,
-- function, default-privilege, CRUD or service-role changes. Review before live use.
begin;
revoke truncate, trigger, references on table
  public.profiles, public.branches, public.tasks, public.journal_entries,
  public.milestones, public.widget_layouts, public.preferences
from authenticated;

-- Fail atomically if inherited/PUBLIC/column privileges or deployment drift need
-- a wider review. Do not silently revoke privileges from unrelated roles/objects.
do $$
declare t text; p text;
begin
  foreach t in array array['profiles','branches','tasks','journal_entries','milestones','widget_layouts','preferences'] loop
    foreach p in array array['TRUNCATE','TRIGGER','REFERENCES'] loop
      if has_table_privilege('authenticated',format('public.%I',t),p) then
        raise exception 'Least-privilege postcheck failed: effective % remains on %',p,t;
      end if;
    end loop;
    if has_any_column_privilege('authenticated',format('public.%I',t),'REFERENCES') then
      raise exception 'Least-privilege postcheck failed: column REFERENCES remains on %',t;
    end if;
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if not has_table_privilege('authenticated',format('public.%I',t),p) then
        raise exception 'Least-privilege postcheck failed: existing CRUD % missing on %',p,t;
      end if;
    end loop;
  end loop;
end;
$$;
commit;
