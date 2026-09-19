"use client";

import { useState } from "react";
import Link from "next/link";
import { parseBulkImportText, type ParsedSongDraft, type MetadataGuess } from "@/lib/bulk-import/parse";
import { createOrGetMetadataField, addOptionToField } from "@/lib/actions/metadata-fields";
import { saveSong } from "@/lib/actions/songs";
import type { LyricsSection, LyricsSectionType } from "@/types/song";

const SECTION_TYPES: LyricsSectionType[] = ["verse", "chorus", "bridge", "intro", "outro", "other"];

async function commitDraft(draft: ParsedSongDraft): Promise<{ songId: string | null; error: string | null }> {
  const metadata: Record<string, string> = {};

  for (const guess of draft.metadataGuesses) {
    const { data: field, error } = await createOrGetMetadataField({
      name: guess.fieldName,
      type: guess.fieldType,
      options: guess.fieldType === "single_select" ? [guess.value] : [],
    });
    if (error || !field) {
      return { songId: null, error: error ?? `Couldn't create field "${guess.fieldName}".` };
    }

    if (guess.fieldType === "single_select") {
      const hasOption = field.options.some((o) => o.toLowerCase() === guess.value.toLowerCase());
      if (!hasOption) {
        const { error: optionError } = await addOptionToField(field.id, guess.value);
        if (optionError) return { songId: null, error: optionError };
      }
    }

    metadata[field.id] = guess.value;
  }

  const { data, error } = await saveSong({ title: draft.title, lyrics: draft.lyrics, metadata });
  if (error || !data) {
    return { songId: null, error: error ?? "Couldn't save song." };
  }
  return { songId: data.id, error: null };
}

