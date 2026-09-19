import { createClient } from "@/lib/supabase/server";
import { SongForm } from "@/components/song-form";
import type { MetadataFieldDefinition } from "@/types/song";

export default async function NewSongPage() {
  const supabase = await createClient();
  const { data: fieldDefs } = await supabase.from("metadata_field_definitions").select("*").order("name");

  return (
    <div>
      <h1 className="mx-auto max-w-2xl px-4 pt-6 text-xl font-semibold">Add a song</h1>
      <SongForm initialFieldDefs={(fieldDefs ?? []) as unknown as MetadataFieldDefinition[]} />
    </div>
  );
}
