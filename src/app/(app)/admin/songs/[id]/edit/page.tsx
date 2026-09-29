import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SongForm } from "@/components/song-form";
import type { MetadataFieldDefinition, Song } from "@/types/song";

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: song, error }, { data: fieldDefs }] = await Promise.all([
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    supabase.from("metadata_field_definitions").select("*").order("name"),
  ]);

  if (error || !song) notFound();

  return (
    <SongForm
      initialSong={song as unknown as Song}
      initialFieldDefs={(fieldDefs ?? []) as unknown as MetadataFieldDefinition[]}
      closeHref={`/songs/${id}`}
    />
  );
}