function DraftEditor({
  draft,
  onChange,
  onDiscard,
  onMergeUp,
  canMergeUp,
  onSaved,
}: {
  draft: ParsedSongDraft;
  onChange: (next: ParsedSongDraft) => void;
  onDiscard: () => void;
  onMergeUp: () => void;
  canMergeUp: boolean;
  onSaved: (songId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  function updateSection(index: number, patch: Partial<LyricsSection>) {
    onChange({
      ...draft,
      lyrics: draft.lyrics.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }

  function removeSection(index: number) {
    onChange({ ...draft, lyrics: draft.lyrics.filter((_, i) => i !== index) });
  }

  function updateGuess(index: number, patch: Partial<MetadataGuess>) {
    onChange({
      ...draft,
      metadataGuesses: draft.metadataGuesses.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    });
  }

  function removeGuess(index: number) {
    onChange({ ...draft, metadataGuesses: draft.metadataGuesses.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { songId, error } = await commitDraft(draft);
    setSaving(false);
    if (error || !songId) {
      setError(error ?? "Couldn't save song.");
      return;
    }
    onSaved(songId);
  }

  return (
    <div className="space-y-3 rounded-lg border border-foreground/10 p-4">
      <div className="flex items-start justify-between gap-2">
        <input
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value, titleIsGuess: false })}
          className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-base font-medium"
        />
        {draft.titleIsGuess && (
          <span className="shrink-0 rounded-full bg-amber-600/10 px-2 py-1 text-xs text-amber-700">
            guessed title
          </span>
        )}
      </div>

      <div className="space-y-2">
        {draft.lyrics.map((section, i) => (
          <div key={i} className="space-y-1 rounded-md border border-foreground/10 p-2">
            <div className="flex gap-2">
              <select
                value={section.type}
                onChange={(e) => updateSection(i, { type: e.target.value as LyricsSectionType })}
                className="rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                placeholder="Label"
                value={section.label ?? ""}
                onChange={(e) => updateSection(i, { label: e.target.value })}
                className="flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs"
              />
              <button type="button" onClick={() => removeSection(i)} className="text-xs text-red-600">
                Remove
              </button>
            </div>
            <textarea
              value={section.text}
              onChange={(e) => updateSection(i, { text: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-foreground/20 bg-transparent px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>

      {draft.metadataGuesses.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground/60">Detected metadata</p>
          {draft.metadataGuesses.map((guess, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs text-foreground/60">{guess.fieldName}</span>
              <input
                value={guess.value}
                onChange={(e) => updateGuess(i, { value: e.target.value })}
                className="flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => removeGuess(i)} className="text-xs text-red-600">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <details open={showRaw} onToggle={(e) => setShowRaw(e.currentTarget.open)}>
        <summary className="cursor-pointer text-xs text-foreground/50">Original pasted text</summary>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-foreground/50">{draft.rawBlock}</pre>
      </details>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save this song"}
        </button>
        {canMergeUp && (
          <button type="button" onClick={onMergeUp} className="text-sm text-foreground/60 underline">
            Merge with previous
          </button>
        )}
        <button type="button" onClick={onDiscard} className="text-sm text-red-600">
          Discard
        </button>
      </div>
    </div>
  );
}

export function BulkImport() {
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState<ParsedSongDraft[] | null>(null);
  const [savedSongs, setSavedSongs] = useState<{ id: string; title: string }[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  function handleParse() {
    setDrafts(parseBulkImportText(rawText));
    setSavedSongs([]);
  }

  function updateDraft(id: string, next: ParsedSongDraft) {
    setDrafts((prev) => prev?.map((d) => (d.id === id ? next : d)) ?? null);
  }

  function discardDraft(id: string) {
    setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
  }

  function mergeUp(index: number) {
    setDrafts((prev) => {
      if (!prev) return prev;
      const upper = prev[index - 1];
      const lower = prev[index];
      const merged: ParsedSongDraft = {
        ...upper,
        lyrics: [...upper.lyrics, ...lower.lyrics],
        metadataGuesses: [...upper.metadataGuesses, ...lower.metadataGuesses],
        rawBlock: `${upper.rawBlock}\n\n${lower.rawBlock}`,
      };
      const next = [...prev];
      next.splice(index - 1, 2, merged);
      return next;
    });
  }

  function handleSaved(id: string, songId: string, title: string) {
    setSavedSongs((prev) => [...prev, { id: songId, title }]);
    setDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
  }

  async function handleSaveAll() {
    if (!drafts) return;
    setSavingAll(true);
    // Sequential on purpose: Server Actions dispatch one at a time per
    // client anyway, and each save can create/reuse metadata fields that a
    // later draft in the same batch might also reference.
    for (const draft of [...drafts]) {
      const { songId, error } = await commitDraft(draft);
      if (!error && songId) {
        handleSaved(draft.id, songId, draft.title);
      }
    }
    setSavingAll(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bulk import</h1>
        <p className="text-sm text-foreground/60">
          Paste one or more songs below. Separate distinct songs with a blank line or two — a run of
          🎤 tag lines (e.g. <code>🎤Title, Song Name</code>) is recognized as metadata for the song
          that follows it. Review and fix each proposed song before saving.
        </p>
      </div>

      {savedSongs.length > 0 && (
        <div className="rounded-lg border border-green-600/20 bg-green-600/5 p-3 text-sm">
          <p className="font-medium text-green-700">Saved {savedSongs.length} song(s):</p>
          <ul className="mt-1 space-y-0.5">
            {savedSongs.map((s) => (
              <li key={s.id}>
                <Link href={`/songs/${s.id}`} className="underline">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!drafts && (
        <div className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={16}
            placeholder="Paste raw lyrics here…"
            className="w-full rounded-lg border border-foreground/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="rounded-lg bg-foreground text-background px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Parse into songs
          </button>
        </div>
      )}

      {drafts && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground/60">{drafts.length} song(s) found</p>
            <div className="flex gap-3">
              {drafts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  {savingAll ? "Saving all…" : "Save all"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDrafts(null);
                  setRawText("");
                }}
                className="text-sm text-foreground/60 underline"
              >
                Start over
              </button>
            </div>
          </div>

          {drafts.length === 0 ? (
            <p className="text-sm text-foreground/50">
              All songs from this paste have been saved or discarded.
            </p>
          ) : (
            drafts.map((draft, i) => (
              <DraftEditor
                key={draft.id}
                draft={draft}
                onChange={(next) => updateDraft(draft.id, next)}
                onDiscard={() => discardDraft(draft.id)}
                onMergeUp={() => mergeUp(i)}
                canMergeUp={i > 0}
                onSaved={(songId) => handleSaved(draft.id, songId, draft.title)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
