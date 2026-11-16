"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { LyricsSection, SongMetadata } from "@/types/song";

export interface SaveSongInput {
  id?: string;
  title: string;
  lyrics: LyricsSection[];
  metadata: SongMetadata;
  /** New songs only: the number to give it. Omit for "highest existing number + 1". */
  number?: number;
}

const UNIQUE_VIOLATION = "23505";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Names who holds `number`, for a clear error instead of a raw constraint message.
async function numberTakenMessage(supabase: Supabase, number: number) {
  const { data } = await supabase.from("songs").select("title").eq("number", number).maybeSingle();
  return data
    ? `No. ${number} is already used by “${data.title}”. Pick another number, or leave it blank.`
    : `No. ${number} is already taken. Pick another number, or leave it blank.`;
}

// Inserts a new song. With an explicit number, a clash is reported (naming the
// song that has it). Without one, it takes the highest existing number + 1 —
// not the database sequence, which stays ahead after deletes and leaves gaps.
// Two songs added at the same instant could pick the same number; the unique
// constraint rejects the loser, so that case retries with a fresh maximum.
async function insertSong(
  supabase: Supabase,
  row: {
    title: string;
    lyrics: NonNullable<Json>;
    metadata: NonNullable<Json>;
    created_by: string | null;
  },
  requested?: number,
): Promise<{ data: { id: string; number: number } | null; error: string | null }> {
  if (requested !== undefined && (!Number.isInteger(requested) || requested < 1 || requested > 9999)) {
    return { data: null, error: "Song number must be a whole number between 1 and 9999." };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    let number = requested;
    if (number === undefined) {
      const { data: top } = await supabase
        .from("songs")
        .select("number")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      number = (top?.number ?? 0) + 1;
    }

    const { data, error } = await supabase.from("songs").insert({ ...row, number }).select("id, number").single();

    if (!error) {
      revalidatePath("/", "layout");
      return { data, error: null };
    }
    if (error.code !== UNIQUE_VIOLATION) return { data: null, error: error.message };
    if (requested !== undefined) return { data: null, error: await numberTakenMessage(supabase, requested) };
    // Auto-numbered and lost a race: loop to read the new maximum.
  }
  return { data: null, error: "Couldn't assign a song number. Please try again." };
}

export async function saveSong(
  input: SaveSongInput,
): Promise<{ data: { id: string; number: number } | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    title: input.title.trim(),
    lyrics: input.lyrics as unknown as NonNullable<Json>,
    metadata: input.metadata as unknown as NonNullable<Json>,
  };

  if (!input.id) {
    return insertSong(supabase, { ...payload, created_by: user?.id ?? null }, input.number);
  }

  const { data, error } = await supabase
    .from("songs")
    .update(payload)
    .eq("id", input.id)
    .select("id, number")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // The catalogue lives in a persistent layout, so refresh from the root.
  revalidatePath("/", "layout");

  return { data, error: null };
}

export interface SetSongNumberResult {
  number: number;
  /** The song that had the requested number and now holds this song's old one. */
  swapped: { id: string; title: string; number: number } | null;
}

// Moves a song to `newNumber`. If another song already has it, the two swap
// (atomically, in the database — see migration 20261116000000). Admin only,
// enforced in the function itself as well as here.
export async function setSongNumber(
  songId: string,
  newNumber: number,
): Promise<{ data: SetSongNumberResult | null; error: string | null }> {
  if (!Number.isInteger(newNumber) || newNumber < 1 || newNumber > 9999) {
    return { data: null, error: "Song number must be a whole number between 1 and 9999." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_song_number", {
    p_song_id: songId,
    p_new_number: newNumber,
  });

  if (error) return { data: null, error: error.message };

  revalidatePath("/", "layout");
  return { data: data as unknown as SetSongNumberResult, error: null };
}

export async function deleteSong(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (!error) revalidatePath("/", "layout");
  return { error: error?.message ?? null };
}
