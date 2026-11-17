"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Merge, Plus, Undo2, X } from "lucide-react";
import { parseBulkImportText, type ParsedSongDraft } from "@/lib/bulk-import/parse";
import { createOrGetMetadataField, addOptionToField } from "@/lib/actions/metadata-fields";
import { saveSong } from "@/lib/actions/songs";
import { useToast } from "@/components/ui/toast";
import { TopBar } from "@/components/ui/top-bar";
import { TextArea, TextInput, Select } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import {
  LyricsEditor,
  itemsFromSections,
  itemsToSections,
  makeId,
  type LyricsItem,
} from "@/components/lyrics-editor";
import type { MetadataFieldDefinition, MetadataFieldType } from "@/types/song";

// ───────────────────────── types ─────────────────────────

interface Detail {
  key: string;
  fieldName: string;
  fieldType: MetadataFieldType;
  value: string;
}

interface DraftState {
  title: string;
  titleIsGuess: boolean;
  items: LyricsItem[];
  details: Detail[];
  /** Blank = "highest number + 1" at save time. */
  numberInput: string;
}

type EntryStatus =
  | { kind: "pending" }
  | { kind: "saved"; id: string; number: number }
  | { kind: "discarded" };

interface Entry {
  key: string;
  /** The raw pasted block this draft was last read from (blank once built by hand). */
  baseRaw: string;
  draft: DraftState;
  /** True once the user has changed anything in the editor. */
  edited: boolean;
  /** The pasted text for this draft changed after it was edited — waiting for a decision. */
  pendingRaw: ParsedSongDraft | null;
  status: EntryStatus;
  saving: boolean;
  error: string | null;
}

interface SongNumber {
  id: string;
  number: number;
  title: string;
}

const FIELD_TYPE_OPTIONS: { value: MetadataFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single-select" },
  { value: "multi_select", label: "Multi-select" },
];

const MAX_NUMBER = 9999;

// ───────────────────────── helpers ─────────────────────────

function toDraftState(p: ParsedSongDraft): DraftState {
  return {
    title: p.title,
    titleIsGuess: p.titleIsGuess,
    items: itemsFromSections(p.lyrics),
    details: p.metadataGuesses.map((g) => ({
      key: makeId(),
      fieldName: g.fieldName,
      fieldType: g.fieldType,
      value: g.value,
    })),
    numberInput: "",
  };
}

function newEntry(p: ParsedSongDraft, key?: string, status?: EntryStatus): Entry {
  return {
    key: key ?? makeId(),
    baseRaw: p.rawBlock,
    draft: toDraftState(p),
    edited: false,
    pendingRaw: null,
    status: status ?? { kind: "pending" },
    saving: false,
    error: null,
  };
}

// Matches freshly parsed drafts to the existing entries by position. Untouched
// drafts follow the pasted text; ones the user has edited are never overwritten
// silently — they get a `pendingRaw` and the editor asks first.
function reconcile(prev: Entry[], parsed: ParsedSongDraft[]): Entry[] {
  const next: Entry[] = [];
  parsed.forEach((p, i) => {
    const e = prev[i];
    if (!e) next.push(newEntry(p));
    else if (e.status.kind === "saved") next.push(e);
    else if (e.baseRaw === p.rawBlock) next.push(e.pendingRaw ? { ...e, pendingRaw: null } : e);
    else if (!e.edited) next.push(newEntry(p, e.key, e.status));
    else next.push({ ...e, pendingRaw: p });
  });
  // Text that was deleted from the paste: keep anything saved or hand-edited.
  for (let i = parsed.length; i < prev.length; i++) {
    if (prev[i].status.kind === "saved" || prev[i].edited) next.push(prev[i]);
  }
  return next;
}

function numberOf(input: string): number | null {
  const t = input.trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
}

function firstLine(text: string): string {
  return (text.split("\n").find((l) => l.trim() !== "") ?? "").trim();
}

