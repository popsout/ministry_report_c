-- Run once in the Supabase SQL Editor. Safe to rerun for this initial schema.
create table if not exists public.service_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  service_date date not null,
  service_type text not null check (service_type in ('호별', '편지', '전시대')),
  minutes integer not null check (minutes between 15 and 525 and minutes % 15 = 0),
  note text not null default '' check (char_length(note) <= 500),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists service_entries_user_date on public.service_entries(user_id, service_date);
create table if not exists public.month_settings (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  month date not null check (extract(day from month) = 1),
  role text not null check (role in ('일반', '보조 파이오니아', '정규 파이오니아')),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(user_id, month)
);
alter table public.service_entries enable row level security;
alter table public.month_settings enable row level security;
drop policy if exists own_entries on public.service_entries;
create policy own_entries on public.service_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists own_months on public.month_settings;
create policy own_months on public.month_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.service_entries, public.month_settings from anon;
grant select, insert, update, delete on public.service_entries, public.month_settings to authenticated;
create or replace function public.set_record_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
drop trigger if exists service_entries_updated on public.service_entries;
create trigger service_entries_updated before update on public.service_entries
for each row execute function public.set_record_updated_at();
drop trigger if exists month_settings_updated on public.month_settings;
create trigger month_settings_updated before update on public.month_settings
for each row execute function public.set_record_updated_at();
-- Deletes broadcast only the PK with RLS; refresh and periodic reads also reconcile deletes.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'service_entries') then
    alter publication supabase_realtime add table public.service_entries;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'month_settings') then
    alter publication supabase_realtime add table public.month_settings;
  end if;
end $$;
