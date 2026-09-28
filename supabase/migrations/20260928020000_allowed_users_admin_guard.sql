-- Last-admin / self-demotion guard (redesign decisions.md Q6, option B):
-- enforced here, not just hidden in the UI. Rejects:
--   (a) any UPDATE/DELETE that would leave zero rows with role = 'admin'
--   (b) an admin modifying or deleting their own allowed_users row at all,
--       even a change unrelated to role — the only way to change an
--       admin's own access is for a *different* admin to do it.

create or replace function public.jwt_phone()
returns text
language sql
stable
as $$
  select public.normalize_phone(auth.jwt() ->> 'phone');
$$;

create or replace function public.allowed_users_guard()
returns trigger
language plpgsql
as $$
declare
  v_remaining_admins integer;
begin
  if old.phone_number = public.jwt_phone() then
    raise exception 'You cannot change or remove your own admin access. Ask another admin to do it.';
  end if;

  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    select count(*) into v_remaining_admins
      from public.allowed_users
      where role = 'admin' and phone_number <> old.phone_number;

    if v_remaining_admins = 0 then
      raise exception 'Cannot remove the last remaining admin.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger allowed_users_guard_trigger
  before update or delete on public.allowed_users
  for each row execute function public.allowed_users_guard();
