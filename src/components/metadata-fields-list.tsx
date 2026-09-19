"use client";

import { useState, useTransition } from "react";
import { deleteMetadataField } from "@/lib/actions/metadata-field-admin";
import type { MetadataFieldDefinition } from "@/types/song";

export function MetadataFieldsList({ initialFields }: { initialFields: MetadataFieldDefinition[] }) {
  const [fields, setFields] = useState(initialFields);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!window.confirm("Delete this field? It will disappear from every song that used it.")) return;
    setFields((prev) => prev.filter((f) => f.id !== id));
    startTransition(async () => {
      const { error } = await deleteMetadataField(id);
      if (error) setError(error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Metadata fields</h1>
      <p className="text-sm text-foreground/60">
        Fields are usually created inline while adding or editing a song. Manage or remove them here.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {fields.length === 0 ? (
        <p className="text-sm text-foreground/50">No fields yet.</p>
      ) : (
        <ul className="space-y-2">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-foreground/10 p-3"
            >
              <div>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-foreground/50">
                  {f.type}
                  {f.options.length > 0 ? ` — ${f.options.join(", ")}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(f.id)}
                className="text-sm text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
