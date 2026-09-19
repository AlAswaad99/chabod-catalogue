"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrGetMetadataField, addOptionToField } from "@/lib/actions/metadata-fields";
import { saveSong } from "@/lib/actions/songs";
import type {
  LyricsSection,
  LyricsSectionType,
  MetadataFieldDefinition,
  MetadataFieldType,
  Song,
  SongMetadata,
} from "@/types/song";

const SECTION_TYPES: LyricsSectionType[] = ["verse", "chorus", "bridge", "intro", "outro", "other"];
const FIELD_TYPES: { value: MetadataFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
];

function emptySection(): LyricsSection {
  return { type: "verse", label: "", text: "" };
}

export function SongForm({
  initialSong,
  initialFieldDefs,
}: {
  initialSong?: Song;
  initialFieldDefs: MetadataFieldDefinition[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSong?.title ?? "");
  const [sections, setSections] = useState<LyricsSection[]>(
    initialSong?.lyrics?.length ? initialSong.lyrics : [emptySection()],
  );
  const [metadata, setMetadata] = useState<SongMetadata>(initialSong?.metadata ?? {});
  const [fieldDefs, setFieldDefs] = useState<MetadataFieldDefinition[]>(initialFieldDefs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<MetadataFieldType>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  function updateSection(index: number, patch: Partial<LyricsSection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function setMetadataValue(fieldId: string, value: string | number | string[]) {
    setMetadata((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleMultiSelectValue(fieldId: string, option: string) {
    const current = (metadata[fieldId] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setMetadataValue(fieldId, next);
  }

  async function handleAddField() {
    const options = newFieldOptions
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const { data, error } = await createOrGetMetadataField({
      name: newFieldName,
      type: newFieldType,
      options,
    });
    if (error || !data) {
      setError(error ?? "Couldn't create field.");
      return;
    }
    setFieldDefs((prev) => (prev.some((f) => f.id === data.id) ? prev : [...prev, data]));
    setNewFieldName("");
    setNewFieldOptions("");
    setShowAddField(false);
  }

  async function handleAddOption(fieldId: string) {
    const option = window.prompt("New option value:");
    if (!option) return;
    const { data, error } = await addOptionToField(fieldId, option);
    if (error || !data) {
      setError(error ?? "Couldn't add option.");
      return;
    }
    setFieldDefs((prev) => prev.map((f) => (f.id === fieldId ? data : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await saveSong({
        id: initialSong?.id,
        title,
        lyrics: sections.filter((s) => s.text.trim().length > 0),
        metadata,
      });
      if (error || !data) {
        setError(error ?? "Couldn't save song.");
        return;
      }
      router.push(`/songs/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-foreground/20 bg-transparent px-4 py-3 text-base outline-none focus:border-foreground/50"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Lyrics</h2>
          <button
            type="button"
            onClick={() => setSections((prev) => [...prev, emptySection()])}
            className="text-sm text-foreground/60 underline"
          >
            + Add section
          </button>
        </div>
        {sections.map((section, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-foreground/10 p-3">
            <div className="flex gap-2">
              <select
                value={section.type}
                onChange={(e) => updateSection(i, { type: e.target.value as LyricsSectionType })}
                className="rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-sm"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                placeholder="Label (optional), e.g. Verse 1"
                value={section.label ?? ""}
                onChange={(e) => updateSection(i, { label: e.target.value })}
                className="flex-1 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-sm"
              />
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(i)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={section.text}
              onChange={(e) => updateSection(i, { text: e.target.value })}
              rows={4}
              placeholder="Lyrics for this section…"
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50"
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Metadata</h2>
          <button
            type="button"
            onClick={() => setShowAddField((v) => !v)}
            className="text-sm text-foreground/60 underline"
          >
            + Add field
          </button>
        </div>

        {showAddField && (
          <div className="space-y-2 rounded-lg border border-foreground/10 p-3">
            <input
              placeholder="Field name, e.g. Key"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as MetadataFieldType)}
              className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {(newFieldType === "single_select" || newFieldType === "multi_select") && (
              <input
                placeholder="Options, comma separated, e.g. C, D, E"
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
              />
            )}
            <button
              type="button"
              onClick={handleAddField}
              className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium"
            >
              Create field
            </button>
          </div>
        )}

        {fieldDefs.length === 0 ? (
          <p className="text-sm text-foreground/50">No metadata fields yet — add one above.</p>
        ) : (
          <div className="space-y-3">
            {fieldDefs.map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-sm font-medium">{field.name}</label>
                {field.type === "text" && (
                  <input
                    value={(metadata[field.id] as string) ?? ""}
                    onChange={(e) => setMetadataValue(field.id, e.target.value)}
                    className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
                  />
                )}
                {field.type === "number" && (
                  <input
                    type="number"
                    value={(metadata[field.id] as string) ?? ""}
                    onChange={(e) => setMetadataValue(field.id, e.target.value)}
                    className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
                  />
                )}
                {field.type === "single_select" && (
                  <div className="flex gap-2">
                    <select
                      value={(metadata[field.id] as string) ?? ""}
                      onChange={(e) => setMetadataValue(field.id, e.target.value)}
                      className="flex-1 rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {field.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddOption(field.id)}
                      className="text-sm text-foreground/60 underline whitespace-nowrap"
                    >
                      + option
                    </button>
                  </div>
                )}
                {field.type === "multi_select" && (
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((o) => {
                        const selected = ((metadata[field.id] as string[]) ?? []).includes(o);
                        return (
                          <button
                            type="button"
                            key={o}
                            onClick={() => toggleMultiSelectValue(field.id, o)}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/20"
                            }`}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddOption(field.id)}
                      className="text-sm text-foreground/60 underline"
                    >
                      + option
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-foreground text-background py-3 font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : initialSong ? "Save changes" : "Add song"}
      </button>
    </form>
  );
}
