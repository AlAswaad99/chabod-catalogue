"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  changeMetadataFieldType,
  createMetadataField,
  deleteMetadataField,
  mergeMetadataFields,
  removeFieldOption,
  renameMetadataField,
} from "@/lib/actions/metadata-field-admin";
import { addOptionToField } from "@/lib/actions/metadata-fields";
import { TopBar } from "@/components/ui/top-bar";
import { TextInput } from "@/components/ui/text-input";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import type { MetadataFieldDefinition, MetadataFieldType } from "@/types/song";
import type { FieldUsage } from "@/app/(app)/admin/metadata-fields/page";

const FIELD_TYPE_LABELS: Record<MetadataFieldType, string> = {
  text: "Text",
  number: "Number",
  single_select: "Single-select",
  multi_select: "Multi-select",
};

const FIELD_TYPE_OPTIONS = (Object.keys(FIELD_TYPE_LABELS) as MetadataFieldType[]).map((value) => ({
  value,
  label: FIELD_TYPE_LABELS[value],
}));

const isSelectType = (t: MetadataFieldType) => t === "single_select" || t === "multi_select";

function metaLine(field: MetadataFieldDefinition, usage: FieldUsage | undefined): string {
  const songCount = usage?.songCount ?? 0;
  const parts = [FIELD_TYPE_LABELS[field.type]];
  if (field.options.length > 0) parts.push(`${field.options.length} options`);
  parts.push(songCount === 0 ? "unused" : `${songCount} ${songCount === 1 ? "song" : "songs"}`);
  return parts.join(" · ");
}

