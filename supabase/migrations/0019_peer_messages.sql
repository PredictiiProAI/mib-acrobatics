-- MIB Acrobatics — member-to-member private messages.
-- Requires 0001_init.sql. Idempotent: safe to run more than once.
-- A 1-on-1 conversation is the pair (sender_id, receiver_id) in direct_messages, so existing history and realtime keep working.
-- Members may write to any member or to the coaches. Each person reads only their own conversations;
-- staff keep the shared coach inbox (conversations with a coach) but cannot read chats between two members.

create or replace function public.is_staff_user(uid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.users u where u.id = uid and u.role in ('admin', 'superadmin')) $$;

revoke all on function public.is_staff_user(uuid) from public, anon;
grant execute on function public.is_staff_user(uuid) to authenticated;

drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages
  for select to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or ((select public.is_staff()) and (public.is_staff_user(sender_id) or public.is_staff_user(receiver_id)))
  );

drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and receiver_id <> (select auth.uid()));

drop policy if exists dm_delete_staff on public.direct_messages;
create policy dm_delete_staff on public.direct_messages
  for delete to authenticated
  using ((select public.is_staff()) and (public.is_staff_user(sender_id) or public.is_staff_user(receiver_id)));

create index if not exists dm_pair_idx on public.direct_messages (least(sender_id, receiver_id), greatest(sender_id, receiver_id), created_at desc);
