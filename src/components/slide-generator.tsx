"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Download, Plus, X } from "lucide-react";
import type { LyricsSectionType, Song } from "@/types/song";
import type { SlideDeckSpec } from "@/lib/slides/types";
import { chunkLines } from "@/lib/slides/chunk-lines";
import { annotateSections } from "@/lib/lyrics";
import { TopBar } from "@/components/ui/top-bar";
import { TextInput } from "@/components/ui/text-input";
import { SearchBar } from "@/components/ui/search-bar";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";

type SongLite = Pick<Song, "id" | "number" | "title" | "lyrics">;

interface ArrangedItem {
  id: string;
  type: LyricsSectionType;
  text: string;
}

interface SelectedSong {
  song: SongLite;
  arranged: ArrangedItem[];
}

const CHORUS_MARK = "አዝ";
const TYPE_MARK: Partial<Record<LyricsSectionType, string>> = {
  bridge: "BR",
  intro: "IN",
  outro: "OUT",
  other: "•",
};

function sectionMark(type: LyricsSectionType, verseNumber?: number): string {
  if (type === "verse") return String(verseNumber ?? 1).padStart(2, "0");
  if (type === "chorus") return CHORUS_MARK;
  return TYPE_MARK[type] ?? "•";
}

// Default performance order: stored order, with a single chorus
// auto-repeated after every verse (matching the choir's own reference deck)
// — skipped where the admin already placed that chorus right there in the
// stored data. Ambiguous cases (zero or multiple distinct choruses) are
// left as plain stored order rather than guessed.
function defaultArrangement(lyrics: Song["lyrics"]): ArrangedItem[] {
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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function songSlideCount(arranged: ArrangedItem[], maxLines: number): number {
  return 1 + arranged.reduce((sum, item) => sum + chunkLines(item.text, maxLines).length, 0);
}

interface PreviewSlide {
  lines: string[];
  songIndex: number | null;
}

function buildPreview(
  deckTitle: string,
  displayDate: string,
  closingPhrase: string,
  maxLines: number,
  selected: SelectedSong[],
): PreviewSlide[] {
  const slides: PreviewSlide[] = [{ lines: [deckTitle || "Songs", displayDate].filter(Boolean), songIndex: null }];
  selected.forEach((entry, i) => {
    slides.push({ lines: [entry.song.title], songIndex: i + 1 });
    for (const item of entry.arranged) {
      for (const chunk of chunkLines(item.text, maxLines)) {
        slides.push({ lines: chunk.length > 0 ? chunk : [""], songIndex: i + 1 });
      }
    }
  });
  slides.push({ lines: [closingPhrase || ""], songIndex: null });
  return slides;
}

export function SlideGenerator({ songs }: { songs: SongLite[] }) {
  const [selected, setSelected] = useState<SelectedSong[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [deckTitle, setDeckTitle] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [closingPhrase, setClosingPhrase] = useState("ተባረኩ");
  const [maxLinesPerSlide, setMaxLinesPerSlide] = useState(4);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerChecked, setPickerChecked] = useState<Set<string>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.song.id)), [selected]);
  const query = pickerSearch.trim().toLowerCase();
  const pickerRows = useMemo(
    () =>
      songs.filter(
        (s) => !query || s.title.toLowerCase().includes(query) || String(s.number).includes(query),
      ),
    [songs, query],
  );

  const displayDate = formatDisplayDate(date);
  const totalSlides = 1 + selected.reduce((sum, e) => sum + songSlideCount(e.arranged, maxLinesPerSlide), 0) + 1;
  const preview = useMemo(
    () => buildPreview(deckTitle, displayDate, closingPhrase, maxLinesPerSlide, selected),
    [deckTitle, displayDate, closingPhrase, maxLinesPerSlide, selected],
  );

  function openPicker() {
    setPickerChecked(new Set());
    setPickerSearch("");
    setShowPicker(true);
  }

  function togglePicked(id: string) {
    setPickerChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmPicker() {
    const toAdd = songs.filter((s) => pickerChecked.has(s.id));
    setSelected((prev) => [...prev, ...toAdd.map((song) => ({ song, arranged: defaultArrangement(song.lyrics) }))]);
    setShowPicker(false);
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

  function removeSection(songId: string, index: number) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    updateArranged(
      songId,
      entry.arranged.filter((_, i) => i !== index),
    );
  }

  function appendSection(songId: string, type: LyricsSectionType, text: string) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    updateArranged(songId, [...entry.arranged, { id: crypto.randomUUID(), type, text }]);
  }

  function resetArrangement(songId: string) {
    const entry = selected.find((s) => s.song.id === songId);
    if (!entry) return;
    updateArranged(songId, defaultArrangement(entry.song.lyrics));
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const spec: SlideDeckSpec = {
        deckTitle: deckTitle.trim() || "Songs",
        date: displayDate,
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

  if (showPicker) {
    const addCount = pickerChecked.size;
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar onClose={() => setShowPicker(false)} />
        <div className="px-5 pb-3">
          <SearchBar value={pickerSearch} onChange={setPickerSearch} placeholder="Search title or number…" autoFocus />
        </div>
        <div className="flex-1 divide-y divide-rule">
          {pickerRows.map((song) => {
            const alreadyIn = selectedIds.has(song.id);
            const checked = pickerChecked.has(song.id);
            return (
              <button
                key={song.id}
                type="button"
                disabled={alreadyIn}
                onClick={() => togglePicked(song.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left disabled:opacity-45"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${
                    checked ? "border-fill bg-fill" : "border-rule-2"
                  }`}
                >
                  {checked && <Check size={14} strokeWidth={3} className="text-on-fill" aria-hidden />}
                </span>
                <span className="type-mono shrink-0 text-muted">{String(song.number).padStart(3, "0")}</span>
                <span className="type-body min-w-0 flex-1 truncate text-ink">{song.title}</span>
                {alreadyIn && <span className="type-meta shrink-0 text-label">Already in deck</span>}
              </button>
            );
          })}
        </div>
        <StickyFooterAction>
          <Button icon={Plus} disabled={addCount === 0} onClick={confirmPicker}>
            {addCount === 0 ? "Select songs to add" : `Add ${addCount} ${addCount === 1 ? "song" : "songs"}`}
          </Button>
        </StickyFooterAction>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <TopBar title="Slides" right={<span className="type-mono text-muted">{totalSlides} slides</span>} />

      <div className="space-y-6 px-5 py-5">
        <section className="space-y-3">
          <TextInput
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            label="Deck title"
            placeholder="e.g. Sunday Service"
            compact
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              label="Date"
              compact
            />
            <TextInput
              value={closingPhrase}
              onChange={(e) => setClosingPhrase(e.target.value)}
              label="Closing slide text"
              compact
            />
          </div>
          <TextInput
            type="number"
            min={1}
            max={10}
            value={maxLinesPerSlide}
            onChange={(e) => setMaxLinesPerSlide(Number(e.target.value) || 4)}
            label="Max lines per lyric slide"
            compact
            className="w-24"
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="type-section-label">Songs · {selected.length}</p>
            <Button variant="text" icon={Plus} onClick={openPicker}>
              Add songs
            </Button>
          </div>

          {selected.length === 0 ? (
            <p className="type-meta">No songs added yet.</p>
          ) : (
            <div className="divide-y divide-rule border-y border-rule">
              {selected.map((entry, songIndex) => {
                const marks = entry.arranged.map((item, i) => {
                  const verseIdx = entry.arranged.slice(0, i + 1).filter((a) => a.type === "verse").length;
                  return sectionMark(item.type, verseIdx);
                });
                const slideCount = songSlideCount(entry.arranged, maxLinesPerSlide);
                const expanded = expandedId === entry.song.id;
                const distinctSections = annotateSections(entry.song.lyrics).filter((s) => !s.isRepeat);

                return (
                  <div key={entry.song.id}>
                    <div className="flex w-full items-start gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : entry.song.id)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <span className="type-mono pt-0.5 text-muted">{String(songIndex + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="type-body text-ink">{entry.song.title}</p>
                          <p className="type-meta truncate">
                            {slideCount} {slideCount === 1 ? "slide" : "slides"} · {marks.join(" ")}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="icon"
                          icon={ArrowUp}
                          aria-label="Move up"
                          disabled={songIndex === 0}
                          onClick={() => moveSong(songIndex, -1)}
                        />
                        <Button
                          type="button"
                          variant="icon"
                          icon={ArrowDown}
                          aria-label="Move down"
                          disabled={songIndex === selected.length - 1}
                          onClick={() => moveSong(songIndex, 1)}
                        />
                        <Button
                          type="button"
                          variant="icon"
                          icon={X}
                          aria-label="Remove song"
                          onClick={() => removeSong(entry.song.id)}
                        />
                      </div>
                    </div>

                    {expanded && (
                      <div className="space-y-3 bg-surface p-4">
                        <div className="flex items-center justify-between">
                          <p className="type-section-label">Sung order</p>
                          <Button variant="text" onClick={() => resetArrangement(entry.song.id)}>
                            Reset to song order
                          </Button>
                        </div>

                        <div className="divide-y divide-rule border-y border-rule">
                          {entry.arranged.map((item, i) => {
                            const verseIdx = entry.arranged.slice(0, i + 1).filter((a) => a.type === "verse").length;
                            const firstLine = item.text.split("\n")[0] ?? "";
                            return (
                              <div key={item.id} className="flex items-center gap-3 py-2">
                                <span
                                  className={item.type === "chorus" ? "text-[13px] font-bold shrink-0 text-label" : "type-mono shrink-0 text-accent"}
                                  style={item.type === "chorus" ? { fontFamily: "var(--font-noto-ethiopic)" } : undefined}
                                >
                                  {sectionMark(item.type, verseIdx)}
                                </span>
                                <p className="type-body min-w-0 flex-1 truncate text-ink">{firstLine}</p>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button
                                    variant="icon"
                                    icon={ArrowUp}
                                    aria-label="Move up"
                                    disabled={i === 0}
                                    onClick={() => moveSection(entry.song.id, i, -1)}
                                  />
                                  <Button
                                    variant="icon"
                                    icon={ArrowDown}
                                    aria-label="Move down"
                                    disabled={i === entry.arranged.length - 1}
                                    onClick={() => moveSection(entry.song.id, i, 1)}
                                  />
                                  <Button
                                    variant="icon"
                                    icon={X}
                                    aria-label="Remove"
                                    onClick={() => removeSection(entry.song.id, i)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <p className="type-field-label text-muted">Tap to add to the end</p>
                        <div className="flex flex-wrap gap-2">
                          {distinctSections.map((s, i) => (
                            <Chip
                              key={i}
                              label={`${sectionMark(s.type, s.verseNumber)} ${s.label ?? (s.type === "chorus" ? "Chorus" : s.type)}`}
                              onClick={() => appendSection(entry.song.id, s.type, s.text)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="type-section-label">Preview</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {preview.map((slide, i) => (
              <div key={i} className="w-32 shrink-0 space-y-1">
                <div className="flex aspect-video w-32 items-center justify-center bg-black p-2">
                  <p className="text-center text-[9px] font-bold leading-tight text-white">
                    {slide.lines.map((line, li) => (
                      <span key={li} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </div>
                <p className="type-mono text-center text-[10px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                  {slide.songIndex != null ? ` · ${String(slide.songIndex).padStart(2, "0")}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="type-body text-danger">{error}</p>}
      </div>

      <StickyFooterAction>
        <Button icon={Download} disabled={generating || selected.length === 0} onClick={handleGenerate}>
          {generating ? "Generating…" : `Generate PowerPoint · ${totalSlides} slides`}
        </Button>
      </StickyFooterAction>
    </div>
  );
}
