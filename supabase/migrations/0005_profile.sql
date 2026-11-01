-- MIB Acrobatics — user profile: display name, discipline, level, avatar (public),
-- phone + notification preferences (private, owner-only), and the `avatars` bucket.
-- Idempotent: safe to run more than once.

alter table public.users add column if not exists display_name text check (display_name is null or char_length(display_name) <= 60);
alter table public.users add column if not exists discipline text check (discipline is null or char_length(discipline) <= 80);
alter table public.users add column if not exists level text check (level is null or level in ('beginner', 'intermediate', 'advanced'));
alter table public.users add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);

grant select (display_name, discipline, level, avatar_url) on public.users to anon, authenticated;
grant update (full_name, display_name, discipline, level, avatar_url) on public.users to authenticated;

-- Private settings: only the owner can read or change them.
create table if not exists public.user_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+?[0-9 ()./-]{6,20}$'),
  notify_feed boolean not null default true,
  notify_schedule boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;

drop policy if exists user_settings_select on public.user_settings;
create policy user_settings_select on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists user_settings_insert on public.user_settings;
create policy user_settings_insert on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists user_settings_update on public.user_settings;
create policy user_settings_update on public.user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Feed shows the display name (falls back to the full name) and the avatar.
create or replace view public.feed_posts
with (security_invoker = true) as
select
  p.id, p.author_id, p.media_url, p.media_type, p.caption, p.created_at, p.is_public,
  coalesce(nullif(u.display_name, ''), u.full_name) as author_name,
  u.role as author_role,
  (select count(*) from public.likes l where l.post_id = p.id)::int as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
  exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = (select auth.uid())) as liked_by_me,
  coalesce((select jsonb_object_agg(r.reaction, r.n) from (select l.reaction, count(*)::int as n from public.likes l where l.post_id = p.id group by l.reaction) r), '{}'::jsonb) as reactions,
  (select l.reaction from public.likes l where l.post_id = p.id and l.user_id = (select auth.uid())) as my_reaction,
  u.avatar_url as author_avatar
from public.posts p
join public.users u on u.id = p.author_id;

grant select on public.feed_posts to anon, authenticated;

-- Avatars: public read, each user writes only inside their own folder (<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