// Creates/reuses each detail's field, then saves the song. Sequential so a
// field created for one draft is reused by the next.
async function commitDraft(
  draft: DraftState,
  number: number | undefined,
): Promise<{ id: string | null; number: number | null; error: string | null }> {
  const metadata: Record<string, string | string[]> = {};

  for (const detail of draft.details) {
    const value = detail.value.trim();
    if (!value) continue;

    const isSelect = detail.fieldType === "single_select" || detail.fieldType === "multi_select";
    const { data: field, error } = await createOrGetMetadataField({
      name: detail.fieldName,
      type: detail.fieldType,
      options: isSelect ? [value] : [],
    });
    if (error || !field) {
      return { id: null, number: null, error: error ?? `Couldn't create field "${detail.fieldName}".` };
    }

    // The field may already exist with a different type than the guess.
    if (field.type === "single_select" || field.type === "multi_select") {
      if (!field.options.some((o) => o.toLowerCase() === value.toLowerCase())) {
        const { error: optionError } = await addOptionToField(field.id, value);
        if (optionError) return { id: null, number: null, error: optionError };
      }
    }
    metadata[field.id] = field.type === "multi_select" ? [value] : value;
  }

  const { data, error } = await saveSong({
    title: draft.title.trim(),
    lyrics: itemsToSections(draft.items),
    metadata,
    number,
  });
  if (error || !data) return { id: null, number: null, error: error ?? "Couldn't save song." };
  return { id: data.id, number: data.number, error: null };
}

// ───────────────────────── details editor ─────────────────────────

