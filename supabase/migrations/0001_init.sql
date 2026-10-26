-- MIB Acrobatics — initial schema, RLS and Storage.
-- Run once in the Supabase SQL Editor. Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('superadmin', 'admin', 'media', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_type as enum ('video', 'image');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Users (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.app_role not null default 'user',
  full_name text check (full_name is null or char_length(full_name) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users (role);

-- Role helpers. SECURITY DEFINER so they can be used inside RLS policies
-- without recursing into the users policies.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('admin', 'superadmin'), false) $$;

create or replace function public.can_publish()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('media', 'admin', 'superadmin'), false) $$;

revoke execute on function public.current_app_role(), public.is_staff(), public.can_publish() from public;
grant execute on function public.current_app_role(), public.is_staff(), public.can_publish() to anon, authenticated;

-- Create the public.users row on sign-up and keep the email in sync.
create or replace function public.handle_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.users (id, email, full_name)
    values (
      new.id,
      coalesce(new.email, ''),
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120), '')
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.users set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_auth_user();

-- Backfill accounts that existed before this migration.
insert into public.users (id, email, full_name)
select u.id, coalesce(u.email, ''), nullif(left(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 120), '')
from auth.users u
on conflict (id) do nothing;

alter table public.users enable row level security;

-- Email is private: clients can read only public columns. Staff get emails
-- through admin_list_users(); everyone gets their own via the auth session.
revoke all on public.users from anon, authenticated;
grant select (id, role, full_name, created_at) on public.users to anon, authenticated;
grant update (full_name) on public.users to authenticated;

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to anon, authenticated using (true);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Staff-only user list with emails.
create or replace function public.admin_list_users()
returns table (id uuid, email text, role public.app_role, full_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, u.email, u.role, u.full_name, u.created_at
    from public.users u
    order by u.created_at desc;
end $$;

-- Role changes. superadmin: any role. admin: only 'user' <-> 'media' on
-- non-staff accounts. Nobody changes their own role.
create or replace function public.admin_set_role(target uuid, new_role public.app_role)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me public.app_role := public.current_app_role();
  target_role public.app_role;
begin
  select role into target_role from public.users where id = target;
  if target_role is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target = auth.uid() then
    raise exception 'cannot change your own role' using errcode = '42501';
  end if;
  if me = 'superadmin' then
    null;
  elsif me = 'admin' and target_role in ('user', 'media') and new_role in ('user', 'media') then
    null;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.users set role = new_role where id = target;
end $$;

revoke execute on function public.admin_list_users(), public.admin_set_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_role(uuid, public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users (id) on delete cascade,
  media_url text not null check (char_length(media_url) <= 2048),
  media_type public.media_type not null,
  caption text check (caption is null or char_length(caption) <= 2200),
  created_at timestamptz not null default now()
);

-- Object path inside the mib_media bucket, used to delete the file with the post.
alter table public.posts add column if not exists storage_path text;
-- Public posts are visible without an account (landing page).
alter table public.posts add column if not exists is_public boolean not null default true;

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, media_url, media_type, caption, storage_path, is_public) on public.posts to authenticated;
grant update (caption, is_public) on public.posts to authenticated;
grant delete on public.posts to authenticated;

drop policy if exists posts_select_public on public.posts;
create policy posts_select_public on public.posts
  for select to anon using (is_public);

drop policy if exists posts_select_auth on public.posts;
create policy posts_select_auth on public.posts
  for select to authenticated using (true);

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.can_publish())
    and (storage_path is null or storage_path like (select auth.uid())::text || '/%')
  );

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()) and (select public.can_publish()))
  with check (author_id = (select auth.uid()));

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts
  for delete to authenticated
  using ((author_id = (select auth.uid()) and (select public.can_publish())) or (select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Likes
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists likes_user_idx on public.likes (user_id);

alter table public.likes enable row level security;

revoke all on public.likes from anon, authenticated;
grant select on public.likes to anon, authenticated;
grant insert (post_id, user_id) on public.likes to authenticated;
grant delete on public.likes to authenticated;

-- Visible when the post is visible (the subquery runs under posts RLS).
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, user_id, content) on public.comments to authenticated;
grant delete on public.comments to authenticated;

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Direct messages (users <-> coach)
-- ---------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

alter table public.direct_messages add column if not exists read_at timestamptz;

create index if not exists dm_sender_idx on public.direct_messages (sender_id, created_at desc);
create index if not exists dm_receiver_idx on public.direct_messages (receiver_id, created_at desc);

alter table public.direct_messages enable row level security;

revoke all on public.direct_messages from anon, authenticated;
grant select on public.direct_messages to authenticated;
grant insert (sender_id, receiver_id, content) on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;
grant delete on public.direct_messages to authenticated;

-- Participants see their thread; staff (the coach) see every conversation.
drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()) or (select public.is_staff()));

-- Non-staff may only write to a coach (admin/superadmin); staff may write to anyone.
drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (select public.is_staff())
      or exists (select 1 from public.users u where u.id = receiver_id and u.role in ('admin', 'superadmin'))
    )
  );

-- Only the receiver marks a message as read.
drop policy if exists dm_mark_read on public.direct_messages;
create policy dm_mark_read on public.direct_messages
  for update to authenticated
  using (receiver_id = (select auth.uid()))
  with check (receiver_id = (select auth.uid()));

drop policy if exists dm_delete_staff on public.direct_messages;
create policy dm_delete_staff on public.direct_messages
  for delete to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Feed view with counters (runs with the caller's RLS)
-- ---------------------------------------------------------------------------
create or replace view public.feed_posts
with (security_invoker = true)
as
select
  p.id, p.author_id, p.media_url, p.media_type, p.caption, p.created_at, p.is_public,
  u.full_name as author_name,
  u.role as author_role,
  (select count(*) from public.likes l where l.post_id = p.id)::int as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
  exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me
from public.posts p
join public.users u on u.id = p.author_id;

revoke all on public.feed_posts from anon, authenticated;
grant select on public.feed_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (chat, likes, comments)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['direct_messages', 'likes', 'comments'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: mib_media bucket
-- Public read (landing page + feed). Files live under "<user id>/...".
-- 50 MB is the Supabase Free plan cap; raise it (Pro: up to 500 GB) under
-- Storage > Settings and here if you need longer videos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mib_media', 'mib_media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mib_media_select on storage.objects;
create policy mib_media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mib_media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff()))
  );

drop policy if exists mib_media_insert on storage.objects;
create policy mib_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mib_media'
    and (select public.can_publish())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists mib_media_update on storage.objects;
create policy mib_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'mib_media'
    and (select public.can_publish())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'mib_media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists mib_media_delete on storage.objects;
create policy mib_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mib_media'
    and (((storage.foldername(name))[1] = (select auth.uid())::text and (select public.can_publish())) or (select public.is_staff()))
  );

-- ---------------------------------------------------------------------------
-- Bootstrap roles (run after Marius and Claudiu have signed up):
--   update public.users set role = 'superadmin' where email = 'you@example.com';
--   update public.users set role = 'admin'      where email = 'marius@example.com';
--   update public.users set role = 'media'      where email = 'claudiu@example.com';
-- ---------------------------------------------------------------------------
