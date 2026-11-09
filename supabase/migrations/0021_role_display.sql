-- MIB Acrobatics — per-account role label: a Super Admin can be shown publicly as "Antrenor"
-- while keeping all superadmin rights. Requires 0020_multi_reactions.sql. Idempotent.
-- Members cannot change this flag themselves (no column grant); set it from the SQL Editor:
--   update public.users set shown_as_coach = true where email = 'coach@example.com';

alter table public.users add column if not exists shown_as_coach boolean not null default false;
grant select (shown_as_coach) on public.users to anon, authenticated;

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
  array(select l.reaction from public.likes l where l.post_id = p.id and l.user_id = (select auth.uid()) order by l.created_at) as my_reactions,
  u.shown_as_coach as author_shown_as_coach
from public.posts p
join public.users u on u.id = p.author_id;

grant select on public.feed_posts to anon, authenticated;
