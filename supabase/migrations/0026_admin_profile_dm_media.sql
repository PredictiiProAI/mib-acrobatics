-- MIB Acrobatics — staff can fill in a member's profile fields; photo/video attachments in private messages.
-- Run after 0025_city_groups.sql. Idempotent: safe to run more than once.

-- Staff only: edit a member's profile details from /dashboard/users -> "Vezi profil".
create or replace function public.admin_update_profile(
  target uuid,
  p_phone text,
  p_discipline text,
  p_level text,
  p_birthdate date,
  p_children_names text,
  p_emergency_contact text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  clean_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.users set
    discipline = nullif(left(trim(coalesce(p_discipline, '')), 80), ''),
    level = nullif(p_level, ''),
    birthdate = p_birthdate,
    children_names = nullif(left(trim(coalesce(p_children_names, '')), 300), ''),
    emergency_contact = nullif(left(trim(coalesce(p_emergency_contact, '')), 200), '')
  where id = target;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into public.user_settings (user_id, phone) values (target, clean_phone)
  on conflict (user_id) do update set phone = excluded.phone, updated_at = now();
end $$;
revoke execute on function public.admin_update_profile(uuid, text, text, text, date, text, text) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, text, text, date, text, text) to authenticated;

-- Private message attachments: stored at dm_media/<sender>/<receiver>/<file>.
alter table public.direct_messages add column if not exists attachment_path text;
alter table public.direct_messages add column if not exists attachment_type text;
alter table public.direct_messages drop constraint if exists direct_messages_attachment_check;
alter table public.direct_messages add constraint direct_messages_attachment_check check (
  (attachment_path is null and attachment_type is null)
  or (attachment_type in ('image', 'video') and char_length(attachment_path) between 1 and 300)
);
alter table public.direct_messages drop constraint if exists direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check check (
  char_length(content) <= 4000 and (char_length(trim(content)) >= 1 or attachment_path is not null)
);
grant insert (attachment_path, attachment_type) on public.direct_messages to authenticated;

drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and (attachment_path is null or attachment_path like sender_id::text || '/' || receiver_id::text || '/%')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dm_media', 'dm_media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Same audience as dm_select: the two participants, plus staff for conversations that involve a coach.
create or replace function public.can_read_dm_object(p_name text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  a uuid;
  b uuid;
begin
  begin
    a := split_part(p_name, '/', 1)::uuid;
    b := split_part(p_name, '/', 2)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return (select auth.uid()) in (a, b)
    or (public.is_staff() and (public.is_staff_user(a) or public.is_staff_user(b)));
end $$;
revoke execute on function public.can_read_dm_object(text) from public, anon;
grant execute on function public.can_read_dm_object(text) to authenticated;

drop policy if exists dm_media_select on storage.objects;
create policy dm_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'dm_media' and public.can_read_dm_object(name));

drop policy if exists dm_media_insert on storage.objects;
create policy dm_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dm_media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] is not null
    and (storage.foldername(name))[2] <> (select auth.uid())::text
  );

drop policy if exists dm_media_delete on storage.objects;
create policy dm_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'dm_media' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));
