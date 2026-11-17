"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { createOrGetMetadataField } from "@/lib/actions/metadata-fields";
import { saveSong, setSongNumber } from "@/lib/actions/songs";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TopBar } from "@/components/ui/top-bar";
import { StickyFooterAction } from "@/components/ui/sticky-footer-action";
import { LyricsEditor, itemsFromSections, itemsToSections } from "@/components/lyrics-editor";
import type { LyricsItem } from "@/components/lyrics-editor";
import type {
  MetadataFieldDefinition,
  MetadataFieldType,
  Song,
  SongMetadata,
} from "@/types/song";

const FIELD_TYPES: { value: MetadataFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single-select" },
  { value: "multi_select", label: "Multi-select" },
];

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
  const [items, setItems] = useState<LyricsItem[]>(() => itemsFromSections(initialSong?.lyrics ?? []));
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

  // Song number. Editing: moving to a number another song holds swaps the two.
  // Creating: leave it blank for highest + 1, or type one — a number that's
  // already used is rejected, and the song holding it is named here first.
  const parsedNumber = /^\d+$/.test(numberInput.trim()) ? parseInt(numberInput.trim(), 10) : null;
  const isBlank = numberInput.trim() === "";
  const outOfRange = parsedNumber === null || parsedNumber < 1 || parsedNumber > 9999;
  const numberChanged = !!initialSong && parsedNumber !== null && parsedNumber !== initialSong.number;
  const numberInvalid = initialSong ? outOfRange : !isBlank && outOfRange;
  const holder =
    parsedNumber !== null && !numberInvalid && songNumbers
      ? songNumbers.find((s) => s.number === parsedNumber && s.id !== initialSong?.id)
      : undefined;
  const swapTarget = initialSong && numberChanged ? holder : undefined;
  // A new song can't swap, so a taken number blocks saving until it's changed.
  const numberClash = !initialSong ? holder : undefined;
  const nextNumber =
    provisionalNumber ?? (songNumbers ? Math.max(0, ...songNumbers.map((s) => s.number)) + 1 : undefined);

  const hasLyrics = items.some((it) => it.text.trim().length > 0);
  const canSave = title.trim().length > 0 && hasLyrics && !numberInvalid && !numberClash;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) {
      setError(
        !title.trim()
          ? "Title is required."
          : numberInvalid
            ? "Song number must be a whole number between 1 and 9999."
            : numberClash
              ? `No. ${parsedNumber} is already used by “${numberClash.title}”. Pick another number, or leave it blank.`
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
        number: !initialSong && parsedNumber !== null ? parsedNumber : undefined,
      });
      if (saveErr || !data) {
        setError(saveErr ?? "Couldn't save song.");
        return;
      }
      showToast(numberToast ?? (initialSong ? "Song saved" : `Song added as No. ${data.number}`));
      router.push(`/songs/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // The label previews the number as it's typed (digits roll over).
  const displayNumber =
    parsedNumber !== null && !numberInvalid ? parsedNumber : initialSong ? initialSong.number : nextNumber;

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

        <section className="space-y-2">
          <TextInput
            label="Song number"
            inputMode="numeric"
            value={numberInput}
            onChange={(e) => {
              markDirty();
              setNumberInput(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
            }}
            placeholder={!initialSong && nextNumber ? String(nextNumber) : undefined}
            compact
            className="w-[140px] font-mono"
            aria-describedby="song-number-hint"
            aria-invalid={numberInvalid || !!numberClash}
          />
          <p
            id="song-number-hint"
            className={`type-meta ${numberInvalid || numberClash ? "text-danger" : swapTarget ? "text-brand" : ""}`}
            aria-live="polite"
          >
            {numberInvalid
              ? "Enter a whole number from 1 to 9999."
              : numberClash
                ? `No. ${parsedNumber} is already used by “${numberClash.title}”. Pick another number, or leave it blank${nextNumber ? ` for No. ${nextNumber}` : ""}.`
                : swapTarget
                  ? `No. ${parsedNumber} is “${swapTarget.title}”. Saving swaps them: it becomes No. ${initialSong?.number}.`
                  : initialSong
                    ? numberChanged
                      ? `No. ${parsedNumber} is free. This song will move there.`
                      : "Shown in the catalogue and on slides. Choosing a number another song has swaps the two."
                    : parsedNumber !== null
                      ? `No. ${parsedNumber} is free.`
                      : nextNumber
                        ? `Leave blank to use No. ${nextNumber} (the highest number plus one).`
                        : "Leave blank to number it automatically."}
          </p>
        </section>

        <LyricsEditor
          items={items}
          onChange={(next) => {
            markDirty();
            setItems(next);
          }}
        />

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
                  <div className="flex items-center justify-between gap-4">
                    <Button type="button" variant="text" onClick={() => setAddFieldMode("create")}>
                      Create a new field
                    </Button>
                    <Button type="button" variant="text" className="text-muted-foreground" onClick={() => setShowAddField(false)}>
                      Cancel
                    </Button>
                  </div>
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

      <StickyFooterAction aboveAdminNav>
        <div className="desktop:mx-auto desktop:max-w-[720px]">
          <Button type="submit" icon={Check} disabled={saving}>
            {saving ? "Saving…" : "Save song"}
          </Button>
        </div>
      </StickyFooterAction>
    </form>
  );
}
