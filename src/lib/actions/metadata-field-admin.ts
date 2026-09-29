"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MetadataFieldDefinition, SongMetadata } from "@/types/song";

export async function deleteMetadataField(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("metadata_field_definitions").delete().eq("id", id);
  if (!error) revalidatePath("/admin/metadata-fields");
  return { error: error?.message ?? null };
}

export async function renameMetadataField(id: string, name: string): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("metadata_field_definitions").update({ name: trimmed }).eq("id", id);
  if (!error) revalidatePath("/admin/metadata-fields");
  return { error: error?.message ?? null };
}

// Blocked while any song uses this option (decisions.md Q9b) — the caller
// is expected to have already shown the usage count before calling this.
export async function removeFieldOption(
  id: string,
  option: string,
): Promise<{ data: MetadataFieldDefinition | null; error: string | null }> {
  const supabase = await createClient();

  const [{ data: field, error: fieldErr }, { data: songs, error: songsErr }] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").eq("id", id).single(),
    supabase.from("songs").select("id, metadata"),
  ]);
  if (fieldErr || !field) return { data: null, error: fieldErr?.message ?? "Field not found." };
  if (songsErr) return { data: null, error: songsErr.message };

  const inUse = (songs ?? []).some((s) => {
    const value = (s.metadata as SongMetadata)[id];
    return Array.isArray(value) ? value.includes(option) : value === option;
  });
  if (inUse) return { data: null, error: `"${option}" is still used by at least one song.` };

  const nextOptions = (field.options as unknown as string[]).filter((o) => o !== option);
  const { data, error } = await supabase
    .from("metadata_field_definitions")
    .update({ options: nextOptions })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { data: null, error: error.message };

  revalidatePath("/admin/metadata-fields");
  return { data: data as unknown as MetadataFieldDefinition, error: null };
}

// Moves every song's value from the duplicate field onto the canonical one
// and deletes the duplicate. Canonical's existing value always wins on
// conflict (decisions.md Q9a) — the duplicate's value is simply discarded
// for any song that already had both.
export async function mergeMetadataFields(
  duplicateId: string,
  canonicalId: string,
): Promise<{ data: MetadataFieldDefinition | null; error: string | null }> {
  const supabase = await createClient();

  const [{ data: duplicate, error: dupErr }, { data: canonical, error: canErr }] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").eq("id", duplicateId).single(),
    supabase.from("metadata_field_definitions").select("*").eq("id", canonicalId).single(),
  ]);
  if (dupErr || !duplicate) return { data: null, error: dupErr?.message ?? "Duplicate field not found." };
  if (canErr || !canonical) return { data: null, error: canErr?.message ?? "Canonical field not found." };

  const canonicalOptions = canonical.options as unknown as string[];
  const duplicateOptions = duplicate.options as unknown as string[];
  let mergedCanonical = canonical;

  if ((canonical.type === "single_select" || canonical.type === "multi_select") && duplicateOptions?.length) {
    const merged: string[] = [...canonicalOptions];
    for (const opt of duplicateOptions) {
      if (!merged.some((o) => o.toLowerCase() === opt.toLowerCase())) merged.push(opt);
    }
    if (merged.length !== canonicalOptions.length) {
      const { data, error } = await supabase
        .from("metadata_field_definitions")
        .update({ options: merged })
        .eq("id", canonicalId)
        .select("*")
        .single();
      if (error) return { data: null, error: error.message };
      mergedCanonical = data;
    }
  }

  const { data: songs, error: songsErr } = await supabase.from("songs").select("id, metadata");
  if (songsErr) return { data: null, error: songsErr.message };

  for (const song of songs ?? []) {
    const metadata = song.metadata as SongMetadata;
    if (!(duplicateId in metadata)) continue;

    const next: SongMetadata = { ...metadata };
    if (!(canonicalId in next)) {
      next[canonicalId] = next[duplicateId];
    }
    delete next[duplicateId];

    const { error } = await supabase.from("songs").update({ metadata: next }).eq("id", song.id);
    if (error) return { data: null, error: error.message };
  }

  const { error: deleteErr } = await supabase.from("metadata_field_definitions").delete().eq("id", duplicateId);
  if (deleteErr) return { data: null, error: deleteErr.message };

  revalidatePath("/admin/metadata-fields");
  revalidatePath("/catalogue");
  return { data: mergedCanonical as unknown as MetadataFieldDefinition, error: null };
}
