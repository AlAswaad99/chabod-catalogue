"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Scissors, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextArea, TextInput, Select } from "@/components/ui/text-input";
import type { LyricsSection, LyricsSectionType } from "@/types/song";

const SECTION_TYPES: { value: LyricsSectionType; label: string }[] = [
  { value: "verse", label: "Verse" },
  { value: "chorus", label: "Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "other", label: "Other" },
];

export function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** A lyrics section as the editors hold it: stable id for React keys, label never undefined. */
export interface LyricsItem {
  id: string;
  type: LyricsSectionType;
  label: string;
  text: string;
}

// Reconstructs the editor's client-only item list (with stable ids) from
// stored sections. A section that happens to duplicate another's
// {type, text} is still detected and collapsed as a repeat on read
// (src/lib/lyrics.ts), but here every item is fully independent and editable.
export function itemsFromSections(sections: LyricsSection[]): LyricsItem[] {
  const items = sections.map((s) => ({ id: makeId(), type: s.type, label: s.label ?? "", text: s.text }));
  return items.length > 0 ? items : [{ id: makeId(), type: "verse" as LyricsSectionType, label: "", text: "" }];
}

export function itemsToSections(items: LyricsItem[]): LyricsSection[] {
  return items
    .filter((it) => it.text.trim().length > 0)
    .map((it) => ({ type: it.type, label: it.label.trim() || undefined, text: it.text }));
}

function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// The section list shared by Edit song and the import editor: type, label,
// text, reorder, duplicate, delete, add. Controlled — the parent owns `items`.
// `onSplitAt` (import only) adds a "start a new song here" action per section.
export function LyricsEditor({
  items,
  onChange,
  onSplitAt,
}: {
  items: LyricsItem[];
  onChange: (items: LyricsItem[]) => void;
  onSplitAt?: (index: number) => void;
}) {
  function update(id: string, patch: Partial<LyricsItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function move(id: string, direction: -1 | 1) {
    const idx = items.findIndex((it) => it.id === id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function add() {
    onChange([...items, { id: makeId(), type: "verse", label: "", text: "" }]);
  }

  function duplicate(id: string) {
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return;
    const source = items[idx];
    const next = [...items];
    next.splice(idx + 1, 0, { id: makeId(), type: source.type, label: source.label, text: source.text });
    onChange(next);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="type-section-label">
          Lyrics · {items.length} {items.length === 1 ? "part" : "parts"}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="space-y-3 rounded-md border border-rule bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="type-mono text-brand">{String(idx + 1).padStart(2, "0")}</span>
              <Select
                value={item.type}
                onChange={(e) => update(item.id, { type: e.target.value as LyricsSectionType })}
                compact
                className="flex-1"
                aria-label="Section type"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="icon"
                  icon={ArrowUp}
                  aria-label="Move up"
                  disabled={idx === 0}
                  onClick={() => move(item.id, -1)}
                />
                <Button
                  type="button"
                  variant="icon"
                  icon={ArrowDown}
                  aria-label="Move down"
                  disabled={idx === items.length - 1}
                  onClick={() => move(item.id, 1)}
                />
                <Button
                  type="button"
                  variant="icon"
                  icon={Trash}
                  aria-label="Delete section"
                  className="text-danger"
                  onClick={() => remove(item.id)}
                />
              </div>
            </div>

            <TextInput
              value={item.label}
              onChange={(e) => update(item.id, { label: e.target.value })}
              placeholder="Label (optional), e.g. Verse 1"
              compact
            />

            <TextArea
              value={item.text}
              onChange={(e) => update(item.id, { text: e.target.value })}
              onInput={autoGrow}
              placeholder="One lyric line per row. A blank line starts an indented response."
              className="min-h-[100px] overflow-hidden"
            />

            <div className="flex flex-wrap items-center gap-x-5">
              <Button type="button" variant="text" icon={Copy} onClick={() => duplicate(item.id)}>
                Duplicate section
              </Button>
              {onSplitAt && idx > 0 && (
                <Button type="button" variant="text" icon={Scissors} onClick={() => onSplitAt(idx)}>
                  Start a new song here
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" icon={Plus} onClick={add}>
        Add section
      </Button>
    </section>
  );
}
