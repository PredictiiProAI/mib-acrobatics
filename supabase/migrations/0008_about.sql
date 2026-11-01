-- MIB Acrobatics — dynamic "Despre Noi": collaborating coaches, gym gallery and the `about_media` bucket.
-- Everyone (visitors included) can read; only admins (admin/superadmin, via is_staff()) can add, edit or delete.
-- Idempotent: safe to run more than once.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  role text not null default 'Antrenor Colaborator' check (char_length(trim(role)) between 1 and 80),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null check (char_length(image_url) between 1 and 500),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_members_order_idx on public.team_members (sort_order, created_at);
create index if not exists gallery_images_order_idx on public.gallery_images (sort_order, created_at);

-- Grants: public read, writes for signed-in users (RLS below narrows them to admins)
alter table public.team_members enable row level security;
alter table public.gallery_images enable row level security;

revoke all on public.team_members, public.gallery_images from anon, authenticated;
grant select on public.team_members, public.gallery_images to anon, authenticated;
grant insert (name, role, image_url, sort_order), update (name, role, image_url, sort_order), delete
  on public.team_members to authenticated;
grant insert (image_url, sort_order), update (image_url, sort_order), delete
  on public.gallery_images to authenticated;

-- RLS: team_members
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to anon, authenticated using (true);

drop policy if exists team_members_insert_admin on public.team_members;
create policy team_members_insert_admin on public.team_members
  for insert to authenticated with check ((select public.is_staff()));

drop policy if exists team_members_update_admin on public.team_members;
create policy team_members_update_admin on public.team_members
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists team_members_delete_admin on public.team_members;
create policy team_members_delete_admin on public.team_members
  for delete to authenticated using ((select public.is_staff()));

-- RLS: gallery_images
drop policy if exists gallery_images_select on public.gallery_images;
create policy gallery_images_select on public.gallery_images
  for select to anon, authenticated using (true);

drop policy if exists gallery_images_insert_admin on public.gallery_images;
create policy gallery_images_insert_admin on public.gallery_images
  for insert to authenticated with check ((select public.is_staff()));

drop policy if exists gallery_images_update_admin on public.gallery_images;
create policy gallery_images_update_admin on public.gallery_images
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists gallery_images_delete_admin on public.gallery_images;
create policy gallery_images_delete_admin on public.gallery_images
  for delete to authenticated using ((select public.is_staff()));

-- Storage: public `about_media` bucket (images up to 10 MB); only admins upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('about_media', 'about_media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists about_media_select on storage.objects;
create policy about_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'about_media' and (select public.is_staff()));

drop policy if exists about_media_insert on storage.objects;
create policy about_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'about_media' and (select public.is_staff()));

drop policy if exists about_media_update on storage.objects;
create policy about_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'about_media' and (select public.is_staff()))
  with check (bucket_id = 'about_media' and (select public.is_staff()));

drop policy if exists about_media_delete on storage.objects;
create policy about_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'about_media' and (select public.is_staff()));
