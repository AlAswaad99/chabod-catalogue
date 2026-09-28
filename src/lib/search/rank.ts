import type { LyricsSection, MetadataFieldDefinition, Song, SongMetadata } from "@/types/song";

// Result tiers, in display order (redesign decisions.md Q4 / §4.2): title
// or number matches first, then lyrics, then field values. Plain
// case-insensitive substring matching — Ge'ez letter-variant normalization
// (ሀ/ሃ/ሐ/ኀ, ሰ/ሠ) is explicitly deferred.
export type SearchTier = 0 | 1 | 2;

export interface Snippet {
  before: string;
  hit: string;
  after: string;
}

export interface SearchMatch {
  song: Song;
  tier: SearchTier;
  titleMatch?: { start: number; end: number };
  matchBadge?: string;
  snippet?: Snippet;
  metaLine?: string;
}

const SNIPPET_CHARS_BEFORE = 16;
const SNIPPET_CHARS_AFTER = 60;

function indexOfCi(haystack: string, needle: string): number {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

function formatFieldValue(value: string | number | string[]): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function findLyricsSnippet(sections: LyricsSection[], query: string): Snippet | null {
  for (const section of sections) {
    for (const line of section.text.split("\n")) {
      const idx = indexOfCi(line, query);
      if (idx === -1) continue;
      const start = Math.max(0, idx - SNIPPET_CHARS_BEFORE);
      const end = Math.min(line.length, idx + query.length + SNIPPET_CHARS_AFTER);
      return {
        before: line.slice(start, idx),
        hit: line.slice(idx, idx + query.length),
        after: line.slice(idx + query.length, end),
      };
    }
  }
  return null;
}

function findFieldMatch(
  metadata: SongMetadata,
  fieldDefs: MetadataFieldDefinition[],
  query: string,
): { fieldName: string; metaLine: string } | null {
  for (const def of fieldDefs) {
    const raw = metadata[def.id];
    if (raw === undefined || raw === null || raw === "") continue;
    const formatted = formatFieldValue(raw);
    if (indexOfCi(formatted, query) !== -1) {
      return { fieldName: def.name, metaLine: `${def.name}: ${formatted}` };
    }
  }
  return null;
}

/** Up to 2 populated fields, for the meta line of a row with no active search. */
export function defaultMetaLine(song: Song, fieldDefs: MetadataFieldDefinition[]): string | undefined {
  const parts: string[] = [];
  for (const def of fieldDefs) {
    const raw = song.metadata[def.id];
    if (raw === undefined || raw === null || raw === "") continue;
    parts.push(`${def.name}: ${formatFieldValue(raw)}`);
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function searchSongs(
  songs: Song[],
  fieldDefs: MetadataFieldDefinition[],
  rawQuery: string,
): SearchMatch[] {
  const query = rawQuery.trim();
  if (!query) {
    return songs
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((song) => ({ song, tier: 0 as SearchTier }));
  }

  const queryAsNumber = /^\d+$/.test(query) ? parseInt(query, 10) : null;
  const results: SearchMatch[] = [];

  for (const song of songs) {
    const titleIdx = indexOfCi(song.title, query);
    if (titleIdx !== -1) {
      results.push({ song, tier: 0, titleMatch: { start: titleIdx, end: titleIdx + query.length } });
      continue;
    }

    if (queryAsNumber !== null && song.number === queryAsNumber) {
      results.push({ song, tier: 0, matchBadge: "Number" });
      continue;
    }

    const snippet = findLyricsSnippet(song.lyrics, query);
    if (snippet) {
      results.push({ song, tier: 1, matchBadge: "Lyrics", snippet });
      continue;
    }

    const fieldMatch = findFieldMatch(song.metadata, fieldDefs, query);
    if (fieldMatch) {
      results.push({ song, tier: 2, matchBadge: fieldMatch.fieldName, metaLine: fieldMatch.metaLine });
      continue;
    }
  }

  results.sort((a, b) => a.tier - b.tier || a.song.number - b.song.number);
  return results;
}
