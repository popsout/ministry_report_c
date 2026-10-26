-- Additive evidence records. Existing administrator-only SELECT policy covers this column.
begin;
alter table public.bible_reading_events add column if not exists source_checks jsonb not null default '[]' check(jsonb_typeof(source_checks)='array');
comment on column public.bible_reading_events.source_checks is 'Scoped evidence from user-provided PDF; does not imply entire event or absolute chronology is verified.';
commit;
