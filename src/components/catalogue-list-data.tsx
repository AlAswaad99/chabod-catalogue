import { createClient } from "@/lib/supabase/server";
import { getFieldDefs } from "@/lib/data";
import { CatalogueList } from "@/components/catalogue-list";
import type { SearchableSong } from "@/lib/search/rank";
import type { LyricsSection, SongMetadata } from "@/types/song";

// Fetches the whole catalogue once, in the browse layout. That layout stays
// mounted while you move between the list and individual songs, so opening a
// song no longer re-queries (and re-ships) every song's lyrics. The list is
// searched in the browser, so typing never waits on a server round trip.
export async function CatalogueListData({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient();
  const [fieldDefs, { data, error }] = await Promise.all([
    getFieldDefs(),
    supabase.from("songs").select("id, number, title, lyrics, metadata").order("number").limit(1000),
  ]);

  const songs: SearchableSong[] = (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    lyrics: ((row.lyrics ?? []) as unknown as LyricsSection[]).map((s) => ({ text: s.text })),
    metadata: (row.metadata ?? {}) as unknown as SongMetadata,
  }));

  return <CatalogueList songs={songs} fieldDefs={fieldDefs} isAdmin={isAdmin} loadError={error?.message ?? null} />;
}
