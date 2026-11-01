-- MIB Acrobatics — GDPR proof of consent at sign-up.
-- Requires 0001_init.sql. Idempotent: safe to run more than once.
-- The sign-up form sends user metadata gdpr_accepted = true; the trigger stores the server timestamp.

alter table public.users add column if not exists gdpr_accepted_at timestamptz;

create or replace function public.handle_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.users (id, email, full_name, gdpr_accepted_at)
    values (
      new.id,
      coalesce(new.email, ''),
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120), ''),
      case when new.raw_user_meta_data ->> 'gdpr_accepted' = 'true' then now() end
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.users set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;
