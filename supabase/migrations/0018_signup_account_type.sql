-- MIB Acrobatics — "Cine ești?" at sign-up (Părinte / Sportiv) + staff can switch a member between Părinte and Sportiv.
-- Requires 0014_gdpr_consent.sql. Idempotent: safe to run more than once.
-- Părinte is a member account (role 'user') with account_type 'Părinte'; permissions stay those of a member.

create or replace function public.handle_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.users (id, email, full_name, gdpr_accepted_at, account_type)
    values (
      new.id,
      coalesce(new.email, ''),
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120), ''),
      case when new.raw_user_meta_data ->> 'gdpr_accepted' = 'true' then now() end,
      case when new.raw_user_meta_data ->> 'account_type' = 'Părinte' then 'Părinte' else 'Sportiv' end
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.users set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

create or replace function public.admin_set_account_type(target uuid, new_type text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_role public.app_role;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_type not in ('Sportiv', 'Părinte') then
    raise exception 'invalid_type' using errcode = '22023';
  end if;
  select role into target_role from public.users where id = target;
  if target_role is null then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target_role <> 'user' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.users set account_type = new_type where id = target;
end $$;
revoke execute on function public.admin_set_account_type(uuid, text) from public, anon;
grant execute on function public.admin_set_account_type(uuid, text) to authenticated;
