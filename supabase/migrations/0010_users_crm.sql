-- MIB Acrobatics — user CRM: staff user list with profile details and last sign-in.
-- Requires 0005_profile.sql. Idempotent: safe to run more than once.

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
  last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, u.email, u.role, u.full_name, u.display_name, u.avatar_url, u.discipline, u.level,
           s.phone, u.created_at, a.last_sign_in_at
    from public.users u
    left join auth.users a on a.id = u.id
    left join public.user_settings s on s.user_id = u.id
    order by u.created_at desc;
end $$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
