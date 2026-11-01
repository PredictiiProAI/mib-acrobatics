-- MIB Acrobatics — persistent post comments (expandable section under each AcroFeed post).
-- Re-asserts the comments table, its foreign keys, grants and RLS so every signed-in user can read and add
-- comments, plus the author columns each comment shows (name + avatar).
-- Idempotent: safe to run more than once.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Foreign keys (the app embeds the author through `comments_user_id_fkey`)
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.comments'::regclass and conname = 'comments_post_id_fkey') then
    alter table public.comments add constraint comments_post_id_fkey
      foreign key (post_id) references public.posts (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.comments'::regclass and conname = 'comments_user_id_fkey') then
    alter table public.comments add constraint comments_user_id_fkey
      foreign key (user_id) references public.users (id) on delete cascade;
  end if;
end $$;

create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- Author name + avatar shown on each comment (same definitions as 0005_profile.sql)
alter table public.users add column if not exists display_name text check (display_name is null or char_length(display_name) <= 60);
alter table public.users add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);
grant select (id, role, full_name, display_name, avatar_url) on public.users to anon, authenticated;

-- Every auth user needs a public.users row (comments.user_id references it)
insert into public.users (id, email)
select a.id, coalesce(a.email, '') from auth.users a
where not exists (select 1 from public.users u where u.id = a.id)
on conflict (id) do nothing;

-- Grants
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, user_id, content) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- RLS: every signed-in user reads all comments and adds their own; visitors only see comments on public posts.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated
  using (true);

drop policy if exists comments_select_anon on public.comments;
create policy comments_select_anon on public.comments
  for select to anon
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));

-- Authors delete their own comments, staff can moderate any
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

-- Realtime: new comments appear for everyone with the section open
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
    ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;
