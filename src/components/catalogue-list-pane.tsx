import { createClient } from "@/lib/supabase/server";
import type { MetadataFieldDefinition, Song } from "@/types/song";
import { searchSongs, defaultMetaLine } from "@/lib/search/rank";
import { CatalogueHeader } from "@/components/catalogue-header";
import { CatalogueSearchBar } from "@/components/catalogue-search-bar";
import { SongRow } from "@/components/ui/song-row";

// The catalogue's header+search+list, shared between /catalogue (full width
// on phone and desktop) and /songs/[id] (the 768-1199px tablet split-view's
// left column, §4.10 — same content, just narrower and with the current
// song's row marked selected).
export async function CatalogueListPane({
  query,
  selectedSongId,
  isAdmin,
}: {
  query: string;
  selectedSongId?: string;
  isAdmin: boolean;
}) {
  const supabase = await createClient();
  const [{ data: fieldDefs }, { data: songsData, error: songsError }] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").order("name"),
    supabase
      .from("songs")
      .select("id, number, title, lyrics, metadata, created_at, updated_at, created_by")
      .order("number")
      .limit(1000),
  ]);

  const songs = (songsData ?? []) as unknown as Song[];
  const fieldDefList = (fieldDefs ?? []) as unknown as MetadataFieldDefinition[];
  const results = searchSongs(songs, fieldDefList, query);

  return (
    <div className="flex min-h-dvh flex-col tablet:min-h-0 tablet:flex-1">
      <CatalogueHeader isAdmin={isAdmin} songCount={songs.length} />

      <div className="sticky top-0 z-10 bg-ground px-4 pb-3">
        <CatalogueSearchBar initialValue={query} />
      </div>

      <p className="type-meta border-b-2 border-rule px-4 pb-2">
        {query
          ? `${results.length} ${results.length === 1 ? "match" : "matches"} in titles, lyrics and fields`
          : "All songs · by number"}
      </p>

      {songsError && (
        <p className="px-4 py-6 type-body text-danger">Couldn&apos;t load songs: {songsError.message}</p>
      )}

      {results.length === 0 ? (
        <div className="flex-1 space-y-1 px-4 py-16 text-center">
          {query ? (
            <>
              <p className="type-list-title text-ink">Nothing matches &ldquo;{query}&rdquo;</p>
              <p className="type-meta">
                Try one word from a line, a key like &ldquo;D♭&rdquo;, or a song number.
              </p>
            </>
          ) : (
            <p className="type-list-title text-ink">No songs yet.</p>
          )}
        </div>
      ) : (
        <div className="px-4 tablet:flex-1 tablet:overflow-y-auto">
          {results.map(({ song, titleMatch, matchBadge, snippet, metaLine }) => (
            <SongRow
              key={song.id}
              href={`/songs/${song.id}`}
              number={song.number}
              title={song.title}
              titleMatch={titleMatch}
              matchBadge={matchBadge}
              snippet={snippet}
              metaLine={metaLine ?? (query ? undefined : defaultMetaLine(song, fieldDefList))}
              selected={song.id === selectedSongId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
