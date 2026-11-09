-- MIB Acrobatics — several reactions per user on the same post or comment (e.g. ❤️ and 🔥 together).
-- Requires 0002_reactions.sql and 0005_profile.sql. Idempotent: safe to run more than once.
-- One row per (target, user, reaction) instead of one row per (target, user).

do $$
declare c record;
begin
  -- Drop the old "one reaction per user" unique constraints, whatever their name.
  for c in
    select con.conrelid::regclass as tbl, con.conname
    from pg_constraint con
    where con.contype = 'u'
      and con.conrelid in ('public.likes'::regclass, 'public.comment_reactions'::regclass)
      and array_length(con.conkey, 1) = 2
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'likes_post_user_reaction_key') then
    alter table public.likes add constraint likes_post_user_reaction_key unique (post_id, user_id, reaction);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comment_reactions_comment_user_reaction_key') then
    alter table public.comment_reactions add constraint comment_reactions_comment_user_reaction_key unique (comment_id, user_id, reaction);
  end if;
end $$;

-- Feed view: my_reaction keeps the latest one (older app versions), my_reactions lists all of the viewer's reactions.
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
  (select l.reaction from public.likes l where l.post_id = p.id and l.user_id = (select auth.uid()) order by l.created_at desc limit 1) as my_reaction,
  u.avatar_url as author_avatar,
  array(select l.reaction from public.likes l where l.post_id = p.id and l.user_id = (select auth.uid()) order by l.created_at) as my_reactions
from public.posts p
join public.users u on u.id = p.author_id;

grant select on public.feed_posts to anon, authenticated;
