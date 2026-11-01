-- MIB Acrobatics — Acord Parental & Fișă Medicală Sportiv (parents only) + Regulament & Siguranță (minor athletes).
-- Requires 0016_waiver_medical.sql. Idempotent: safe to run more than once.
-- Only 'Părinte' accounts submit the parental consent / medical sheet; edits are appended as new versions (column "replaces").
-- Athlete accounts only acknowledge the gym rules; public.accept_rules() stamps users.rules_accepted_at with the server time.

alter table public.users add column if not exists rules_accepted_at timestamptz;
alter table public.waiver_submissions add column if not exists replaces uuid references public.waiver_submissions (id) on delete set null;

-- The adult athlete waiver no longer exists: "signed" now means a parent consent is on file.
update public.users u set waiver_signed = false, waiver_signed_at = null, waiver_signed_by_name = null
 where u.waiver_signed and coalesce(u.account_type, 'Sportiv') <> 'Părinte';

drop function if exists public.submit_waiver(jsonb);
create function public.submit_waiver(p jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_type text;
  v_name text := left(regexp_replace(trim(coalesce(p->>'signer_name', '')), '\s+', ' ', 'g'), 120);
  v_child text := nullif(left(regexp_replace(trim(coalesce(p->>'child_name', '')), '\s+', ' ', 'g'), 120), '');
  v_child_bd date;
  v_phone text := trim(coalesce(p->>'emergency_phone', ''));
  v_replaces uuid;
  v_acks text[];
  v_required text[] := array['risks', 'instructions', 'first_aid', 'fitness', 'medical_consent', 'guardian'];
  v_id uuid;
  v_at timestamptz;
  v_field text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select account_type into v_type from public.users where id = v_uid and role = 'user';
  if v_type is distinct from 'Părinte' then
    raise exception 'parent_only' using errcode = '42501';
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
  begin
    v_child_bd := (p->>'child_birthdate')::date;
  exception when others then
    raise exception 'invalid_child' using errcode = '22023';
  end;
  if v_child is null or char_length(v_child) < 3 or v_child_bd is null or v_child_bd > current_date or v_child_bd < date '1990-01-01' then
    raise exception 'invalid_child' using errcode = '22023';
  end if;
  if nullif(p->>'replaces', '') is not null then
    select id into v_replaces from public.waiver_submissions
     where id = (p->>'replaces')::uuid and user_id = v_uid;
    if v_replaces is null then
      raise exception 'invalid_replaces' using errcode = '22023';
    end if;
  end if;
  select coalesce(array_agg(x), '{}') into v_acks from jsonb_array_elements_text(coalesce(p->'acknowledgements', '[]'::jsonb)) x;
  if not (v_acks @> v_required) then
    raise exception 'missing_ack' using errcode = '22023';
  end if;

  insert into public.waiver_submissions (user_id, form_type, signer_name, child_name, child_birthdate, emergency_phone, emergency_secondary,
    allergies, chronic_conditions, previous_injuries, other_medical, acknowledgements, replaces)
  values (v_uid, 'parinte', v_name, v_child, v_child_bd, v_phone, nullif(left(trim(coalesce(p->>'emergency_secondary', '')), 200), ''),
    trim(p->>'allergies'), trim(p->>'chronic_conditions'), trim(p->>'previous_injuries'), trim(p->>'other_medical'), v_required, v_replaces)
  returning id, signed_at into v_id, v_at;

  update public.users set waiver_signed = true, waiver_signed_at = v_at, waiver_signed_by_name = v_name where id = v_uid;
  return jsonb_build_object('id', v_id, 'signed_at', v_at);
end $$;
revoke execute on function public.submit_waiver(jsonb) from public, anon;
grant execute on function public.submit_waiver(jsonb) to authenticated;

drop function if exists public.accept_rules();
create function public.accept_rules()
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.users set rules_accepted_at = coalesce(rules_accepted_at, now())
   where id = (select auth.uid()) and role = 'user' and coalesce(account_type, 'Sportiv') <> 'Părinte'
  returning rules_accepted_at into v_at;
  if v_at is null then
    raise exception 'athlete_only' using errcode = '42501';
  end if;
  return v_at;
end $$;
revoke execute on function public.accept_rules() from public, anon;
grant execute on function public.accept_rules() to authenticated;

drop function if exists public.profile_details(uuid);
create function public.profile_details(p_user uuid)
returns table (
  account_type text,
  children_names text,
  emergency_contact text,
  birthdate date,
  social_link text,
  waiver_signed boolean,
  waiver_signed_at timestamptz,
  waiver_signed_by_name text,
  rules_accepted_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select u.account_type, u.children_names, u.emergency_contact, u.birthdate, u.social_link,
         u.waiver_signed, u.waiver_signed_at, u.waiver_signed_by_name, u.rules_accepted_at
  from public.users u
  where u.id = p_user and (p_user = (select auth.uid()) or public.is_staff());
$$;
revoke execute on function public.profile_details(uuid) from public, anon;
grant execute on function public.profile_details(uuid) to authenticated;

drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role public.app_role,
  full_name text,
  display_name text,
  avatar_url text,
  discipline text,
  level text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  account_type text,
  children_names text,
  emergency_contact text,
  birthdate date,
  waiver_signed boolean,
  waiver_signed_at timestamptz,
  waiver_signed_by_name text,
  rules_accepted_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.id, u.email, u.role, u.full_name, u.display_name, u.avatar_url, u.discipline, u.level,
           s.phone, u.created_at, a.last_sign_in_at,
           u.account_type, u.children_names, u.emergency_contact, u.birthdate,
           u.waiver_signed, u.waiver_signed_at, u.waiver_signed_by_name, u.rules_accepted_at
    from public.users u
    left join auth.users a on a.id = u.id
    left join public.user_settings s on s.user_id = u.id
    order by u.created_at desc;
end $$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
