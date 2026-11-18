-- MIB Acrobatics — push notifications (Firebase Cloud Messaging) for web/PWA and the Android app.
-- Run after 0023_attendance.sql. Idempotent: safe to run more than once.
--
-- push_tokens: one row per device token. Members register/unregister only through the RPCs below,
-- so a device that changes account moves to the new owner. The server reads tokens with the service role.

create table if not exists public.push_tokens (
  token text primary key check (char_length(token) between 10 and 4096),
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_platform not in ('web', 'android', 'ios') then raise exception 'invalid platform'; end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public;
revoke all on function public.unregister_push_token(text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- One row per class occurrence already reminded, so the 1-hour reminder is sent once.
create table if not exists public.push_reminders_sent (
  schedule_id uuid not null references public.schedule (id) on delete cascade,
  session_date date not null,
  sent_at timestamptz not null default now(),
  primary key (schedule_id, session_date)
);
alter table public.push_reminders_sent enable row level security;
revoke all on public.push_reminders_sent from anon, authenticated;
