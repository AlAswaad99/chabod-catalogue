import { createClient } from "@/lib/supabase/server";
import { getFieldDefs } from "@/lib/data";
import { SongForm } from "@/components/song-form";

export default async function NewSongPage() {
  const supabase = await createClient();
  const [fieldDefs, { data: lastSong }] = await Promise.all([
    getFieldDefs(),
    supabase.from("songs").select("number").order("number", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <SongForm
      initialFieldDefs={fieldDefs}
      closeHref="/catalogue"
      provisionalNumber={(lastSong?.number ?? 0) + 1}
    />
  );
}
