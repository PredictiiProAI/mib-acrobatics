-- MIB Acrobatics — staff can ask a member to complete a missing document (parent consent / athlete rules).
-- Requires 0017_parent_consent_rules.sql. Idempotent: safe to run more than once.
-- While a request is open and the document is still missing, the app sends the member to /documente on every visit (no "later").

alter table public.users add column if not exists documents_requested_at timestamptz;

-- Staff: stamp the request and get the contact details for the reminder email.
create or replace function public.admin_request_documents(target uuid)
returns table (email text, full_name text, account_type text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    update public.users u set documents_requested_at = now()
     where u.id = target and u.role = 'user'
    returning u.email, u.full_name, coalesce(u.account_type, 'Sportiv');
end $$;
revoke execute on function public.admin_request_documents(uuid) from public, anon;
grant execute on function public.admin_request_documents(uuid) to authenticated;

-- Staff: open requests, for the Utilizatori table.
create or replace function public.admin_document_requests()
returns table (id uuid, documents_requested_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select u.id, u.documents_requested_at from public.users u where u.documents_requested_at is not null;
end $$;
revoke execute on function public.admin_document_requests() from public, anon;
grant execute on function public.admin_document_requests() to authenticated;

-- Member: was I asked to complete my documents?
create or replace function public.my_documents_request()
returns timestamptz
language sql stable security definer set search_path = ''
as $$ select documents_requested_at from public.users where id = auth.uid() $$;
revoke execute on function public.my_documents_request() from public, anon;
grant execute on function public.my_documents_request() to authenticated;
