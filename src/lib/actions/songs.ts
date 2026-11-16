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

  const query = input.id
    ? supabase.from("songs").update(payload).eq("id", input.id).select("id, number").single()
    : supabase
        .from("songs")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id, number")
        .single();

  const { data, error } = await query;

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
