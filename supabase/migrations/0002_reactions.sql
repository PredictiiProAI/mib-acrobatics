-- MIB Acrobatics — emoji reactions on posts and comments.
-- Run after 0001_init.sql. Idempotent: safe to run more than once.
--
-- Posts: the existing `likes` table becomes the post-reaction table (one reaction per user per post,
-- changeable, Messenger-style). Existing likes become ❤️ ('love').
-- Comments: new `comment_reactions` table with the same rules.
-- Reaction keys: like 👍, love ❤️, fire 🔥, clap 👏, acro 🤸.

-- ---------------------------------------------------------------------------
-- Post reactions (public.likes)
-- ---------------------------------------------------------------------------
alter table public.likes add column if not exists reaction text not null default 'love';

alter table public.likes drop constraint if exists likes_reaction_check;
alter table public.likes add constraint likes_reaction_check
  check (reaction in ('like', 'love', 'fire', 'clap', 'acro'));

grant insert (post_id, user_id, reaction) on public.likes to authenticated;
grant update (reaction) on public.likes to authenticated;

drop policy if exists likes_update_own on public.likes;
create policy likes_update_own on public.likes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Comment reactions
-- ---------------------------------------------------------------------------
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'fire', 'clap', 'acro')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists comment_reactions_user_idx on public.comment_reactions (user_id);

-- Full old row on DELETE so realtime listeners know which comment changed.
alter table public.comment_reactions replica identity full;

alter table public.comment_reactions enable row level security;

revoke all on public.comment_reactions from anon, authenticated;
grant select on public.comment_reactions to anon, authenticated;
grant insert (comment_id, user_id, reaction) on public.comment_reactions to authenticated;
grant update (reaction) on public.comment_reactions to authenticated;
grant delete on public.comment_reactions to authenticated;

-- Visible when the comment is visible (the subquery runs under comments -> posts RLS).
drop policy if exists comment_reactions_select on public.comment_reactions;
create policy comment_reactions_select on public.comment_reactions
  for select to anon, authenticated
  using (exists (select 1 from public.comments c where c.id = comment_id));

drop policy if exists comment_reactions_insert_own on public.comment_reactions;
create policy comment_reactions_insert_own on public.comment_reactions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.comments c where c.id = comment_id));

drop policy if exists comment_reactions_update_own on public.comment_reactions;
create policy comment_reactions_update_own on public.comment_reactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists comment_reactions_delete_own on public.comment_reactions;
create policy comment_reactions_delete_own on public.comment_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Feed view: add per-emoji counts and the viewer's own reaction
-- (new columns are appended, existing ones unchanged)
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
  exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
  coalesce(
    (select jsonb_object_agg(r.reaction, r.n)
       from (select l.reaction, count(*)::int as n from public.likes l where l.post_id = p.id group by l.reaction) r),
    '{}'::jsonb
  ) as reactions,
  (select l.reaction from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as my_reaction
from public.posts p
join public.users u on u.id = p.author_id;

revoke all on public.feed_posts from anon, authenticated;
grant select on public.feed_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment_reactions'
    ) then
    alter publication supabase_realtime add table public.comment_reactions;
  end if;
end $$;
