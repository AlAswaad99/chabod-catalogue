-- Admin-editable song numbers.
--
-- Numbers stay unique (songs_number_key) and are still handed out by
-- song_number_seq on insert, but an admin can now move a song to a different
-- number. If another song already holds the target number the two songs swap,
-- so nothing else renumbers and printed songbooks / references stay valid.
--
-- The swap needs a parking value because songs_number_key is not deferrable:
-- two rows can never briefly share a number, even inside one transaction.
-- Doing it in a single function keeps it atomic (all or nothing) and race
-- free (both rows are locked first).
--
-- SECURITY DEFINER so the function can also advance song_number_seq, which
-- the `authenticated` role cannot touch. The admin check is done explicitly
-- from the JWT, the same source the songs RLS policies use (jwt_role()).

create or replace function public.set_song_number(p_song_id uuid, p_new_number integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_number integer;
  v_other_id uuid;
  v_other_title text;
begin
  if public.jwt_role() <> 'admin' then
    raise exception 'Admin access required.';
  end if;

  if p_new_number is null or p_new_number < 1 or p_new_number > 9999 then
    raise exception 'Song number must be between 1 and 9999.';
  end if;

  -- Lock both rows in a stable order (by id) so two admins swapping the same
  -- pair at once can't deadlock.
  perform 1
    from public.songs
    where id = p_song_id or number = p_new_number
    order by id
    for update;

  select number into v_old_number from public.songs where id = p_song_id;
  if not found then
    raise exception 'Song not found.';
  end if;

  if v_old_number = p_new_number then
    return jsonb_build_object('number', v_old_number, 'swapped', null);
  end if;

  select id, title into v_other_id, v_other_title
    from public.songs
    where number = p_new_number;

  if v_other_id is not null then
    -- Park this song on a negative number, hand its old number to the other
    -- song, then take the target number.
    update public.songs set number = -p_new_number where id = p_song_id;
    update public.songs set number = v_old_number where id = v_other_id;
  end if;

  update public.songs set number = p_new_number where id = p_song_id;

  -- Keep the sequence ahead of every assigned number, otherwise a later
  -- insert would eventually hit a duplicate (songs_number_key) on its own.
  perform setval(
    'public.song_number_seq',
    greatest((select last_value from public.song_number_seq), p_new_number)
  );

  return jsonb_build_object(
    'number', p_new_number,
    'swapped',
    case
      when v_other_id is null then null
      else jsonb_build_object('id', v_other_id, 'title', v_other_title, 'number', v_old_number)
    end
  );
end;
$$;

revoke all on function public.set_song_number(uuid, integer) from public, anon;
grant execute on function public.set_song_number(uuid, integer) to authenticated;
