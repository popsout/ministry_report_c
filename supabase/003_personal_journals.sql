-- Run in the existing project's SQL Editor once. Does not modify the old record tables.
create table if not exists public.personal_journals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check(jsonb_typeof(document)='object' and document->>'version'='1' and jsonb_typeof(document->'entries')='array' and jsonb_typeof(document->'settings')='array'),
 revision bigint not null check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.personal_journals enable row level security;
revoke all on public.personal_journals from anon,authenticated;
grant select,insert,update on public.personal_journals to authenticated;
drop policy if exists own_journal on public.personal_journals;
create policy own_journal on public.personal_journals for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create or replace function public.check_journal_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if NEW.revision<>1 then raise exception 'invalid revision'; end if;
 else
  if NEW.user_id<>OLD.user_id or NEW.revision<>OLD.revision+1 then raise exception 'invalid revision'; end if;
 end if;
 NEW.updated_at=clock_timestamp();return NEW;
end;$$;
drop trigger if exists journal_revision on public.personal_journals;
create trigger journal_revision before insert or update on public.personal_journals for each row execute function public.check_journal_revision();
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='personal_journals') then
  alter publication supabase_realtime add table public.personal_journals;
 end if;
end $$;