function DetailsEditor({
  details,
  fieldDefs,
  onChange,
}: {
  details: Detail[];
  fieldDefs: MetadataFieldDefinition[];
  onChange: (details: Detail[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<MetadataFieldType>("text");
  const [addError, setAddError] = useState<string | null>(null);

  const defByName = (name: string) => fieldDefs.find((f) => f.name.toLowerCase() === name.trim().toLowerCase());
  const matched = defByName(newName);

  function addDetail() {
    const name = newName.trim();
    if (!name) {
      setAddError("Enter a field name.");
      return;
    }
    if (details.some((d) => d.fieldName.toLowerCase() === name.toLowerCase())) {
      setAddError(`“${name}” is already on this song.`);
      return;
    }
    onChange([...details, { key: makeId(), fieldName: matched?.name ?? name, fieldType: matched?.type ?? newType, value: "" }]);
    setAdding(false);
    setNewName("");
    setAddError(null);
  }

  return (
    <section className="space-y-3">
      <p className="type-section-label">Details</p>

      {details.length === 0 && !adding && <p className="type-meta">No details detected. Tag lines like 🎤Key, G add them.</p>}

      {details.map((d) => {
        const def = defByName(d.fieldName);
        const type = def?.type ?? d.fieldType;
        const isSelect = type === "single_select" || type === "multi_select";
        const options = def ? def.options : [];
        const choices = options.includes(d.value) || d.value === "" ? options : [...options, d.value];
        const setValue = (value: string) => onChange(details.map((x) => (x.key === d.key ? { ...x, value } : x)));

        return (
          <div key={d.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="type-field-label">
                {d.fieldName}
                {!def && <span className="text-label"> · new field</span>}
              </p>
              <Button
                type="button"
                variant="icon"
                icon={X}
                className="h-9 w-9"
                aria-label={`Remove ${d.fieldName}`}
                onClick={() => onChange(details.filter((x) => x.key !== d.key))}
              />
            </div>
            {isSelect && def ? (
              <Select value={d.value} onChange={(e) => setValue(e.target.value)} compact aria-label={d.fieldName}>
                <option value="">—</option>
                {choices.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                value={d.value}
                onChange={(e) => setValue(e.target.value)}
                type={type === "number" ? "number" : "text"}
                compact
                aria-label={d.fieldName}
              />
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="space-y-3 rounded-md border border-ring/60 p-3">
          <TextInput
            label="Field name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            list="import-field-names"
            placeholder="Pick an existing field or type a new one"
            compact
            autoFocus
          />
          <datalist id="import-field-names">
            {fieldDefs.map((f) => (
              <option key={f.id} value={f.name} />
            ))}
          </datalist>
          {newName.trim() && !matched && (
            <Select label="Type of the new field" value={newType} onChange={(e) => setNewType(e.target.value as MetadataFieldType)} compact>
              {FIELD_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
          {addError && <p className="type-meta text-danger">{addError}</p>}
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="text" onClick={addDetail}>
              Add detail
            </Button>
            <Button type="button" variant="text" className="text-muted-foreground" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" icon={Plus} onClick={() => setAdding(true)}>
          Add detail
        </Button>
      )}
    </section>
  );
}

// ───────────────────────── main component ─────────────────────────

export function BulkImport({
  fieldDefs,
  songNumbers: initialSongNumbers,
}: {
  fieldDefs: MetadataFieldDefinition[];
  songNumbers: SongNumber[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState(0);
  const [pane, setPane] = useState<"paste" | "songs">("paste");
  // True after drafts were split/merged by hand: the pasted text no longer
  // lines up with them, so editing it asks before re-reading everything.
  const [detached, setDetached] = useState(false);
  const [rawStale, setRawStale] = useState(false);
  const [songNumbers, setSongNumbers] = useState(initialSongNumbers);

  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  });

  const hasText = rawText.trim().length > 0;
  const current = entries[Math.min(selected, entries.length - 1)] as Entry | undefined;
  const currentIndex = current ? entries.indexOf(current) : -1;

  // ── pasted text ──

  function handleRawChange(next: string) {
    setRawText(next);
    if (detached) {
      setRawStale(true);
      return;
    }
    const parsed = parseBulkImportText(next);
    // Non-urgent: keeps typing in the textarea responsive on long pastes.
    startTransition(() => {
      setEntries((prev) => reconcile(prev, parsed));
    });
  }

  function rereadPastedText() {
    const parsed = parseBulkImportText(rawText);
    setEntries((prev) => {
      const saved = prev.filter((e) => e.status.kind === "saved");
      const used = new Set<string>();
      return parsed.map((p) => {
        const match = saved.find((s) => !used.has(s.key) && s.baseRaw === p.rawBlock);
        if (match) {
          used.add(match.key);
          return match;
        }
        return newEntry(p);
      });
    });
    setSelected(0);
    setDetached(false);
    setRawStale(false);
  }

  // ── entry mutations ──

  function patchEntry(key: string, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function patchDraft(key: string, patch: Partial<DraftState>) {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, edited: true, error: null, draft: { ...e.draft, ...patch } } : e)),
    );
  }

  function mergeWithNext(index: number) {
    setEntries((prev) => {
      const a = prev[index];
      const b = prev[index + 1];
      if (!a || !b || b.status.kind !== "pending") return prev;
      const names = new Set(a.draft.details.map((d) => d.fieldName.toLowerCase()));
      const merged: Entry = {
        ...a,
        edited: true,
        pendingRaw: null,
        draft: {
          ...a.draft,
          items: [...a.draft.items, ...b.draft.items],
          details: [...a.draft.details, ...b.draft.details.filter((d) => !names.has(d.fieldName.toLowerCase()))],
        },
      };
      const out = [...prev];
      out.splice(index, 2, merged);
      return out;
    });
    setDetached(true);
  }

  function splitAt(index: number, itemIndex: number) {
    setEntries((prev) => {
      const e = prev[index];
      if (!e) return prev;
      const before = e.draft.items.slice(0, itemIndex);
      const after = e.draft.items.slice(itemIndex);
      const title = firstLine(after[0]?.text ?? "").slice(0, 60) || "Untitled song";
      const fresh: Entry = {
        key: makeId(),
        baseRaw: "",
        edited: true,
        pendingRaw: null,
        status: { kind: "pending" },
        saving: false,
        error: null,
        draft: { title, titleIsGuess: true, items: after, details: [], numberInput: "" },
      };
      const out = [...prev];
      out.splice(index, 1, { ...e, edited: true, pendingRaw: null, draft: { ...e.draft, items: before } }, fresh);
      return out;
    });
    setSelected(index + 1);
    setDetached(true);
  }

  // ── numbering ──

  // Numbers already used by saved songs plus the ones typed on other pending drafts.
  function clashFor(entry: Entry): string | null {
    const n = numberOf(entry.draft.numberInput);
    if (n === null) return null;
    const holder = songNumbers.find((s) => s.number === n);
    if (holder) return `No. ${n} is already used by “${holder.title}”.`;
    const other = entries.find(
      (e) => e.key !== entry.key && e.status.kind === "pending" && numberOf(e.draft.numberInput) === n,
    );
    if (other) return `No. ${n} is also typed on “${other.draft.title || "another draft"}”.`;
    return null;
  }

  function problemFor(entry: Entry): string | null {
    const d = entry.draft;
    if (!d.title.trim()) return "Add a title.";
    if (itemsToSections(d.items).length === 0) return "Add at least one section with lyrics.";
    const raw = d.numberInput.trim();
    if (raw !== "") {
      const n = numberOf(raw);
      if (n === null || n < 1 || n > MAX_NUMBER) return `Song number must be a whole number between 1 and ${MAX_NUMBER}.`;
    }
    return clashFor(entry);
  }

  // ── saving ──

  async function saveEntry(key: string): Promise<boolean> {
    const entry = entriesRef.current.find((e) => e.key === key);
    if (!entry || entry.status.kind !== "pending") return false;

    const problem = problemFor(entry);
    if (problem) {
      patchEntry(key, { error: problem });
      return false;
    }

    patchEntry(key, { saving: true, error: null });
    const { id, number, error } = await commitDraft(entry.draft, numberOf(entry.draft.numberInput) ?? undefined);
    if (error || id === null || number === null) {
      patchEntry(key, { saving: false, error: error ?? "Couldn't save song." });
      return false;
    }

    setSongNumbers((prev) => [...prev, { id, number, title: entry.draft.title.trim() }]);
    patchEntry(key, { saving: false, status: { kind: "saved", id, number } });
    showToast(`Saved as No. ${number}`);

    // A single-song import is done — go read it. Otherwise move to the next draft.
    const remainingPending = entriesRef.current.filter((e) => e.key !== key && e.status.kind === "pending");
    if (entriesRef.current.length === 1) {
      router.push(`/songs/${id}`);
    } else if (remainingPending.length > 0) {
      const nextIndex = entriesRef.current.findIndex((e) => e.key === remainingPending[0].key);
      setSelected(nextIndex);
    }
    return true;
  }

  async function handleSaveAll() {
    // Sequential on purpose: each save can create/reuse metadata fields (and
    // take "highest + 1") that the next draft depends on.
    const keys = entriesRef.current.filter((e) => e.status.kind === "pending").map((e) => e.key);
    for (const key of keys) {
      await saveEntry(key);
    }
  }

  const pending = entries.filter((e) => e.status.kind === "pending");
  const needsALook = pending.filter((e) => e.draft.titleIsGuess || e.pendingRaw).length;

  // ───────────────── render ─────────────────

  const pasteNode = (
    <div className="flex h-full flex-col gap-3">
      <p className="type-meta">
        Paste one or more songs. Two blank lines start a new song; a run of 🎤 lines (e.g. 🎤Key, G) becomes that
        song&apos;s details. The editor updates as you type.
      </p>
      {/* TextArea wraps itself in a div; this makes that wrapper and the textarea fill the pane. */}
      <div className="flex min-h-0 flex-1 flex-col [&>div]:flex [&>div]:flex-1 [&>div]:flex-col">
        <TextArea
          value={rawText}
          onChange={(e) => handleRawChange(e.target.value)}
          placeholder="Paste raw lyrics here…"
          aria-label="Pasted lyrics"
          className="type-lyrics min-h-[55vh] flex-1 text-[16px] tablet:min-h-0 tablet:resize-none"
        />
      </div>
      {detached && (
        <div className="space-y-2 rounded-md border border-label p-3" role="status">
          <p className="type-body text-ink">
            {rawStale
              ? "You split or merged drafts by hand, so this text no longer updates them. Re-read it to start the drafts again from the text (saved songs stay saved, but may be listed again)."
              : "You split or merged drafts by hand, so editing this text won't change them until you re-read it."}
          </p>
          {rawStale && (
            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="text" onClick={rereadPastedText}>
                Re-read pasted text
              </Button>
              <Button type="button" variant="text" className="text-muted-foreground" onClick={() => setRawStale(false)}>
                Keep my drafts
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const editorNode = (
    <div className="space-y-4">
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="type-meta">
            {entries.length} {entries.length === 1 ? "song" : "songs"} found
            {needsALook > 0 ? ` · ${needsALook} need${needsALook === 1 ? "s" : ""} a look` : ""}
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 tablet:mx-0 tablet:px-0" role="tablist" aria-label="Songs found">
            {entries.map((e, i) => {
              const active = i === currentIndex;
              const label = e.draft.title.trim() || "Untitled";
              return (
                <button
                  key={e.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(i)}
                  className={`flex h-10 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors ${
                    active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card text-ink hover:bg-secondary"
                  } ${e.status.kind === "discarded" ? "line-through opacity-60" : ""}`}
                >
                  {e.status.kind === "saved" ? (
                    <Check size={14} strokeWidth={2.6} aria-hidden />
                  ) : e.pendingRaw || (e.draft.titleIsGuess && e.status.kind === "pending") ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-fill" aria-label="Needs a look" />
                  ) : null}
                  <span className="type-mono shrink-0">{i + 1}</span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!current ? (
        <p className="type-meta py-10 text-center">Paste lyrics on the left to see the songs found here.</p>
      ) : current.status.kind === "saved" ? (
        <div className="space-y-3 rounded-md border border-rule bg-surface p-4">
          <p className="type-body text-ink">
            <Check size={16} strokeWidth={2.4} className="mr-1.5 inline text-label" aria-hidden />“{current.draft.title}” saved as No.{" "}
            {String(current.status.number).padStart(3, "0")}.
          </p>
          <div className="flex items-center gap-5">
            <Button href={`/songs/${current.status.id}`} variant="text">
              Open song
            </Button>
            <Button href={`/admin/songs/${current.status.id}/edit`} variant="text">
              Edit
            </Button>
          </div>
        </div>
      ) : current.status.kind === "discarded" ? (
        <div className="flex items-center gap-3 rounded-md border border-rule bg-surface p-4">
          <X size={18} strokeWidth={2} className="shrink-0 text-muted-foreground" aria-hidden />
          <p className="type-body min-w-0 flex-1 truncate text-muted-foreground line-through">{current.draft.title}</p>
          <Button variant="text" icon={Undo2} onClick={() => patchEntry(current.key, { status: { kind: "pending" } })}>
            Undo
          </Button>
        </div>
      ) : (
        <DraftEditor
          key={current.key}
          entry={current}
          index={currentIndex}
          count={entries.length}
          fieldDefs={fieldDefs}
          clash={clashFor(current)}
          nextNumber={Math.max(0, ...songNumbers.map((s) => s.number)) + 1}
          canMergeNext={currentIndex < entries.length - 1 && entries[currentIndex + 1].status.kind === "pending"}
          onPatch={(patch) => patchDraft(current.key, patch)}
          onSave={() => saveEntry(current.key)}
          onMergeNext={() => mergeWithNext(currentIndex)}
          onSplitAt={(itemIndex) => splitAt(currentIndex, itemIndex)}
          onDiscard={() => patchEntry(current.key, { status: { kind: "discarded" } })}
          onUsePasted={() => {
            if (!current.pendingRaw) return;
            setEntries((prev) => prev.map((e) => (e.key === current.key ? newEntry(current.pendingRaw!, e.key, e.status) : e)));
          }}
          onKeepEdits={() =>
            patchEntry(current.key, { baseRaw: current.pendingRaw?.rawBlock ?? current.baseRaw, pendingRaw: null })
          }
        />
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="Import lyrics" backHref="/catalogue" />

      {hasText && (
        <div className="px-5 pb-3 pt-3 tablet:hidden">
          <SegmentedControl
            aria-label="View"
            value={pane}
            onChange={setPane}
            options={[
              { value: "paste", label: "Pasted text" },
              { value: "songs", label: `Songs (${entries.length})` },
            ]}
          />
        </div>
      )}

      <div
        className={`flex-1 gap-6 px-5 py-4 ${hasText ? "tablet:grid tablet:grid-cols-2" : ""} desktop:mx-auto desktop:w-full desktop:max-w-[1200px]`}
      >
        <div className={`${hasText && pane === "songs" ? "hidden tablet:block" : ""} tablet:sticky tablet:top-4 tablet:h-[calc(100dvh-60px-8rem)]`}>
          {pasteNode}
        </div>
        {hasText && <div className={`${pane === "paste" ? "hidden tablet:block" : ""} min-w-0 pb-24`}>{editorNode}</div>}
      </div>

      <StickyFooterAction aboveAdminNav>
        {!hasText ? (
          <Button icon={ArrowRight} disabled>
            Paste lyrics to begin
          </Button>
        ) : pending.length > 0 ? (
          <Button icon={Check} onClick={handleSaveAll} disabled={entries.some((e) => e.saving)}>
            {pending.length === 1 ? "Save the song" : `Save all ${pending.length} remaining`}
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

// ───────────────────────── one draft's editor ─────────────────────────

function DraftEditor({
  entry,
  index,
  count,
  fieldDefs,
  clash,
  nextNumber,
  canMergeNext,
  onPatch,
  onSave,
  onMergeNext,
  onSplitAt,
  onDiscard,
  onUsePasted,
  onKeepEdits,
}: {
  entry: Entry;
  index: number;
  count: number;
  fieldDefs: MetadataFieldDefinition[];
  clash: string | null;
  nextNumber: number;
  canMergeNext: boolean;
  onPatch: (patch: Partial<DraftState>) => void;
  onSave: () => void;
  onMergeNext: () => void;
  onSplitAt: (itemIndex: number) => void;
  onDiscard: () => void;
  onUsePasted: () => void;
  onKeepEdits: () => void;
}) {
  const { draft, saving, error } = entry;
  const n = numberOf(draft.numberInput);
  const outOfRange = draft.numberInput.trim() !== "" && (n === null || n < 1 || n > MAX_NUMBER);

  return (
    <div className="space-y-6">
      {entry.pendingRaw && (
        <div className="space-y-2 rounded-md border border-label p-3" role="status">
          <p className="type-body text-ink">
            The pasted text for song {index + 1} changed. Using it replaces your edits to this song.
          </p>
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="text" onClick={onUsePasted}>
              Use pasted text
            </Button>
            <Button type="button" variant="text" className="text-muted-foreground" onClick={onKeepEdits}>
              Keep my edits
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <TextInput
          value={draft.title}
          onChange={(e) => onPatch({ title: e.target.value, titleIsGuess: false })}
          aria-label="Song title"
          label={draft.titleIsGuess ? "Title (guessed from the first line, check it)" : "Title"}
          className="text-[19px] font-semibold"
        />
      </div>

      <div className="space-y-2">
        <TextInput
          label="Song number"
          inputMode="numeric"
          value={draft.numberInput}
          onChange={(e) => onPatch({ numberInput: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })}
          placeholder={String(nextNumber)}
          compact
          className="w-[140px] font-mono"
          aria-invalid={outOfRange || !!clash}
          aria-describedby="import-number-hint"
        />
        <p id="import-number-hint" className={`type-meta ${outOfRange || clash ? "text-danger" : ""}`} aria-live="polite">
          {outOfRange
            ? `Enter a whole number from 1 to ${MAX_NUMBER}.`
            : clash
              ? `${clash} Pick another number, or leave it blank.`
              : n !== null
                ? `No. ${n} is free.`
                : `Leave blank to use the next free number (currently No. ${nextNumber}).`}
        </p>
      </div>

      <DetailsEditor details={draft.details} fieldDefs={fieldDefs} onChange={(details) => onPatch({ details })} />

      <LyricsEditor items={draft.items} onChange={(items) => onPatch({ items })} onSplitAt={onSplitAt} />

      {error && <p className="type-body text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-rule pt-4">
        <Button type="button" fullWidth={false} className="px-6" icon={Check} onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : count === 1 ? "Save song" : `Save song ${index + 1}`}
        </Button>
        <Button type="button" variant="text" icon={Merge} onClick={onMergeNext} disabled={!canMergeNext}>
          Merge with next
        </Button>
        <Button type="button" variant="text" className="text-danger" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
