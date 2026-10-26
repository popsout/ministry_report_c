-- Additive upgrade. Existing events and administrator policies stay intact.
begin;
alter table public.bible_reading_events add column if not exists chronology jsonb;
-- The client validates the optional chronology object; legacy saved vaults remain readable.
comment on column public.bible_reading_events.chronology is 'Editorial date label, precision, basis and references; reviewed=false means publication cross-check pending.';
commit;
