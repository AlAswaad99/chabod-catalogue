"use client";

import { useState, useTransition } from "react";
import {
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
import type { MetadataFieldDefinition, MetadataFieldType } from "@/types/song";
import type { FieldUsage } from "@/app/(app)/admin/metadata-fields/page";

const FIELD_TYPE_LABELS: Record<MetadataFieldType, string> = {
  text: "Text",
  number: "Number",
  single_select: "Single-select",
  multi_select: "Multi-select",
};

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
      <TopBar title="Fields" />
      <div className="px-5 py-4">
        <p className="type-meta border-b-2 border-rule pb-3">
          New fields are usually created while editing a song; this page is for renaming, tidying
          options, merging duplicates and deleting unused fields.
        </p>

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
                        <div className="space-y-2 border-2 border-label p-3">
                          <p className="type-body text-ink">
                            Looks like a duplicate of <strong>{canonical.name}</strong>…
                          </p>
                          <Button
                            variant="secondary"
                            fullWidth={false}
                            className="h-10 px-3"
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
                            className="h-10 px-3"
                            disabled={isPending}
                            onClick={() => handleRename(field)}
                          >
                            Rename
                          </Button>
                        )}
                      </div>

                      {(field.type === "single_select" || field.type === "multi_select") && (
                        <div className="space-y-2">
                          <p className="type-field-label text-muted">Options</p>
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
