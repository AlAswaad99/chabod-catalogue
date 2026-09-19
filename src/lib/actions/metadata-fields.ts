"use server";

import { createClient } from "@/lib/supabase/server";
import type { MetadataFieldDefinition, MetadataFieldType } from "@/types/song";

export interface CreateMetadataFieldInput {
  name: string;
  type: MetadataFieldType;
  options?: string[];
}

// Case-insensitive create-or-reuse: if a field with this name already
// exists, returns it instead of erroring, so admins typing an existing
// field name during song entry don't fragment the catalogue with near
// duplicates ("Voicing" vs "voicing").
export async function createOrGetMetadataField(
  input: CreateMetadataFieldInput,
): Promise<{ data: MetadataFieldDefinition | null; error: string | null }> {
  const supabase = await createClient();
  const name = input.name.trim();

  if (!name) {
    return { data: null, error: "Field name is required." };
  }

  const { data: existing } = await supabase
    .from("metadata_field_definitions")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return { data: existing as unknown as MetadataFieldDefinition, error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("metadata_field_definitions")
    .insert({
      name,
      type: input.type,
      options: input.type === "single_select" || input.type === "multi_select" ? (input.options ?? []) : [],
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as MetadataFieldDefinition, error: null };
}

// Adds a new option to an existing single/multi-select field, deduped
// case-insensitively, so filters stay clean as admins add values inline.
export async function addOptionToField(
  fieldId: string,
  option: string,
): Promise<{ data: MetadataFieldDefinition | null; error: string | null }> {
  const supabase = await createClient();
  const trimmed = option.trim();
  if (!trimmed) return { data: null, error: "Option is required." };

  const { data: field, error: fetchError } = await supabase
    .from("metadata_field_definitions")
    .select("*")
    .eq("id", fieldId)
    .single();

  if (fetchError || !field) {
    return { data: null, error: fetchError?.message ?? "Field not found." };
  }

  const existingOptions = (field.options as unknown as string[]) ?? [];
  const alreadyExists = existingOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const nextOptions = alreadyExists ? existingOptions : [...existingOptions, trimmed];

  const { data, error } = await supabase
    .from("metadata_field_definitions")
    .update({ options: nextOptions })
    .eq("id", fieldId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as MetadataFieldDefinition, error: null };
}
