import { createClient } from "@/lib/supabase/server";
import { getFieldDefs } from "@/lib/data";
import { SongForm } from "@/components/song-form";

export default async function NewSongPage() {
  const supabase = await createClient();
  const [fieldDefs, { data: numberRows }] = await Promise.all([
    getFieldDefs(),
    // id/number/title of every song: gives the form the next number and lets it
    // name the song a typed number would clash with.
    supabase.from("songs").select("id, number, title").order("number"),
  ]);
  const songNumbers = (numberRows ?? []).map((r) => ({ id: r.id, number: r.number, title: r.title }));

  return (
    <SongForm
      initialFieldDefs={fieldDefs}
      closeHref="/catalogue"
      provisionalNumber={Math.max(0, ...songNumbers.map((s) => s.number)) + 1}
      songNumbers={songNumbers}
    />
  );
}
