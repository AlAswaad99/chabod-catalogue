"use client";

import { useMemo, useState } from "react";
import type { LyricsSection, LyricsSectionType, Song } from "@/types/song";
import type { SlideDeckSpec } from "@/lib/slides/types";

type SongLite = Pick<Song, "id" | "title" | "lyrics">;

interface ArrangedItem {
  id: string;
  type: LyricsSectionType;
  text: string;
}

interface SelectedSong {
  song: SongLite;
  arranged: ArrangedItem[];
}

// Default performance order: stored order, with a single chorus
// auto-repeated after every verse (matching the choir's own reference deck)
// — skipped where the admin already placed that chorus right there in the
// stored data. Ambiguous cases (zero or multiple distinct choruses) are
// left as plain stored order rather than guessed.
function defaultArrangement(lyrics: LyricsSection[]): ArrangedItem[] {
  const choruses = lyrics.filter((s) => s.type === "chorus");
  const singleChorus = choruses.length === 1 ? choruses[0] : null;

  const result: ArrangedItem[] = [];
  lyrics.forEach((section, i) => {
    result.push({ id: crypto.randomUUID(), type: section.type, text: section.text });
    if (singleChorus && section.type === "verse") {
      const next = lyrics[i + 1];
      const nextIsChorus = next && next.type === "chorus" && next.text === singleChorus.text;
      if (!nextIsChorus) {
        result.push({ id: crypto.randomUUID(), type: "chorus", text: singleChorus.text });
      }
    }
  });
  return result;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function todayString() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function SlideGenerator({ songs }: { songs: SongLite[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedSong[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [deckTitle, setDeckTitle] = useState("");
  const [date, setDate] = useState(todayString());
  const [closingPhrase, setClosingPhrase] = useState("ተባረኩ");
  const [maxLinesPerSlide, setMaxLinesPerSlide] = useState(4);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.song.id)), [selected]);
  const filtered = useMemo(
    () =>
      songs.filter(
        (s) => !selectedIds.has(s.id) && s.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [songs, selectedIds, search],
  );

  function addSong(song: SongLite) {
    setSelected((prev) => [...prev, { song, arranged: defaultArrangement(song.lyrics) }]);
    setExpandedId(song.id);
  }

  function removeSong(songId: string) {
    setSelected((prev) => prev.filter((s) => s.song.id !== songId));
  }

  function moveSong(index: number, dir: -1 | 1) {
    setSelected((prev) => move(prev, index, index + dir));
  }

  function updateArranged(songId: string, next: ArrangedItem[]) {
    setSelected((prev) => prev.map((s) => (s.song.id === songId ? { ...s, arranged: next } : s)));
  }

  function moveSection(songId: string, index: number, dir: -1 | 1) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    updateArranged(songId, move(entry.arranged, index, index + dir));
  }

  function duplicateSection(songId: string, index: number) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    const copy = { ...entry.arranged[index], id: crypto.randomUUID() };
    const next = [...entry.arranged];
    next.splice(index + 1, 0, copy);
    updateArranged(songId, next);
  }

  function removeSection(songId: string, index: number) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    updateArranged(
      songId,
      entry.arranged.filter((_, i) => i !== index),
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const spec: SlideDeckSpec = {
        deckTitle: deckTitle.trim() || "Songs",
        date,
        closingPhrase,
        maxLinesPerSlide,
        songs: selected.map((s) => ({
          title: s.song.title,
          sections: s.arranged.map((a) => ({ type: a.type, text: a.text })),
        })),
      };

      const res = await fetch("/api/slides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't generate the slide deck.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${spec.deckTitle}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Generate slides</h1>
        <p className="text-sm text-foreground/60">
          Pick songs, arrange each one&apos;s verses/chorus into the actual order you&apos;ll sing
          them, then generate a .pptx in the choir&apos;s usual style.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Add songs</h2>
        <input
          type="search"
          placeholder="Search songs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        />
        {search && (
          <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-foreground/10 p-2">
            {filtered.length === 0 ? (
              <li className="text-sm text-foreground/50 px-2 py-1">No matches.</li>
            ) : (
              filtered.slice(0, 20).map((song) => (
                <li key={song.id}>
                  <button
                    type="button"
                    onClick={() => addSong(song)}
                    className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5"
                  >
                    + {song.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Selected songs ({selected.length})</h2>
        {selected.length === 0 ? (
          <p className="text-sm text-foreground/50">No songs selected yet.</p>
        ) : (
          <ul className="space-y-2">
            {selected.map((entry, songIndex) => (
              <li key={entry.song.id} className="rounded-lg border border-foreground/10 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) => (prev === entry.song.id ? null : entry.song.id))
                    }
                    className="flex-1 text-left font-medium"
                  >
                    {songIndex + 1}. {entry.song.title}{" "}
                    <span className="text-xs text-foreground/50">
                      ({entry.arranged.length} slide section{entry.arranged.length === 1 ? "" : "s"})
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-sm">
                    <button type="button" onClick={() => moveSong(songIndex, -1)} disabled={songIndex === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSong(songIndex, 1)}
                      disabled={songIndex === selected.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSong(entry.song.id)}
                      className="text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {expandedId === entry.song.id && (
                  <ul className="space-y-1 border-t border-foreground/10 pt-2">
                    {entry.arranged.map((item, i) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 rounded-md bg-foreground/5 px-2 py-1 text-xs"
                      >
                        <span className="w-14 shrink-0 uppercase text-foreground/50">{item.type}</span>
                        <span className="flex-1 truncate">{item.text.split("\n")[0]}</span>
                        <button type="button" onClick={() => moveSection(entry.song.id, i, -1)} disabled={i === 0}>
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(entry.song.id, i, 1)}
                          disabled={i === entry.arranged.length - 1}
                        >
                          ↓
                        </button>
                        <button type="button" onClick={() => duplicateSection(entry.song.id, i)}>
                          + repeat
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSection(entry.song.id, i)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-foreground/10 p-3">
        <h2 className="text-sm font-medium">Deck details</h2>
        <div className="space-y-1">
          <label className="block text-xs text-foreground/60">Deck / service title</label>
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            placeholder="e.g. Sunday Service"
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-foreground/60">Date</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-foreground/60">Closing slide text</label>
          <input
            value={closingPhrase}
            onChange={(e) => setClosingPhrase(e.target.value)}
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-foreground/60">Max lines per lyric slide</label>
          <input
            type="number"
            min={1}
            max={10}
            value={maxLinesPerSlide}
            onChange={(e) => setMaxLinesPerSlide(Number(e.target.value) || 4)}
            className="w-24 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || selected.length === 0}
        className="w-full rounded-lg bg-foreground text-background py-3 font-medium disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate .pptx"}
      </button>
    </div>
  );
}
