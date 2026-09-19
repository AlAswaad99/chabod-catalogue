"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteMetadataField(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("metadata_field_definitions").delete().eq("id", id);
  if (!error) revalidatePath("/admin/metadata-fields");
  return { error: error?.message ?? null };
}
