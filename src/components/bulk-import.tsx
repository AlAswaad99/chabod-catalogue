"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Undo2, X } from "lucide-react";
import { parseBulkImportText, type ParsedSongDraft, type MetadataGuess } from "@/lib/bulk-import/parse";
import { createOrGetMetadataField, addOptionToField } from "@/lib/actions/metadata-fields";
import { saveSong } from "@/lib/actions/songs";
import { annotateSections } from "@/lib/lyrics";
import { TopBar } from "@/components/ui/top-bar";
import { TextArea, TextInput } from "@/components/ui/text-input";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import type { LyricsSectionType } from "@/types/song";

const CHORUS_MARK = "አዝ";
const TYPE_MARK: Partial<Record<LyricsSectionType, string>> = {
  bridge: "BR",
  intro: "IN",
  outro: "OUT",
  other: "•",
};

type EntryStatus =
  | { kind: "pending" }
  | { kind: "saved"; number: number }
  | { kind: "discarded" };

interface Entry {
  draft: ParsedSongDraft;
  displayNumber: number;
  status: EntryStatus;
  saving: boolean;
  error: string | null;
}

async function commitDraft(draft: ParsedSongDraft): Promise<{ number: number | null; error: string | null }> {
  const metadata: Record<string, string> = {};

  for (const guess of draft.metadataGuesses) {
    const { data: field, error } = await createOrGetMetadataField({
      name: guess.fieldName,
      type: guess.fieldType,
      options: guess.fieldType === "single_select" ? [guess.value] : [],
    });
    if (error || !field) {
      return { number: null, error: error ?? `Couldn't create field "${guess.fieldName}".` };
    }

    if (guess.fieldType === "single_select") {
      const hasOption = field.options.some((o) => o.toLowerCase() === guess.value.toLowerCase());
      if (!hasOption) {
        const { error: optionError } = await addOptionToField(field.id, guess.value);
        if (optionError) return { number: null, error: optionError };
      }
    }

    metadata[field.id] = guess.value;
  }

  const { data, error } = await saveSong({ title: draft.title, lyrics: draft.lyrics, metadata });
  if (error || !data) {
    return { number: null, error: error ?? "Couldn't save song." };
  }
  return { number: data.number, error: null };
}

function sectionSummaryMark(type: LyricsSectionType, verseNumber?: number): string {
  if (type === "verse") return String(verseNumber ?? 1).padStart(2, "0");
  if (type === "chorus") return CHORUS_MARK;
  return TYPE_MARK[type] ?? "•";
}

function DraftCard({
  entry,
  onChangeTitle,
  onRemoveGuess,
  onSave,
  onMergeNext,
  canMergeNext,
  onDiscard,
}: {
  entry: Entry;
  onChangeTitle: (title: string) => void;
  onRemoveGuess: (index: number) => void;
  onSave: () => void;
  onMergeNext: () => void;
  canMergeNext: boolean;
  onDiscard: () => void;
}) {
  const { draft, saving, error } = entry;

  return (
    <div className="space-y-3 border-t-2 border-rule-2 bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="type-mono text-muted shrink-0">Draft {entry.displayNumber}</span>
        <TextInput
          value={draft.title}
          onChange={(e) => onChangeTitle(e.target.value)}
          compact
          className="flex-1"
          aria-label="Song title"
        />
      </div>

      {draft.metadataGuesses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {draft.metadataGuesses.map((guess: MetadataGuess, i) => (
            <Chip
              key={`${guess.fieldName}-${i}`}
              label={`${guess.fieldName} ${guess.value}`}
              onRemove={() => onRemoveGuess(i)}
            />
          ))}
          <span className="type-meta">guessed</span>
        </div>
      )}

      <div className="divide-y divide-rule border-y border-rule">
        {annotateSections(draft.lyrics).map((section, i) => {
          if (section.isRepeat) {
            const firstLine = section.text.split("\n")[0] ?? "";
            return (
              <div key={i} className="flex items-center gap-3 py-2">
                <p className="type-body min-w-0 flex-1 truncate text-muted">
                  Repeat · <span className="text-ink">Chorus</span> · {firstLine}
                </p>
              </div>
            );
          }
          const firstLine = section.text.split("\n")[0] ?? "";
          const lineCount = section.text.split("\n").filter((l) => l.trim() !== "").length;
          return (
            <div key={i} className="flex items-center gap-3 py-2">
              <span
                className={
                  section.type === "chorus"
                    ? "type-badge shrink-0 text-label"
                    : "type-mono shrink-0 text-accent"
                }
                style={section.type === "chorus" ? { fontFamily: "var(--font-noto-ethiopic)" } : undefined}
              >
                {sectionSummaryMark(section.type, section.verseNumber)}
              </span>
              <p className="type-body min-w-0 flex-1 truncate text-ink">{firstLine}</p>
              <span className="type-meta shrink-0">
                {lineCount} {lineCount === 1 ? "line" : "lines"}
              </span>
            </div>
          );
        })}
      </div>

      {error && <p className="type-meta text-danger">{error}</p>}

      <div className="grid grid-cols-3 gap-px border border-rule bg-rule">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-11 items-center justify-center gap-1.5 bg-fill type-action text-on-fill disabled:opacity-45"
        >
          <Check size={16} strokeWidth={2.4} aria-hidden />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onMergeNext}
          disabled={!canMergeNext}
          className="flex h-11 items-center justify-center bg-surface type-body font-semibold text-ink disabled:opacity-45"
        >
          Merge next
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="flex h-11 items-center justify-center bg-surface type-body font-semibold text-danger"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

