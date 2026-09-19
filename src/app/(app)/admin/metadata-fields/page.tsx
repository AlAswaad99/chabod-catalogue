import { createClient } from "@/lib/supabase/server";
import { MetadataFieldsList } from "@/components/metadata-fields-list";
import type { MetadataFieldDefinition } from "@/types/song";

export default async function MetadataFieldsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("metadata_field_definitions").select("*").order("name");
  return <MetadataFieldsList initialFields={(data ?? []) as unknown as MetadataFieldDefinition[]} />;
}
