-- GoTrue passes/stores phone numbers without a leading "+" (e.g.
-- "15555550123"), while our own UI and allowed_users.phone_number use E.164
-- with "+" (e.g. "+15555550123") since that's the clearer convention for
-- admins entering numbers. Normalize before comparing across the boundary.

create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null then null
    when left(p, 1) = '+' then p
    else '+' || p
  end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
    from public.allowed_users
    where phone_number = public.normalize_phone(new.phone);

  if v_role is not null then
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
      where id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.allowed_users_sync_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
    where public.normalize_phone(phone) = new.phone_number;
  return new;
end;
$$;

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
  v_phone := public.normalize_phone(event -> 'user' ->> 'phone');

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
