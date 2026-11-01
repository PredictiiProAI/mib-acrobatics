-- MIB Acrobatics — repair post likes/reactions permissions.
-- Re-asserts the likes table, grants and RLS the heart button needs (0001 + 0002), in case a step was skipped
-- on the live DB. The feed_posts view itself is defined in 0005_profile.sql (run that one too if it is missing).
-- Idempotent: safe to run more than once.

-- Reaction column (from 0002_reactions.sql)
alter table public.likes add column if not exists reaction text not null default 'love';
alter table public.likes drop constraint if exists likes_reaction_check;
alter table public.likes add constraint likes_reaction_check
  check (reaction in ('like', 'love', 'fire', 'clap', 'acro'));

-- One like per user per post
do $$ begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.likes'::regclass and contype = 'u'
  ) then
    alter table public.likes add constraint likes_post_id_user_id_key unique (post_id, user_id);
  end if;
end $$;

-- Every auth user needs a public.users row (likes.user_id references it)
insert into public.users (id, email)
select a.id, coalesce(a.email, '') from auth.users a
where not exists (select 1 from public.users u where u.id = a.id)
on conflict (id) do nothing;

-- Grants
alter table public.likes enable row level security;
revoke all on public.likes from anon, authenticated;
grant select on public.likes to anon, authenticated;
grant insert (post_id, user_id, reaction) on public.likes to authenticated;
grant update (reaction) on public.likes to authenticated;
grant delete on public.likes to authenticated;

-- RLS: everyone sees likes of visible posts; authenticated users manage only their own
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists likes_update_own on public.likes;
create policy likes_update_own on public.likes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'likes'
    ) then
    alter publication supabase_realtime add table public.likes;
  end if;
end $$;
