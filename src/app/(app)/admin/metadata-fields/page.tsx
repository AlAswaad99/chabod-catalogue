import { createClient } from "@/lib/supabase/server";
import { MetadataFieldsList } from "@/components/metadata-fields-list";
import type { MetadataFieldDefinition, SongMetadata } from "@/types/song";

export interface FieldUsage {
  songCount: number;
  optionCounts: Record<string, number>;
}

export default async function MetadataFieldsPage() {
  const supabase = await createClient();
  const [{ data: fields }, { data: songs }] = await Promise.all([
    supabase.from("metadata_field_definitions").select("*").order("name"),
    supabase.from("songs").select("metadata"),
  ]);

  const usage: Record<string, FieldUsage> = {};
  for (const song of songs ?? []) {
    const metadata = song.metadata as unknown as SongMetadata;
    for (const [fieldId, value] of Object.entries(metadata)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;

      const entry = (usage[fieldId] ??= { songCount: 0, optionCounts: {} });
      entry.songCount++;

      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        const key = String(v);
        entry.optionCounts[key] = (entry.optionCounts[key] ?? 0) + 1;
      }
    }
  }

  return (
    <MetadataFieldsList
      initialFields={(fields ?? []) as unknown as MetadataFieldDefinition[]}
      usage={usage}
    />
  );
}
