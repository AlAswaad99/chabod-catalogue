import { createClient } from "@/lib/supabase/server";
import { SongForm } from "@/components/song-form";
import type { MetadataFieldDefinition } from "@/types/song";

export default async function NewSongPage() {
  const supabase = await createClient();
  const [{ data: fieldDefs }, { data: lastSong }] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").order("name"),
    supabase.from("songs").select("number").order("number", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <SongForm
      initialFieldDefs={(fieldDefs ?? []) as unknown as MetadataFieldDefinition[]}
      closeHref="/catalogue"
      provisionalNumber={(lastSong?.number ?? 0) + 1}
    />
  );
}
