import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MetadataFieldDefinition } from "@/types/song";

// Per-request memoised, so a layout and the page beneath it can both ask for
// the field definitions without paying for two round trips to the database.
export const getFieldDefs = cache(async (): Promise<MetadataFieldDefinition[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("metadata_field_definitions").select("*").order("name");
  return (data ?? []) as unknown as MetadataFieldDefinition[];
});
