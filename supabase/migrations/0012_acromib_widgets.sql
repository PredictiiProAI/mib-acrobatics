-- MIB Acrobatics — AcroMib widgets: pinned announcement + up to 3 quick links on app_settings.
-- Requires 0011_app_settings.sql. Idempotent: safe to run more than once.

alter table public.app_settings add column if not exists announcement_enabled boolean not null default false;
alter table public.app_settings add column if not exists announcement_text text
  check (announcement_text is null or char_length(announcement_text) <= 300);
alter table public.app_settings add column if not exists announcement_tone text not null default 'important';
alter table public.app_settings drop constraint if exists app_settings_announcement_tone_check;
alter table public.app_settings add constraint app_settings_announcement_tone_check
  check (announcement_tone in ('important', 'success', 'urgent', 'info'));
alter table public.app_settings add column if not exists quick_links jsonb not null default '[]'::jsonb;
alter table public.app_settings drop constraint if exists app_settings_quick_links_check;
alter table public.app_settings add constraint app_settings_quick_links_check
  check (jsonb_typeof(quick_links) = 'array' and jsonb_array_length(quick_links) <= 3);

grant update (announcement_enabled, announcement_text, announcement_tone, quick_links) on public.app_settings to authenticated;

-- Display rename AcroFeed -> AcroMib in the stored hero message.
update public.app_settings set acrofeed_hero_text = replace(acrofeed_hero_text, 'AcroFeed', 'AcroMib')
where acrofeed_hero_text like '%AcroFeed%';
