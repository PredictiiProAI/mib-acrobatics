-- MIB Acrobatics — liability waiver (Declarație pe proprie răspundere / Acord de participare).
-- Requires 0010_users_crm.sql and 0013_profile_details.sql. Idempotent: safe to run more than once.
-- Users cannot write these columns directly; public.sign_waiver(name) stamps them with the server time.

alter table public.users add column if not exists waiver_signed boolean not null default false;
alter table public.users add column if not exists waiver_signed_at timestamptz;
alter table public.users add column if not exists waiver_signed_by_name text;
alter table public.users drop constraint if exists users_waiver_signed_by_name_check;
alter table public.users add constraint users_waiver_signed_by_name_check
  check (waiver_signed_by_name is null or char_length(waiver_signed_by_name) between 3 and 120);

drop function if exists public.sign_waiver(text);
create function public.sign_waiver(p_name text)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 120);
  v_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(v_name) < 3 or position(' ' in v_name) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  update public.users
     set waiver_signed = true, waiver_signed_at = now(), waiver_signed_by_name = v_name
   where id = (select auth.uid()) and not waiver_signed
  returning waiver_signed_at into v_at;
  if v_at is null then
    raise exception 'already_signed' using errcode = '23505';
  end if;
  return v_at;
end $$;
revoke execute on function public.sign_waiver(text) from public, anon;
grant execute on function public.sign_waiver(text) to authenticated;

drop function if exists public.profile_details(uuid);
create function public.profile_details(p_user uuid)
returns table (
  account_type text,
  children_names text,
  emergency_contact text,
  birthdate date,
  social_link text,
  waiver_signed boolean,
  waiver_signed_at timestamptz,
  waiver_signed_by_name text
)
language sql stable security definer set search_path = ''
as $$
  select u.account_type, u.children_names, u.emergency_contact, u.birthdate, u.social_link,
         u.waiver_signed, u.waiver_signed_at, u.waiver_signed_by_name
  from public.users u
  where u.id = p_user and (p_user = (select auth.uid()) or public.is_staff());
$$;
revoke execute on function public.profile_details(uuid) from public, anon;
grant execute on function public.profile_details(uuid) to authenticated;

drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role public.app_role,
  full_name text,
  display_name text,
  avatar_url text,
  discipline text,
  level text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  account_type text,
  children_names text,
  emergency_contact text,
  birthdate date,
  waiver_signed boolean,
  waiver_signed_at timestamptz,
  waiver_signed_by_name text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, u.email, u.role, u.full_name, u.display_name, u.avatar_url, u.discipline, u.level,
           s.phone, u.created_at, a.last_sign_in_at,
           u.account_type, u.children_names, u.emergency_contact, u.birthdate,
           u.waiver_signed, u.waiver_signed_at, u.waiver_signed_by_name
    from public.users u
    left join auth.users a on a.id = u.id
    left join public.user_settings s on s.user_id = u.id
    order by u.created_at desc;
end $$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
