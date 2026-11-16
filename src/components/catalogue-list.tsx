"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { searchSongs, defaultMetaLine } from "@/lib/search/rank";
import type { SearchableSong } from "@/lib/search/rank";
import type { MetadataFieldDefinition } from "@/types/song";
import { CatalogueHeader } from "@/components/catalogue-header";
import { CommandPalette } from "@/components/command-palette";
import { SearchBar } from "@/components/ui/search-bar";
import { SongRow } from "@/components/ui/song-row";

// The catalogue's header + search + list. Lives in the browse layout, shared
// between /catalogue (full width on phone and desktop) and /songs/[id] (the
// tablet split-view's left column, §4.10), with the open song's row marked
// selected. Search runs here, in the browser, over the list the layout already
// loaded — the URL's ?q= is kept in sync with replaceState (no navigation).
export function CatalogueList({
  songs,
  fieldDefs,
  isAdmin,
  loadError,
}: {
  songs: SearchableSong[];
  fieldDefs: MetadataFieldDefinition[];
  isAdmin: boolean;
  loadError: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q")?.trim() ?? "");
  const deferredQuery = useDeferredValue(query);
  const activeQuery = deferredQuery.trim();

  const selectedSongId = pathname.startsWith("/songs/") ? pathname.split("/")[2] : undefined;
  const results = useMemo(() => searchSongs(songs, fieldDefs, activeQuery), [songs, fieldDefs, activeQuery]);

  function handleQueryChange(next: string) {
    setQuery(next);
    const params = new URLSearchParams(window.location.search);
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex min-h-dvh flex-col tablet:min-h-0 tablet:flex-1">
      <CommandPalette songs={songs} isAdmin={isAdmin} />
      <CatalogueHeader isAdmin={isAdmin} songCount={songs.length} />

      <div className="sticky top-0 z-10 bg-ground px-4 pb-3">
        <SearchBar value={query} onChange={handleQueryChange} placeholder="Search title, lyrics, or metadata…" />
      </div>

      <p className="type-meta border-b border-rule px-4 pb-2" aria-live="polite">
        {activeQuery ? (
          <>
            <NumberFlow value={results.length} className="tabular-nums" />{" "}
            {results.length === 1 ? "match" : "matches"} in titles, lyrics and fields
          </>
        ) : (
          "All songs · by number"
        )}
      </p>

      {loadError && <p className="px-4 py-6 type-body text-danger">Couldn&apos;t load songs: {loadError}</p>}

      {results.length === 0 ? (
        <div className="flex-1 space-y-1 px-4 py-16 text-center">
          {activeQuery ? (
            <>
              <p className="type-list-title text-ink">Nothing matches &ldquo;{activeQuery}&rdquo;</p>
              <p className="type-meta">Try one word from a line, a key like &ldquo;D♭&rdquo;, or a song number.</p>
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
              metaLine={metaLine ?? (activeQuery ? undefined : defaultMetaLine(song, fieldDefs))}
              selected={song.id === selectedSongId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
