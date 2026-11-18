-- MIB Acrobatics — push notifications for private messages: per-member on/off switch in /profil.
-- Idempotent: safe to run more than once.
alter table public.user_settings add column if not exists notify_messages boolean not null default true;
