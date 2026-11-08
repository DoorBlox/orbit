-- ORBIT 2.2 private media; opt-in after reviewed tenant isolation and backup.
-- All image objects live in <auth.uid()>/<uuid>.<png|jpg|webp>.
-- No public bucket, service-role keys in browser, or anon grants.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('orbit-private-media','orbit-private-media',false,5242880,
  array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do nothing;

-- Fail closed if a previous bucket of this name exists with unsafe settings.
do $$
begin
  if not exists(
    select 1 from storage.buckets
    where id='orbit-private-media' and public=false
      and file_size_limit=5242880
      and allowed_mime_types @> array['image/png','image/jpeg','image/webp']::text[]
  ) then raise exception 'Private media bucket configuration mismatch'; end if;
end;
$$;

-- Storage objects inherit the already-isolated auth user; no globally
-- accessible URL or account-wide listing is granted.
create policy orbit_media_owner_select on storage.objects
  for select to authenticated
  using (bucket_id='orbit-private-media'
    and split_part(name,'/',1)=(select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.(png|jpg|webp)$');
create policy orbit_media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id='orbit-private-media'
    and split_part(name,'/',1)=(select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.(png|jpg|webp)$');
-- Deliberately omit UPDATE/upsert: image replacement gets a new object path.
-- Deletions require a separate reviewed garbage-collection policy.
commit;
