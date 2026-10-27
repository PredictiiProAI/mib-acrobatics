-- MIB Acrobatics — weekly training schedule managed from the dashboard ("Program & Grupe").
-- Run after 0001_init.sql and 0002_reactions.sql. Idempotent: safe to run more than once.
--
-- One row = one weekly class. Rows with the same group_name are shown together as one group card.
-- day_of_week: 1 = Luni … 7 = Duminică (ISO).

create table if not exists public.schedule (
  id uuid primary key default gen_random_uuid(),
  group_name text not null check (char_length(trim(group_name)) between 1 and 80),
  age_range text check (age_range is null or char_length(age_range) <= 40),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  level text not null default 'all' check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  badge_color text not null default 'violet' check (badge_color in ('violet', 'fuchsia', 'sky', 'emerald', 'amber', 'rose')),
  notes text check (notes is null or char_length(notes) <= 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists schedule_order_idx on public.schedule (sort_order, day_of_week, start_time);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists schedule_touch_updated_at on public.schedule;
create trigger schedule_touch_updated_at before update on public.schedule
  for each row execute function public.touch_updated_at();

alter table public.schedule enable row level security;

revoke all on public.schedule from anon, authenticated;
grant select on public.schedule to anon, authenticated;
grant insert (group_name, age_range, day_of_week, start_time, end_time, level, badge_color, notes, sort_order)
  on public.schedule to authenticated;
grant update (group_name, age_range, day_of_week, start_time, end_time, level, badge_color, notes, sort_order)
  on public.schedule to authenticated;
grant delete on public.schedule to authenticated;

-- Public read; only admin/superadmin can write.
drop policy if exists schedule_select on public.schedule;
create policy schedule_select on public.schedule
  for select to anon, authenticated
  using (true);

drop policy if exists schedule_insert_staff on public.schedule;
create policy schedule_insert_staff on public.schedule
  for insert to authenticated
  with check ((select public.is_staff()));

drop policy if exists schedule_update_staff on public.schedule;
create policy schedule_update_staff on public.schedule
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists schedule_delete_staff on public.schedule;
create policy schedule_delete_staff on public.schedule
  for delete to authenticated
  using ((select public.is_staff()));

-- Starter schedule (only when the table is empty) so the site isn't blank; edit it from the dashboard.
insert into public.schedule (group_name, age_range, day_of_week, start_time, end_time, level, badge_color, sort_order)
select v.group_name, v.age_range, v.day_of_week, v.start_time::time, v.end_time::time, v.level, v.badge_color, v.sort_order
from (values
  ('Mini Acro', '5–7 ani', 1, '17:00', '18:00', 'beginner', 'sky', 10),
  ('Mini Acro', '5–7 ani', 3, '17:00', '18:00', 'beginner', 'sky', 10),
  ('Juniori', '8–12 ani', 2, '17:00', '18:30', 'all', 'violet', 20),
  ('Juniori', '8–12 ani', 4, '17:00', '18:30', 'all', 'violet', 20),
  ('Juniori', '8–12 ani', 6, '10:00', '11:30', 'all', 'violet', 20),
  ('Adolescenți', '13–17 ani', 1, '18:30', '20:00', 'intermediate', 'fuchsia', 30),
  ('Adolescenți', '13–17 ani', 3, '18:30', '20:00', 'intermediate', 'fuchsia', 30),
  ('Adolescenți', '13–17 ani', 5, '18:00', '19:30', 'intermediate', 'fuchsia', 30),
  ('Adulți', '18+', 2, '19:00', '20:30', 'all', 'emerald', 40),
  ('Adulți', '18+', 4, '19:00', '20:30', 'all', 'emerald', 40),
  ('Modul Avansați & Biomecanică', 'nivel avansat', 5, '19:30', '21:00', 'advanced', 'rose', 50),
  ('Modul Avansați & Biomecanică', 'nivel avansat', 6, '12:00', '14:00', 'advanced', 'rose', 50)
) as v(group_name, age_range, day_of_week, start_time, end_time, level, badge_color, sort_order)
where not exists (select 1 from public.schedule);

-- Realtime (optional live refresh of schedule views)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule'
    ) then
    alter publication supabase_realtime add table public.schedule;
  end if;
end $$;
