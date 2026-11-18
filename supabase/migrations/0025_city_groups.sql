-- MIB Acrobatics — city/locality and group/school assignment per member, set only by staff.
-- Push notifications for a class go only to members of that group (and city), plus anyone who RSVP'd.
-- Run after 0024_push.sql. Idempotent: safe to run more than once.

alter table public.users add column if not exists city text;
alter table public.users drop constraint if exists users_city_check;
alter table public.users add constraint users_city_check check (city is null or char_length(city) between 1 and 80);
alter table public.users add column if not exists groups text[] not null default '{}';
alter table public.users drop constraint if exists users_groups_check;
alter table public.users add constraint users_groups_check check (cardinality(groups) <= 30);
create index if not exists users_groups_idx on public.users using gin (groups);
-- No column grants for city/groups: members can't read others' or change their own; only the functions below.

alter table public.schedule add column if not exists city text;
alter table public.schedule drop constraint if exists schedule_city_check;
alter table public.schedule add constraint schedule_city_check check (city is null or char_length(city) between 1 and 80);
grant insert (city) on public.schedule to authenticated;
grant update (city) on public.schedule to authenticated;

-- Own assignment (shown read-only in /profil); staff may read anyone's.
create or replace function public.user_assignment(p_user uuid)
returns table (city text, groups text[])
language sql stable security definer set search_path = '' as $$
  select u.city, u.groups from public.users u
  where u.id = p_user and (p_user = (select auth.uid()) or public.is_staff());
$$;
revoke execute on function public.user_assignment(uuid) from public, anon;
grant execute on function public.user_assignment(uuid) to authenticated;

-- Staff list of every member's city and groups (/dashboard/users).
create or replace function public.admin_user_assignments()
returns table (id uuid, city text, groups text[])
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select u.id, u.city, u.groups from public.users u;
end $$;
revoke execute on function public.admin_user_assignments() from public, anon;
grant execute on function public.admin_user_assignments() to authenticated;

-- Staff only: set a member's city and groups.
create or replace function public.admin_set_user_assignment(target uuid, p_city text, p_groups text[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  clean_city text := nullif(left(trim(coalesce(p_city, '')), 80), '');
  clean_groups text[];
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct left(trim(g), 80)), '{}') into clean_groups
  from unnest(coalesce(p_groups, '{}')) g where trim(g) <> '';
  if cardinality(clean_groups) > 30 then
    raise exception 'too many groups' using errcode = '22023';
  end if;
  update public.users set city = clean_city, groups = clean_groups where id = target;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
end $$;
revoke execute on function public.admin_set_user_assignment(uuid, text, text[]) from public, anon;
grant execute on function public.admin_set_user_assignment(uuid, text, text[]) to authenticated;

-- Staff only: keep members' groups in sync when a group is renamed in /dashboard/schedule.
create or replace function public.admin_rename_group(p_old text, p_new text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_old is null or p_new is null or trim(p_new) = '' or p_old = p_new then
    return;
  end if;
  update public.users
  set groups = (select coalesce(array_agg(distinct case when g = p_old then left(trim(p_new), 80) else g end), '{}') from unnest(groups) g)
  where p_old = any(groups);
end $$;
revoke execute on function public.admin_rename_group(text, text) from public, anon;
grant execute on function public.admin_rename_group(text, text) to authenticated;