export function MetadataFieldsList({
  initialFields,
  usage,
}: {
  initialFields: MetadataFieldDefinition[];
  usage: Record<string, FieldUsage>;
}) {
  const [fields, setFields] = useState(initialFields);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [newOptionInput, setNewOptionInput] = useState("");
  const [optionError, setOptionError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  // "Add field" panel
  const [adding, setAdding] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<MetadataFieldType>("text");
  const [createOptions, setCreateOptions] = useState<string[]>([]);
  const [createOptionInput, setCreateOptionInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function openAdd() {
    setAdding(true);
    setExpandedId(null);
    setCreateName("");
    setCreateType("text");
    setCreateOptions([]);
    setCreateOptionInput("");
    setCreateError(null);
  }

  function addCreateOption() {
    const value = createOptionInput.trim();
    if (!value) return;
    if (createOptions.some((o) => o.toLowerCase() === value.toLowerCase())) {
      setCreateOptionInput("");
      return;
    }
    setCreateOptions((prev) => [...prev, value]);
    setCreateOptionInput("");
  }

  async function handleCreate() {
    const name = createName.trim();
    if (!name) {
      setCreateError("Field name is required.");
      return;
    }
    if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setCreateError(`A field named “${name}” already exists.`);
      return;
    }
    // Include an option typed but not yet added with Enter/Add.
    const pending = createOptionInput.trim();
    const options =
      pending && !createOptions.some((o) => o.toLowerCase() === pending.toLowerCase())
        ? [...createOptions, pending]
        : createOptions;
    if (isSelectType(createType) && options.length === 0) {
      setCreateError("Add at least one option.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    const { data, error: err } = await createMetadataField({ name, type: createType, options });
    setCreating(false);
    if (err || !data) {
      setCreateError(err ?? "Couldn't create field.");
      return;
    }
    setFields((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setAdding(false);
    showToast(`Field “${data.name}” added`);
  }

  function handleChangeType(field: MetadataFieldDefinition, type: MetadataFieldType) {
    if (type === field.type) return;
    setError(null);
    startTransition(async () => {
      const { data, error: err } = await changeMetadataFieldType(field.id, type);
      if (err || !data) {
        setError(err ?? "Couldn't change the field type.");
        return;
      }
      setFields((prev) => prev.map((f) => (f.id === field.id ? data : f)));
    });
  }

  function duplicateOf(field: MetadataFieldDefinition): MetadataFieldDefinition | null {
    const matches = fields.filter(
      (f) => f.id !== field.id && f.name.toLowerCase() === field.name.toLowerCase(),
    );
    if (matches.length === 0) return null;
    // The earlier-created field is canonical; only the later one shows the callout.
    const earlier = matches.find((f) => new Date(f.created_at) < new Date(field.created_at));
    return earlier ?? null;
  }

  function expand(field: MetadataFieldDefinition) {
    if (expandedId === field.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(field.id);
    setNameDraft(field.name);
    setNewOptionInput("");
    setOptionError(null);
    setConfirmingDeleteId(null);
  }

  function handleRename(field: MetadataFieldDefinition) {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === field.name) return;
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, name: trimmed } : f)));
    startTransition(async () => {
      const { error: err } = await renameMetadataField(field.id, trimmed);
      if (err) setError(err);
    });
  }

  function handleMerge(duplicate: MetadataFieldDefinition, canonical: MetadataFieldDefinition) {
    setExpandedId(null);
    startTransition(async () => {
      const { data, error: err } = await mergeMetadataFields(duplicate.id, canonical.id);
      if (err || !data) {
        setError(err ?? "Couldn't merge fields.");
        return;
      }
      setFields((prev) => prev.filter((f) => f.id !== duplicate.id).map((f) => (f.id === data.id ? data : f)));
    });
  }

  async function handleAddOption(field: MetadataFieldDefinition) {
    const value = newOptionInput.trim();
    if (!value) return;
    const { data, error: err } = await addOptionToField(field.id, value);
    if (err || !data) {
      setOptionError(err ?? "Couldn't add option.");
      return;
    }
    setFields((prev) => prev.map((f) => (f.id === field.id ? data : f)));
    setNewOptionInput("");
    setOptionError(null);
  }

  async function handleRemoveOption(field: MetadataFieldDefinition, option: string) {
    setOptionError(null);
    const { data, error: err } = await removeFieldOption(field.id, option);
    if (err || !data) {
      setOptionError(err ?? "Couldn't remove option.");
      return;
    }
    setFields((prev) => prev.map((f) => (f.id === field.id ? data : f)));
  }

  function handleDeleteClick(field: MetadataFieldDefinition) {
    if (confirmingDeleteId !== field.id) {
      setConfirmingDeleteId(field.id);
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== field.id));
    setExpandedId(null);
    startTransition(async () => {
      const { error: err } = await deleteMetadataField(field.id);
      if (err) setError(err);
    });
  }

  return (
    <div>
      <TopBar
        title="Fields"
        right={
          !adding && (
            <Button variant="text" icon={Plus} onClick={openAdd}>
              Add field
            </Button>
          )
        }
      />
      <div className="px-5 py-4">
        <p className="type-meta border-b border-rule pb-3">
          Add, rename and delete fields, tidy their options, and merge duplicates. Tap a field to edit it. A
          field&apos;s type can only change while no song uses it.
        </p>

        {adding && (
          <form
            className="my-4 space-y-4 rounded-md border border-ring/60 bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <p className="type-section-label">New field</p>
            <TextInput
              label="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Key, Tempo, Occasion"
              compact
              autoFocus
            />
            <div className="space-y-1">
              <p className="type-field-label">Type</p>
              <SegmentedControl
                aria-label="Field type"
                grid
                value={createType}
                onChange={setCreateType}
                options={FIELD_TYPE_OPTIONS}
              />
            </div>
            {isSelectType(createType) && (
              <div className="space-y-2">
                <p className="type-field-label">Options</p>
                {createOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {createOptions.map((o) => (
                      <Chip key={o} label={o} onRemove={() => setCreateOptions((prev) => prev.filter((x) => x !== o))} />
                    ))}
                  </div>
                )}
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
                    aria-label="New option"
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
            <div className="flex items-center justify-between gap-4">
              <Button type="submit" fullWidth={false} className="px-6" disabled={creating}>
                {creating ? "Creating…" : "Create field"}
              </Button>
              <Button type="button" variant="text" className="text-muted-foreground" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {error && <p className="type-body pt-2 text-danger">{error}</p>}

        {fields.length === 0 ? (
          <p className="type-meta pt-4">No fields yet.</p>
        ) : (
          <div className="divide-y divide-rule">
            {fields.map((field) => {
              const expanded = expandedId === field.id;
              const canonical = duplicateOf(field);
              const isDuplicate = canonical !== null;

              return (
                <div key={field.id}>
                  <button
                    type="button"
                    onClick={() => expand(field)}
                    className="flex min-h-[68px] w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[16px] font-bold text-ink">{field.name}</p>
                      <p className="type-meta">{metaLine(field, usage[field.id])}</p>
                    </div>
                    {isDuplicate && <Badge variant="warn">Duplicate?</Badge>}
                  </button>

                  {expanded && (
                    <div className="space-y-4 bg-surface p-4">
                      {canonical && (
                        <div className="space-y-2 border border-label p-3">
                          <p className="type-body text-ink">
                            Looks like a duplicate of <strong>{canonical.name}</strong>…
                          </p>
                          <Button
                            variant="secondary"
                            fullWidth={false}
                            className="h-11 px-3"
                            onClick={() => handleMerge(field, canonical)}
                          >
                            Merge into {canonical.name}
                          </Button>
                        </div>
                      )}

                      <div className="flex items-end gap-2">
                        <TextInput
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          label="Name"
                          compact
                          className="flex-1"
                        />
                        {nameDraft.trim() !== field.name && nameDraft.trim() !== "" && (
                          <Button
                            fullWidth={false}
                            className="h-11 px-3"
                            disabled={isPending}
                            onClick={() => handleRename(field)}
                          >
                            Rename
                          </Button>
                        )}
                      </div>

                      {(usage[field.id]?.songCount ?? 0) === 0 && (
                        <div className="space-y-1">
                          <p className="type-field-label">Type</p>
                          <SegmentedControl
                            aria-label="Field type"
                            grid
                            value={field.type}
                            onChange={(t) => handleChangeType(field, t)}
                            options={FIELD_TYPE_OPTIONS}
                          />
                        </div>
                      )}

                      {isSelectType(field.type) && (
                        <div className="space-y-2">
                          <p className="type-field-label text-muted-foreground">Options</p>
                          <div className="flex flex-wrap gap-2">
                            {field.options.map((o) => (
                              <Chip key={o} label={o} onRemove={() => handleRemoveOption(field, o)} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <TextInput
                              value={newOptionInput}
                              onChange={(e) => setNewOptionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddOption(field);
                                }
                              }}
                              placeholder="New option"
                              compact
                              className="flex-1"
                            />
                            <Button variant="secondary" fullWidth={false} onClick={() => handleAddOption(field)}>
                              Add
                            </Button>
                          </div>
                          {optionError && <p className="type-meta text-danger">{optionError}</p>}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant={confirmingDeleteId === field.id ? "danger-confirm" : "danger"}
                        onClick={() => handleDeleteClick(field)}
                      >
                        {confirmingDeleteId === field.id
                          ? `Tap again · removes it from ${usage[field.id]?.songCount ?? 0} songs`
                          : "Delete field"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
