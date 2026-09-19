import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { MetadataFieldDefinition, Song } from "@/types/song";

function formatMetadataValue(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: fieldDefs }, songsQuery] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").order("name"),
    (async () => {
      let query = supabase
        .from("songs")
        .select("id, title, lyrics, metadata, created_at, updated_at, created_by")
        .order("title")
        .limit(100);

      if (q && q.trim()) {
        query = query.textSearch("search_vector", q.trim(), {
          type: "websearch",
          config: "simple",
        });
      }

      return query;
    })(),
  ]);

  const songs = (songsQuery.data ?? []) as unknown as Song[];
  const fieldDefMap = new Map(
    ((fieldDefs ?? []) as unknown as MetadataFieldDefinition[]).map((f) => [f.id, f]),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search title, lyrics, or metadata…"
          className="flex-1 rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/50"
        />
        <button
          type="submit"
          className="rounded-lg bg-foreground text-background px-4 py-3 font-medium"
        >
          Search
        </button>
      </form>

      {songsQuery.error && (
        <p className="text-sm text-red-600">Couldn&apos;t load songs: {songsQuery.error.message}</p>
      )}

      {songs.length === 0 ? (
        <p className="text-sm text-foreground/60 text-center py-12">
          {q ? "No songs match your search." : "No songs yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {songs.map((song) => {
            const badges = Object.entries(song.metadata ?? {}).slice(0, 3);
            return (
              <li key={song.id}>
                <Link
                  href={`/songs/${song.id}`}
                  className="block rounded-lg border border-foreground/10 px-4 py-3 hover:border-foreground/30"
                >
                  <p className="font-medium">{song.title}</p>
                  {badges.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                      {badges.map(([fieldId, value]) => {
                        const def = fieldDefMap.get(fieldId);
                        if (!def) return null;
                        return (
                          <span key={fieldId}>
                            {def.name}: {formatMetadataValue(value)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
