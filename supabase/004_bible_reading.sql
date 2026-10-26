-- Additive: run as project owner in SQL Editor. Existing journal policies stay unchanged.
begin;
create schema if not exists bible_private;
revoke all on schema bible_private from public, anon, authenticated;
create table if not exists bible_private.bible_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on bible_private.bible_admins from public, anon, authenticated;
create or replace function public.is_bible_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from bible_private.bible_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_bible_admin() from public,anon;
grant execute on function public.is_bible_admin() to authenticated;
create table if not exists public.bible_reading_events (
 id text primary key,
 era_id text not null,
 era_title text not null,
 era_order integer not null,
 event_order integer not null,
 title text not null,
 summary text not null,
 rulers jsonb not null default '[]' check(jsonb_typeof(rulers)='array'),
 prophets text[] not null default '{}',
 passages jsonb not null check(jsonb_typeof(passages)='array'),
 related_books text[] not null default '{}',
 placement_note text not null default '',
 review_status text not null default 'draft' check(review_status in ('draft','reviewed')),
 updated_at timestamptz not null default now()
);
alter table public.bible_reading_events enable row level security;
revoke all on public.bible_reading_events from public,anon,authenticated;
grant select on public.bible_reading_events to authenticated;
drop policy if exists bible_admin_read on public.bible_reading_events;
create policy bible_admin_read on public.bible_reading_events for select to authenticated
 using ((select public.is_bible_admin()));
comment on table public.bible_reading_events is 'Original editorial summaries and scripture references only; no licensed Bible text.';
commit;
-- Register a verified owner explicitly in SQL Editor, never by first-user/metadata:
-- insert into bible_private.bible_admins(user_id) values ('YOUR_AUTH_USER_UUID') on conflict do nothing;
