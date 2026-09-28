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
): Promise<{ data: { id: string } | null; error: string | null }> {
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
    ? supabase.from("songs").update(payload).eq("id", input.id).select("id").single()
    : supabase
        .from("songs")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id")
        .single();

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/catalogue");
  if (input.id) revalidatePath(`/songs/${input.id}`);

  return { data, error: null };
}

export async function deleteSong(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (!error) revalidatePath("/catalogue");
  return { error: error?.message ?? null };
}
