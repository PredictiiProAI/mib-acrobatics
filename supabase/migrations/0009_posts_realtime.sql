-- MIB Acrobatics — broadcast new/deleted posts so open feeds update without a refresh.
-- Idempotent: safe to run more than once.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
    ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;
