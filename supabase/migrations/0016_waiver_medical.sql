-- MIB Acrobatics — Declarație & Fișă Medicală (parent consent + child medical form, adult athlete waiver).
-- Requires 0015_waiver.sql. Idempotent: safe to run more than once.
-- Staff (admin/superadmin/media) are exempt; only role 'user' (Sportiv / Părinte accounts) must sign.
-- Submissions are append-only and written only through public.submit_waiver(jsonb), which stamps the server time.
-- Signatures made with the old text (no medical form) are reset so those members complete the new form.

create table if not exists public.waiver_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  form_type text not null check (form_type in ('parinte', 'sportiv')),
  signer_name text not null check (char_length(signer_name) between 3 and 120),
  child_name text check (child_name is null or char_length(child_name) between 3 and 120),
  child_birthdate date,
  emergency_phone text not null check (char_length(emergency_phone) between 6 and 20),
  emergency_secondary text check (emergency_secondary is null or char_length(emergency_secondary) <= 200),
  allergies text not null check (char_length(allergies) between 1 and 1000),
  chronic_conditions text not null check (char_length(chronic_conditions) between 1 and 1000),
  previous_injuries text not null check (char_length(previous_injuries) between 1 and 1000),
  other_medical text not null check (char_length(other_medical) between 1 and 1000),
  acknowledgements text[] not null default '{}',
  signed_at timestamptz not null default now(),
  check (form_type <> 'parinte' or (child_name is not null and child_birthdate is not null))
);
create index if not exists waiver_submissions_user_idx on public.waiver_submissions (user_id, signed_at desc);

alter table public.waiver_submissions enable row level security;
drop policy if exists "waiver_submissions: owner or staff read" on public.waiver_submissions;
create policy "waiver_submissions: owner or staff read" on public.waiver_submissions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
revoke insert, update, delete on public.waiver_submissions from anon, authenticated;
grant select on public.waiver_submissions to authenticated;

update public.users u set waiver_signed = false
 where u.waiver_signed and not exists (select 1 from public.waiver_submissions w where w.user_id = u.id);

drop function if exists public.sign_waiver(text);
drop function if exists public.submit_waiver(jsonb);
create function public.submit_waiver(p jsonb)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_type text;
  v_name text := left(regexp_replace(trim(coalesce(p->>'signer_name', '')), '\s+', ' ', 'g'), 120);
  v_child text := nullif(left(regexp_replace(trim(coalesce(p->>'child_name', '')), '\s+', ' ', 'g'), 120), '');
  v_child_bd date;
  v_phone text := trim(coalesce(p->>'emergency_phone', ''));
  v_acks text[];
  v_required text[];
  v_at timestamptz;
  v_field text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select case when account_type = 'Părinte' then 'parinte' else 'sportiv' end into v_type from public.users where id = v_uid;
  if v_type is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(v_name) < 3 or position(' ' in v_name) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_phone !~ '^\+?[0-9 ()./-]{6,20}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;
  foreach v_field in array array['allergies', 'chronic_conditions', 'previous_injuries', 'other_medical'] loop
    if char_length(trim(coalesce(p->>v_field, ''))) not between 1 and 1000 then
      raise exception 'invalid_medical' using errcode = '22023';
    end if;
  end loop;
  if v_type = 'parinte' then
    begin
      v_child_bd := (p->>'child_birthdate')::date;
    exception when others then
      raise exception 'invalid_child' using errcode = '22023';
    end;
    if v_child is null or char_length(v_child) < 3 or v_child_bd is null or v_child_bd > current_date or v_child_bd < date '1990-01-01' then
      raise exception 'invalid_child' using errcode = '22023';
    end if;
    v_required := array['risks', 'instructions', 'first_aid', 'fitness', 'medical_consent', 'guardian'];
  else
    v_child := null;
    v_required := array['risks', 'instructions', 'first_aid', 'fitness', 'medical_consent', 'adult'];
  end if;
  select coalesce(array_agg(x), '{}') into v_acks from jsonb_array_elements_text(coalesce(p->'acknowledgements', '[]'::jsonb)) x;
  if not (v_acks @> v_required) then
    raise exception 'missing_ack' using errcode = '22023';
  end if;

  insert into public.waiver_submissions (user_id, form_type, signer_name, child_name, child_birthdate, emergency_phone, emergency_secondary,
    allergies, chronic_conditions, previous_injuries, other_medical, acknowledgements)
  values (v_uid, v_type, v_name, v_child, v_child_bd, v_phone, nullif(left(trim(coalesce(p->>'emergency_secondary', '')), 200), ''),
    trim(p->>'allergies'), trim(p->>'chronic_conditions'), trim(p->>'previous_injuries'), trim(p->>'other_medical'), v_required)
  returning signed_at into v_at;

  update public.users set waiver_signed = true, waiver_signed_at = v_at, waiver_signed_by_name = v_name where id = v_uid;
  return v_at;
end $$;
revoke execute on function public.submit_waiver(jsonb) from public, anon;
grant execute on function public.submit_waiver(jsonb) to authenticated;
