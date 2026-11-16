"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Copy, Plus, Trash, X } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { createOrGetMetadataField } from "@/lib/actions/metadata-fields";
import { saveSong, setSongNumber } from "@/lib/actions/songs";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { TextInput, TextArea, Select } from "@/components/ui/text-input";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TopBar } from "@/components/ui/top-bar";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import type {
  LyricsSection,
  LyricsSectionType,
  MetadataFieldDefinition,
  MetadataFieldType,
  Song,
  SongMetadata,
} from "@/types/song";

const SECTION_TYPES: { value: LyricsSectionType; label: string }[] = [
  { value: "verse", label: "Verse" },
  { value: "chorus", label: "Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "other", label: "Other" },
];

const FIELD_TYPES: { value: MetadataFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single-select" },
  { value: "multi_select", label: "Multi-select" },
];

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

interface FormItem {
  id: string;
  type: LyricsSectionType;
  label: string;
  text: string;
}

// Reconstructs the form's client-only item list (with stable ids) from
// stored sections. A section that happens to duplicate another's
// {type, text} is still detected and collapsed as a repeat on read
// (src/lib/lyrics.ts), but here every item is fully independent and editable.
function itemsFromSections(sections: LyricsSection[]): FormItem[] {
  const items = sections.map((s) => ({ id: makeId(), type: s.type, label: s.label ?? "", text: s.text }));
  return items.length > 0 ? items : [{ id: makeId(), type: "verse" as LyricsSectionType, label: "", text: "" }];
}

function itemsToSections(items: FormItem[]): LyricsSection[] {
  return items
    .filter((it) => it.text.trim().length > 0)
    .map((it) => ({ type: it.type, label: it.label.trim() || undefined, text: it.text }));
}

function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
  const el = e.currentTarget;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function SongForm({
  initialSong,
  initialFieldDefs,
  closeHref,
  provisionalNumber,
  songNumbers,
}: {
  initialSong?: Song;
  initialFieldDefs: MetadataFieldDefinition[];
  closeHref: string;
  /** Next sequence value, shown as "No. 0XX" for a brand-new song (Step 7). Ignored when editing. */
  provisionalNumber?: number;
  /** Every song's id/number/title, so editing the number can warn about the swap. Edit mode only. */
  songNumbers?: { id: string; number: number; title: string }[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState(initialSong?.title ?? "");
  const [numberInput, setNumberInput] = useState(initialSong ? String(initialSong.number) : "");
  const [items, setItems] = useState<FormItem[]>(() => itemsFromSections(initialSong?.lyrics ?? []));
  const [metadata, setMetadata] = useState<SongMetadata>(initialSong?.metadata ?? {});
  const [assignedFieldIds, setAssignedFieldIds] = useState<string[]>(() =>
    Object.keys(initialSong?.metadata ?? {}),
  );
  const [fieldDefs, setFieldDefs] = useState<MetadataFieldDefinition[]>(initialFieldDefs);

  const [dirty, setDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddField, setShowAddField] = useState(false);
  const [addFieldMode, setAddFieldMode] = useState<"pick" | "create">("pick");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<MetadataFieldType>("text");
  const [createOptions, setCreateOptions] = useState<string[]>([]);
  const [createOptionInput, setCreateOptionInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fieldDefMap = new Map(fieldDefs.map((f) => [f.id, f]));
  const unassignedFields = fieldDefs.filter((f) => !assignedFieldIds.includes(f.id));

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  function updateItem(id: string, patch: Partial<FormItem>) {
    markDirty();
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    markDirty();
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function removeItem(id: string) {
    markDirty();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addSection() {
    markDirty();
    setItems((prev) => [...prev, { id: makeId(), type: "verse", label: "", text: "" }]);
  }

  function duplicateSection(id: string) {
    markDirty();
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const copy: FormItem = { id: makeId(), type: source.type, label: source.label, text: source.text };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function setMetadataValue(fieldId: string, value: string | number | string[]) {
    markDirty();
    setMetadata((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleMultiSelectValue(fieldId: string, option: string) {
    const current = (metadata[fieldId] as string[] | undefined) ?? [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setMetadataValue(fieldId, next);
  }

  function assignField(fieldId: string) {
    markDirty();
    const def = fieldDefMap.get(fieldId);
    setAssignedFieldIds((prev) => (prev.includes(fieldId) ? prev : [...prev, fieldId]));
    setMetadata((prev) => (fieldId in prev ? prev : { ...prev, [fieldId]: def?.type === "multi_select" ? [] : "" }));
    setShowAddField(false);
    setAddFieldMode("pick");
  }

  function removeField(fieldId: string) {
    markDirty();
    setAssignedFieldIds((prev) => prev.filter((id) => id !== fieldId));
    setMetadata((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function openAddField() {
    setShowAddField(true);
    setAddFieldMode(unassignedFields.length > 0 ? "pick" : "create");
    setCreateName("");
    setCreateType("text");
    setCreateOptions([]);
    setCreateOptionInput("");
    setCreateError(null);
  }

  function addCreateOption() {
    const value = createOptionInput.trim();
    if (!value || createOptions.includes(value)) return;
    setCreateOptions((prev) => [...prev, value]);
    setCreateOptionInput("");
  }

  async function handleCreateField() {
    const name = createName.trim();
    if (!name) {
      setCreateError("Field name is required.");
      return;
    }
    if (fieldDefs.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setCreateError(`A field named "${name}" already exists.`);
      return;
    }
    if ((createType === "single_select" || createType === "multi_select") && createOptions.length === 0) {
      setCreateError("Add at least one option.");
      return;
    }

    const { data, error: createErr } = await createOrGetMetadataField({
      name,
      type: createType,
      options: createOptions,
    });
    if (createErr || !data) {
      setCreateError(createErr ?? "Couldn't create field.");
      return;
    }
    setFieldDefs((prev) => (prev.some((f) => f.id === data.id) ? prev : [...prev, data]));
    assignField(data.id);
  }

  function handleCloseClick() {
    if (dirty) setShowDiscardConfirm(true);
    else router.push(closeHref);
  }

  // Song number (edit mode only; new songs get the next number automatically
  // and can be renumbered afterwards). Changing it to a number another song
  // already holds swaps the two — shown here so it's never a surprise.
  const parsedNumber = /^\d+$/.test(numberInput.trim()) ? parseInt(numberInput.trim(), 10) : null;
  const numberChanged = !!initialSong && parsedNumber !== null && parsedNumber !== initialSong.number;
  const numberInvalid = !!initialSong && (parsedNumber === null || parsedNumber < 1 || parsedNumber > 9999);
  const swapTarget =
    numberChanged && songNumbers ? songNumbers.find((s) => s.number === parsedNumber && s.id !== initialSong?.id) : undefined;

  const hasLyrics = items.some((it) => it.text.trim().length > 0);
  const canSave = title.trim().length > 0 && hasLyrics && !numberInvalid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) {
      setError(
        !title.trim()
          ? "Title is required."
          : numberInvalid
            ? "Song number must be a whole number between 1 and 9999."
            : "Add at least one section with lyrics.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Number first: if it fails (or someone else grabbed it), nothing else
      // has been saved yet and the form is untouched.
      let numberToast: string | null = null;
      if (initialSong && numberChanged && parsedNumber !== null) {
        const { data: numberData, error: numberErr } = await setSongNumber(initialSong.id, parsedNumber);
        if (numberErr || !numberData) {
          setError(numberErr ?? "Couldn't change the song number.");
          return;
        }
        numberToast = numberData.swapped
          ? `No. ${numberData.number} · “${numberData.swapped.title}” moved to No. ${numberData.swapped.number}`
          : `Renumbered to No. ${numberData.number}`;
      }

      const { data, error: saveErr } = await saveSong({
        id: initialSong?.id,
        title: title.trim(),
        lyrics: itemsToSections(items),
        metadata,
      });
      if (saveErr || !data) {
        setError(saveErr ?? "Couldn't save song.");
        return;
      }
      showToast(numberToast ?? (initialSong ? "Song saved" : "Song added"));
      router.push(`/songs/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // In edit mode the label previews the number as it's typed (digits roll over).
  const displayNumber = initialSong ? (parsedNumber !== null && !numberInvalid ? parsedNumber : initialSong.number) : provisionalNumber;

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <TopBar
        title={initialSong ? "Edit song" : "New song"}
        onClose={handleCloseClick}
        right={
          displayNumber != null && (
            <span className="type-mono text-muted-foreground">
              No. <NumberFlow value={displayNumber} format={{ minimumIntegerDigits: 3, useGrouping: false }} />
            </span>
          )
        }
      />

      {showDiscardConfirm && (
        <div className="flex items-center justify-between gap-3 border-b border-danger bg-surface px-5 py-3">
          <p className="type-body text-ink">Discard unsaved changes?</p>
          <div className="flex items-center gap-2">
            <Button variant="text" onClick={() => setShowDiscardConfirm(false)}>
              Keep editing
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth={false}
              className="h-11 px-3"
              onClick={() => router.push(closeHref)}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-8 px-5 py-5 desktop:mx-auto desktop:max-w-[720px]">
        <TextInput
          value={title}
          onChange={(e) => {
            markDirty();
            setTitle(e.target.value);
          }}
          placeholder="Song title"
          className="h-14 text-[21px] font-bold"
          aria-label="Title"
          autoFocus={!initialSong}
        />

        {initialSong && (
          <section className="space-y-2">
            <TextInput
              label="Song number"
              inputMode="numeric"
              value={numberInput}
              onChange={(e) => {
                markDirty();
                setNumberInput(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
              }}
              compact
              className="w-[140px] font-mono"
              aria-describedby="song-number-hint"
            />
            <p
              id="song-number-hint"
              className={`type-meta ${numberInvalid ? "text-danger" : swapTarget ? "text-brand" : ""}`}
              aria-live="polite"
            >
              {numberInvalid
                ? "Enter a whole number from 1 to 9999."
                : swapTarget
                  ? `No. ${parsedNumber} is “${swapTarget.title}”. Saving swaps them: it becomes No. ${initialSong.number}.`
                  : numberChanged
                    ? `No. ${parsedNumber} is free. This song will move there.`
                    : "Shown in the catalogue and on slides. Choosing a number another song has swaps the two."}
            </p>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="type-section-label">
              Lyrics · {items.length} {items.length === 1 ? "part" : "parts"}
            </p>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const position = idx + 1;

              return (
                <div key={item.id} className="space-y-3 border-t border-rule-2 bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className="type-mono text-brand">{String(position).padStart(2, "0")}</span>
                    <Select
                      value={item.type}
                      onChange={(e) => updateItem(item.id, { type: e.target.value as LyricsSectionType })}
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
                        onClick={() => moveItem(item.id, -1)}
                      />
                      <Button
                        type="button"
                        variant="icon"
                        icon={ArrowDown}
                        aria-label="Move down"
                        disabled={idx === items.length - 1}
                        onClick={() => moveItem(item.id, 1)}
                      />
                      <Button
                        type="button"
                        variant="icon"
                        icon={Trash}
                        aria-label="Delete section"
                        className="text-danger"
                        onClick={() => removeItem(item.id)}
                      />
                    </div>
                  </div>

                  <TextInput
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder="Label (optional), e.g. Verse 1"
                    compact
                  />

                  <TextArea
                    value={item.text}
                    onChange={(e) => updateItem(item.id, { text: e.target.value })}
                    onInput={autoGrow}
                    placeholder="One lyric line per row. A blank line starts an indented response."
                    className="min-h-[100px] overflow-hidden"
                  />

                  <Button type="button" variant="text" icon={Copy} onClick={() => duplicateSection(item.id)}>
                    Duplicate section
                  </Button>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="secondary" icon={Plus} onClick={addSection}>
            Add section
          </Button>
        </section>

        <section className="space-y-3">
          <p className="type-section-label">Details</p>

          {assignedFieldIds.length > 0 && (
            <div className="space-y-3">
              {assignedFieldIds.map((fieldId) => {
                const def = fieldDefMap.get(fieldId);
                if (!def) return null;
                return (
                  <div key={fieldId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="type-field-label text-muted-foreground">
                        {def.name} <span className="text-muted-foreground">· {FIELD_TYPES.find((t) => t.value === def.type)?.label}</span>
                      </p>
                      <Button
                        type="button"
                        variant="icon"
                        icon={X}
                        aria-label={`Remove ${def.name}`}
                        onClick={() => removeField(fieldId)}
                      />
                    </div>

                    {def.type === "text" && (
                      <TextInput
                        value={(metadata[fieldId] as string) ?? ""}
                        onChange={(e) => setMetadataValue(fieldId, e.target.value)}
                        compact
                      />
                    )}
                    {def.type === "number" && (
                      <TextInput
                        type="number"
                        value={(metadata[fieldId] as string) ?? ""}
                        onChange={(e) => setMetadataValue(fieldId, e.target.value)}
                        compact
                        className="w-[140px]"
                      />
                    )}
                    {def.type === "single_select" && (
                      <div className="flex flex-wrap gap-2">
                        {def.options.map((o) => (
                          <Chip
                            key={o}
                            label={o}
                            selected={metadata[fieldId] === o}
                            onClick={() => setMetadataValue(fieldId, metadata[fieldId] === o ? "" : o)}
                          />
                        ))}
                      </div>
                    )}
                    {def.type === "multi_select" && (
                      <div className="flex flex-wrap gap-2">
                        {def.options.map((o) => (
                          <Chip
                            key={o}
                            label={o}
                            selected={((metadata[fieldId] as string[]) ?? []).includes(o)}
                            onClick={() => toggleMultiSelectValue(fieldId, o)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!showAddField ? (
            <Button type="button" variant="secondary" icon={Plus} onClick={openAddField}>
              Add field
            </Button>
          ) : (
            <div className="space-y-3 border border-fill p-4">
              {addFieldMode === "pick" ? (
                <>
                  {unassignedFields.length > 0 ? (
                    <div className="divide-y divide-rule">
                      {unassignedFields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => assignField(f.id)}
                          className="flex w-full items-center justify-between py-2.5 text-left"
                        >
                          <span className="type-body text-ink">{f.name}</span>
                          <span className="type-meta">{FIELD_TYPES.find((t) => t.value === f.type)?.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="type-meta">No other fields yet.</p>
                  )}
                  <Button type="button" variant="text" onClick={() => setAddFieldMode("create")}>
                    Create a new field
                  </Button>
                  <Button type="button" variant="text" onClick={() => setShowAddField(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <TextInput
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Field name, e.g. Key"
                    label="Name"
                    compact
                    autoFocus
                  />
                  <div className="space-y-1">
                    <p className="type-field-label text-muted-foreground">Type</p>
                    <SegmentedControl
                      aria-label="Field type"
                      grid
                      value={createType}
                      onChange={setCreateType}
                      options={FIELD_TYPES}
                    />
                  </div>
                  {(createType === "single_select" || createType === "multi_select") && (
                    <div className="space-y-2">
                      <p className="type-field-label text-muted-foreground">Options</p>
                      <div className="flex flex-wrap gap-2">
                        {createOptions.map((o) => (
                          <Chip
                            key={o}
                            label={o}
                            onRemove={() => setCreateOptions((prev) => prev.filter((x) => x !== o))}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <TextInput
                          value={createOptionInput}
                          onChange={(e) => setCreateOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCreateOption();
                            }
                          }}
                          placeholder="New option"
                          compact
                          className="flex-1"
                        />
                        <Button type="button" variant="secondary" fullWidth={false} onClick={addCreateOption}>
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                  {createError && <p className="type-meta text-danger">{createError}</p>}
                  <Button type="button" onClick={handleCreateField}>
                    Add field to song
                  </Button>
                  <Button type="button" variant="text" onClick={() => setAddFieldMode("pick")}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        {error && <p className="type-body text-danger">{error}</p>}
      </div>

      <StickyFooterAction>
        <div className="desktop:mx-auto desktop:max-w-[720px]">
          <Button type="submit" icon={Check} disabled={saving}>
            {saving ? "Saving…" : "Save song"}
          </Button>
        </div>
      </StickyFooterAction>
    </form>
  );
}
