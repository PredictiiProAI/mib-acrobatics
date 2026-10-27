-- MIB Acrobatics — lets "Am uitat parola" tell the user when an email has no account.
-- Note: this deliberately allows checking whether an email is registered (requested by the club).
-- Idempotent: safe to run more than once.
create or replace function public.email_registered(p_email text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)));
$$;

revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;
