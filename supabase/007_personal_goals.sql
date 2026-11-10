-- Additive migration only. Does not change personal_journals, auth users,
-- existing policies or any Bible/legacy tables. Apply separately after review.
begin;
create table if not exists public.personal_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null check (coalesce((
    jsonb_typeof(document) = 'object'
    and document->>'version' = '1'
    and document ? 'plan' and document ? 'dismissedOn'
    and jsonb_typeof(document->'plan') in ('object','null')
    and jsonb_typeof(document->'evaluations') = 'object'
    and jsonb_typeof(document->'dismissedOn') in ('string','null')
  ),false)),
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.personal_goals enable row level security;
revoke all on public.personal_goals from public, anon, authenticated;
grant select, insert, update on public.personal_goals to authenticated;
drop policy if exists own_goals on public.personal_goals;
create policy own_goals on public.personal_goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.check_goals_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.revision <> 1 then raise exception 'invalid revision'; end if;
  else
    if NEW.user_id <> OLD.user_id or NEW.revision <> OLD.revision + 1 then
      raise exception 'invalid revision';
    end if;
  end if;
  NEW.updated_at = clock_timestamp();
  return NEW;
end;
$$;
drop trigger if exists goals_revision on public.personal_goals;
create trigger goals_revision before insert or update on public.personal_goals
  for each row execute function public.check_goals_revision();
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'personal_goals') then
    alter publication supabase_realtime add table public.personal_goals;
  end if;
end $$;
commit;