export function BulkImport() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);

  function handleParse() {
    setEntries(
      parseBulkImportText(rawText).map((draft, i) => ({
        draft,
        displayNumber: i + 1,
        status: { kind: "pending" },
        saving: false,
        error: null,
      })),
    );
  }

  function updateEntry(index: number, patch: Partial<Entry>) {
    setEntries((prev) => (prev ? prev.map((e, i) => (i === index ? { ...e, ...patch } : e)) : prev));
  }

  function updateDraft(index: number, patch: Partial<ParsedSongDraft>) {
    setEntries((prev) =>
      prev ? prev.map((e, i) => (i === index ? { ...e, draft: { ...e.draft, ...patch } } : e)) : prev,
    );
  }

  function removeGuess(index: number, guessIndex: number) {
    setEntries((prev) =>
      prev
        ? prev.map((e, i) =>
            i === index
              ? { ...e, draft: { ...e.draft, metadataGuesses: e.draft.metadataGuesses.filter((_, gi) => gi !== guessIndex) } }
              : e,
          )
        : prev,
    );
  }

  function mergeNext(index: number) {
    setEntries((prev) => {
      if (!prev) return prev;
      const current = prev[index];
      const next = prev[index + 1];
      if (!current || !next) return prev;
      const merged: ParsedSongDraft = {
        ...current.draft,
        lyrics: [...current.draft.lyrics, ...next.draft.lyrics],
        metadataGuesses: [...current.draft.metadataGuesses, ...next.draft.metadataGuesses],
        rawBlock: `${current.draft.rawBlock}\n\n${next.draft.rawBlock}`,
      };
      const out = [...prev];
      out.splice(index, 2, { ...current, draft: merged });
      return out;
    });
  }

  async function saveEntry(index: number) {
    const entry = entries?.[index];
    if (!entry) return;
    updateEntry(index, { saving: true, error: null });
    const { number, error } = await commitDraft(entry.draft);
    if (error || number === null) {
      updateEntry(index, { saving: false, error: error ?? "Couldn't save song." });
      return;
    }
    updateEntry(index, { saving: false, status: { kind: "saved", number } });
  }

  async function handleSaveAll() {
    if (!entries) return;
    // Sequential on purpose: each save can create/reuse metadata fields a
    // later draft in the same batch might also reference.
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].status.kind !== "pending") continue;
      await saveEntry(i);
    }
  }

  const pendingCount = entries?.filter((e) => e.status.kind === "pending").length ?? 0;

  if (!entries) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar title="Import lyrics" backHref="/catalogue" />
        <div className="flex flex-1 flex-col gap-4 px-5 py-5">
          <p className="type-meta">
            Paste one or more songs below. Separate distinct songs with a blank line or two — a run of
            🎤 tag lines (e.g. 🎤Key, G) is recognized as metadata for the song that follows it.
          </p>
          <TextArea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw lyrics here…"
            className="type-lyrics min-h-[50vh] flex-1 text-[16px]"
          />
        </div>
        <StickyFooterAction>
          <Button icon={ArrowRight} disabled={!rawText.trim()} onClick={handleParse}>
            Split into songs
          </Button>
        </StickyFooterAction>
      </div>
    );
  }

  const needsALook = entries.filter((e) => e.status.kind === "pending" && e.draft.titleIsGuess).length;

  return (
    <div className="pb-24">
      <TopBar
        title="Import lyrics"
        right={
          <Button variant="text" onClick={() => setEntries(null)}>
            Edit paste
          </Button>
        }
      />
      <p className="type-meta border-b-2 border-rule px-5 pb-3 pt-1">
        {entries.length} {entries.length === 1 ? "draft" : "drafts"} found
        {needsALook > 0 ? ` · ${needsALook} needs a look` : ""}
      </p>

      <div className="space-y-4 px-5 py-4">
        {entries.map((entry, i) => {
          if (entry.status.kind === "saved") {
            return (
              <div key={i} className="flex items-center gap-3 border-b border-rule py-3">
                <Check size={18} strokeWidth={2.4} className="shrink-0 text-label" aria-hidden />
                <p className="type-body min-w-0 flex-1 truncate text-ink">{entry.draft.title}</p>
                <span className="type-meta shrink-0">Saved as No. {String(entry.status.number).padStart(3, "0")}</span>
              </div>
            );
          }
          if (entry.status.kind === "discarded") {
            return (
              <div key={i} className="flex items-center gap-3 border-b border-rule py-3">
                <X size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
                <p className="type-body min-w-0 flex-1 truncate text-muted line-through">{entry.draft.title}</p>
                <Button
                  variant="text"
                  icon={Undo2}
                  onClick={() => updateEntry(i, { status: { kind: "pending" } })}
                >
                  Undo
                </Button>
              </div>
            );
          }
          return (
            <DraftCard
              key={i}
              entry={entry}
              onChangeTitle={(title) => updateDraft(i, { title, titleIsGuess: false })}
              onRemoveGuess={(gi) => removeGuess(i, gi)}
              onSave={() => saveEntry(i)}
              onMergeNext={() => mergeNext(i)}
              canMergeNext={i < entries.length - 1 && entries[i + 1].status.kind === "pending"}
              onDiscard={() => updateEntry(i, { status: { kind: "discarded" } })}
            />
          );
        })}
      </div>

      <StickyFooterAction>
        {pendingCount > 0 ? (
          <Button icon={Check} onClick={handleSaveAll}>
            Save all {pendingCount} remaining
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => router.push("/catalogue")}>
            Done · back to catalogue
          </Button>
        )}
      </StickyFooterAction>
    </div>
  );
}
