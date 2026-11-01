-- MIB Acrobatics — single-row app settings (AcroFeed "Message of the Day").
-- Idempotent: safe to run more than once.

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  acrofeed_hero_text text not null check (char_length(acrofeed_hero_text) between 1 and 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id) on delete set null
);

insert into public.app_settings (id, acrofeed_hero_text)
values (true, 'Bine ai aterizat pe AcroFeed! Aici e locul unde gravitația e doar o sugestie. Vezi cele mai tari scheme, fețele de concentrare și distracția de la antrenamente. Dă un double-tap la ce-ți place!')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant update (acrofeed_hero_text, updated_at, updated_by) on public.app_settings to authenticated;

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_update_staff on public.app_settings;
create policy app_settings_update_staff on public.app_settings
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
