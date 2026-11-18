-- MIB Acrobatics — attendance (RSVP) for weekly classes, Phase 1.
-- Run after 0003_schedule.sql. Idempotent: safe to run more than once.
--
-- One row = one member's answer for one dated occurrence of a weekly class
-- (schedule_id + session_date). Members write only their own row, only for upcoming dates that
-- fall on the class's weekday; staff (admin/superadmin) read every row.

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule (id) on delete cascade,
  session_date date not null,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('attending', 'absent', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, session_date, user_id)
);

create index if not exists session_attendance_session_idx on public.session_attendance (schedule_id, session_date);
create index if not exists session_attendance_user_idx on public.session_attendance (user_id, session_date);

drop trigger if exists session_attendance_touch_updated_at on public.session_attendance;
create trigger session_attendance_touch_updated_at before update on public.session_attendance
  for each row execute function public.touch_updated_at();

-- True when p_date is today or later (club time, max 8 weeks ahead) and falls on the class's weekday.
create or replace function public.is_upcoming_session(p_schedule_id uuid, p_date date)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.schedule s
    where s.id = p_schedule_id
      and s.day_of_week = extract(isodow from p_date)::int
      and p_date >= (now() at time zone 'Europe/Bucharest')::date
      and p_date <= (now() at time zone 'Europe/Bucharest')::date + 56
  );
$$;
revoke all on function public.is_upcoming_session(uuid, date) from public;
grant execute on function public.is_upcoming_session(uuid, date) to authenticated;

alter table public.session_attendance enable row level security;

revoke all on public.session_attendance from anon, authenticated;
grant select on public.session_attendance to authenticated;
grant insert (schedule_id, session_date, user_id, status) on public.session_attendance to authenticated;
grant update (status) on public.session_attendance to authenticated;

drop policy if exists session_attendance_select on public.session_attendance;
create policy session_attendance_select on public.session_attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists session_attendance_insert_own on public.session_attendance;
create policy session_attendance_insert_own on public.session_attendance
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_upcoming_session(schedule_id, session_date));

drop policy if exists session_attendance_update_own on public.session_attendance;
create policy session_attendance_update_own on public.session_attendance
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_upcoming_session(schedule_id, session_date))
  with check (user_id = (select auth.uid()) and public.is_upcoming_session(schedule_id, session_date));
