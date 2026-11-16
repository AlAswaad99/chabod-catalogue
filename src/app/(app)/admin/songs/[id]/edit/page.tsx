import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFieldDefs } from "@/lib/data";
import { SongForm } from "@/components/song-form";
import type { Song } from "@/types/song";

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: song, error }, fieldDefs, { data: numberRows }] = await Promise.all([
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    getFieldDefs(),
    // Just id/number/title of every song, so the number field can warn which
    // song a swap would affect before the admin saves.
    supabase.from("songs").select("id, number, title").order("number"),
  ]);

  if (error || !song) notFound();

  return (
    <SongForm
      initialSong={song as unknown as Song}
      initialFieldDefs={fieldDefs}
      closeHref={`/songs/${id}`}
      songNumbers={(numberRows ?? []).map((r) => ({ id: r.id, number: r.number, title: r.title }))}
    />
  );
}
