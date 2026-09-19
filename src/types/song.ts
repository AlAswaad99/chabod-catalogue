export type LyricsSectionType = "verse" | "chorus" | "bridge" | "intro" | "outro" | "other";

export interface LyricsSection {
  type: LyricsSectionType;
  label?: string;
  text: string;
}

export type MetadataFieldType = "text" | "number" | "single_select" | "multi_select";

export interface MetadataFieldDefinition {
  id: string;
  name: string;
  type: MetadataFieldType;
  options: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Keyed by MetadataFieldDefinition.id. text/number are scalars,
// single_select is a string, multi_select is a string array.
export type SongMetadata = Record<string, string | number | string[]>;

export interface Song {
  id: string;
  title: string;
  lyrics: LyricsSection[];
  metadata: SongMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongAttachment {
  id: string;
  song_id: string;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export type MemberRole = "admin" | "member";

export interface AllowedUser {
  id: string;
  phone_number: string;
  role: MemberRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}
