-- Chabod Choir Catalogue — initial schema
-- Entities: songs (primary entity, flexible metadata), metadata field
-- definitions (admin-extensible), audio attachments, and the phone-number
-- allowlist + Telegram link table used by the custom auth flow.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Reads the role Supabase Auth baked into the JWT's app_metadata at token
-- issuance time (kept in sync with allowed_users by the triggers below).
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- ---------------------------------------------------------------------------
-- metadata_field_definitions
-- ---------------------------------------------------------------------------

create table public.metadata_field_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('text', 'number', 'single_select', 'multi_select')),
  options jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint options_only_for_select check (
    type in ('single_select', 'multi_select') or options = '[]'::jsonb
  )
);

-- Case-insensitive uniqueness so admins can't accidentally create "Voicing"
-- and "voicing" as two separate fields.
create unique index metadata_field_definitions_name_key
  on public.metadata_field_definitions (lower(name));

create trigger metadata_field_definitions_set_updated_at
  before update on public.metadata_field_definitions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Array of structured sections, e.g. [{"type":"verse","label":"Verse 1","text":"..."}]
  lyrics jsonb not null default '[]'::jsonb,
  -- Map of metadata_field_definitions.id -> value. Value shape depends on the
  -- field's type: text/number is a scalar, single_select is a string,
  -- multi_select is a string array.
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_search_vector_idx on public.songs using gin (search_vector);
create index songs_metadata_idx on public.songs using gin (metadata jsonb_path_ops);
create index songs_title_idx on public.songs using btree (title);

create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- Keeps search_vector current from title + lyrics text + metadata values,
-- so the single search bar can match any of the three.
create or replace function public.songs_search_vector_update()
returns trigger
language plpgsql
as $$
declare
  lyrics_text text;
  metadata_text text;
begin
  select coalesce(string_agg(section ->> 'text', ' '), '')
    into lyrics_text
    from jsonb_array_elements(coalesce(new.lyrics, '[]'::jsonb)) as section;

  select coalesce(string_agg(
    case
      when jsonb_typeof(value) = 'array'
        then (select string_agg(elem, ' ') from jsonb_array_elements_text(value) as elem)
      else value #>> '{}'
    end, ' '), '')
    into metadata_text
    from jsonb_each(coalesce(new.metadata, '{}'::jsonb));

  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(lyrics_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(metadata_text, '')), 'C');

  return new;
end;
$$;

create trigger songs_search_vector_trigger
  before insert or update on public.songs
  for each row execute function public.songs_search_vector_update();

-- ---------------------------------------------------------------------------
-- song_attachments (audio recordings in Supabase Storage)
-- ---------------------------------------------------------------------------

create table public.song_attachments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index song_attachments_song_id_idx on public.song_attachments (song_id);

-- ---------------------------------------------------------------------------
-- allowed_users (phone allowlist + role) and telegram_links
-- ---------------------------------------------------------------------------

create table public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  role text not null check (role in ('admin', 'member')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger allowed_users_set_updated_at
  before update on public.allowed_users
  for each row execute function public.set_updated_at();

create table public.telegram_links (
  phone_number text primary key references public.allowed_users (phone_number) on delete cascade,
  telegram_chat_id bigint not null unique,
  telegram_username text,
  linked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth wiring: keep auth.users.raw_app_meta_data.role in sync with
-- allowed_users, and reject sign-ups for phones that aren't allowlisted.
-- ---------------------------------------------------------------------------

-- Stamps the role onto a newly created auth.users row (runs after the
-- before_user_created hook has already guaranteed the phone is allowlisted).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.allowed_users where phone_number = new.phone;

  if v_role is not null then
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
      where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Propagates role changes an admin makes later onto any auth.users row that
-- already exists for that phone number (takes effect on next token refresh).
create or replace function public.allowed_users_sync_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
    where phone = new.phone_number;
  return new;
end;
$$;

create trigger allowed_users_after_upsert
  after insert or update of role on public.allowed_users
  for each row execute function public.allowed_users_sync_role();

-- Auth hook (configured in supabase/config.toml): rejects account creation
-- for any phone number not present in allowed_users. This is defense in
-- depth — the app's own login flow already checks the allowlist before ever
-- calling signInWithOtp — in case Supabase Auth is ever called directly.
create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_exists boolean;
begin
  v_phone := event -> 'user' ->> 'phone';

  select exists (
    select 1 from public.allowed_users where phone_number = v_phone
  ) into v_exists;

  if not v_exists then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This phone number is not registered with the choir catalogue. Ask an admin to add you.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.before_user_created_hook(jsonb) from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.metadata_field_definitions enable row level security;
alter table public.songs enable row level security;
alter table public.song_attachments enable row level security;
alter table public.allowed_users enable row level security;
alter table public.telegram_links enable row level security;

-- songs: any signed-in member or admin can read; only admins can write.
create policy songs_select on public.songs
  for select to authenticated
  using (public.jwt_role() in ('admin', 'member'));

create policy songs_insert on public.songs
  for insert to authenticated
  with check (public.jwt_role() = 'admin');

create policy songs_update on public.songs
  for update to authenticated
  using (public.jwt_role() = 'admin')
  with check (public.jwt_role() = 'admin');

create policy songs_delete on public.songs
  for delete to authenticated
  using (public.jwt_role() = 'admin');

-- metadata_field_definitions: same read/write split as songs.
create policy metadata_field_definitions_select on public.metadata_field_definitions
  for select to authenticated
  using (public.jwt_role() in ('admin', 'member'));

create policy metadata_field_definitions_insert on public.metadata_field_definitions
  for insert to authenticated
  with check (public.jwt_role() = 'admin');

create policy metadata_field_definitions_update on public.metadata_field_definitions
  for update to authenticated
  using (public.jwt_role() = 'admin')
  with check (public.jwt_role() = 'admin');

create policy metadata_field_definitions_delete on public.metadata_field_definitions
  for delete to authenticated
  using (public.jwt_role() = 'admin');

-- song_attachments: same read/write split.
create policy song_attachments_select on public.song_attachments
  for select to authenticated
  using (public.jwt_role() in ('admin', 'member'));

create policy song_attachments_insert on public.song_attachments
  for insert to authenticated
  with check (public.jwt_role() = 'admin');

create policy song_attachments_update on public.song_attachments
  for update to authenticated
  using (public.jwt_role() = 'admin')
  with check (public.jwt_role() = 'admin');

create policy song_attachments_delete on public.song_attachments
  for delete to authenticated
  using (public.jwt_role() = 'admin');

-- allowed_users: admin-only in every direction. Members have no reason to
-- see the phone/role list.
create policy allowed_users_all on public.allowed_users
  for all to authenticated
  using (public.jwt_role() = 'admin')
  with check (public.jwt_role() = 'admin');

-- telegram_links: no policies for anon/authenticated — only the
-- service_role (used by the Telegram webhook + send-sms edge functions)
-- can read or write, since service_role bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- Storage: private bucket for song audio attachments
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('song-audio', 'song-audio', false)
on conflict (id) do nothing;

create policy song_audio_select on storage.objects
  for select to authenticated
  using (bucket_id = 'song-audio' and public.jwt_role() in ('admin', 'member'));

create policy song_audio_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'song-audio' and public.jwt_role() = 'admin');

create policy song_audio_update on storage.objects
  for update to authenticated
  using (bucket_id = 'song-audio' and public.jwt_role() = 'admin')
  with check (bucket_id = 'song-audio' and public.jwt_role() = 'admin');

create policy song_audio_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'song-audio' and public.jwt_role() = 'admin');
