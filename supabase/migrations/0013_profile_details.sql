-- MIB Acrobatics — profile details: account type, children (parents), emergency contact, birthdate, social link.
-- Requires 0005_profile.sql. Idempotent: safe to run more than once.
-- Sensitive columns are NOT readable through the public users column grants;
-- read them with public.profile_details(uid) (own row, or any row for staff).

alter table public.users add column if not exists account_type text not null default 'Sportiv';
alter table public.users drop constraint if exists users_account_type_check;
alter table public.users add constraint users_account_type_check check (account_type in ('Sportiv', 'Părinte', 'Antrenor'));
alter table public.users add column if not exists children_names text;
alter table public.users drop constraint if exists users_children_names_check;
alter table public.users add constraint users_children_names_check check (children_names is null or char_length(children_names) <= 300);
alter table public.users add column if not exists emergency_contact text;
alter table public.users drop constraint if exists users_emergency_contact_check;
alter table public.users add constraint users_emergency_contact_check check (emergency_contact is null or char_length(emergency_contact) <= 200);
alter table public.users add column if not exists birthdate date;
alter table public.users drop constraint if exists users_birthdate_check;
alter table public.users add constraint users_birthdate_check check (birthdate is null or birthdate >= date '1900-01-01');
alter table public.users add column if not exists social_link text;
alter table public.users drop constraint if exists users_social_link_check;
alter table public.users add constraint users_social_link_check check (social_link is null or char_length(social_link) <= 200);

grant select (account_type) on public.users to anon, authenticated;
grant update (account_type, children_names, emergency_contact, birthdate, social_link) on public.users to authenticated;

drop function if exists public.profile_details(uuid);
create function public.profile_details(p_user uuid)
returns table (
  account_type text,
  children_names text,
  emergency_contact text,
  birthdate date,
  social_link text
)
language sql stable security definer set search_path = ''
as $$
  select u.account_type, u.children_names, u.emergency_contact, u.birthdate, u.social_link
  from public.users u
  where u.id = p_user and (p_user = (select auth.uid()) or public.is_staff());
$$;
revoke execute on function public.profile_details(uuid) from public, anon;
grant execute on function public.profile_details(uuid) to authenticated;
