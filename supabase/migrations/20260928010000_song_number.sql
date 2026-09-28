-- Permanent, sequence-backed song number (redesign decisions.md Q1,
-- option A): assigned once on insert, never reused, gaps allowed after a
-- delete. Backfills existing rows in created_at order before the column
-- is locked down, so this is safe to run against a populated database.

create sequence public.song_number_seq;

alter table public.songs add column number integer;

with ordered as (
  select id, row_number() over (order by created_at) as rn
  from public.songs
)
update public.songs
set number = ordered.rn
from ordered
where public.songs.id = ordered.id;

do $$
declare
  v_max integer;
begin
  select max(number) into v_max from public.songs;
  if v_max is null then
    -- No rows yet: leave the sequence so the *next* nextval() returns 1.
    perform setval('public.song_number_seq', 1, false);
  else
    perform setval('public.song_number_seq', v_max, true);
  end if;
end $$;

alter table public.songs alter column number set default nextval('public.song_number_seq');
alter table public.songs alter column number set not null;
alter table public.songs add constraint songs_number_key unique (number);
alter sequence public.song_number_seq owned by public.songs.number;

create index songs_number_idx on public.songs using btree (number);
