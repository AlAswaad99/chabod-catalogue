import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CatalogueListPane } from "@/components/catalogue-list-pane";
import { SongDetailView } from "@/components/song-detail-view";
import type { MetadataFieldDefinition, Song, SongAttachment } from "@/types/song";

function formatMetadataValue(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default async function SongDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  const [{ data: songRow, error }, { data: fieldDefs }, { data: attachments }] = await Promise.all([
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    supabase.from("metadata_field_definitions").select("*").order("name"),
    supabase.from("song_attachments").select("*").eq("song_id", id).order("created_at"),
  ]);

  if (error || !songRow) {
    notFound();
  }

  const song = songRow as unknown as Song;
  const fieldDefList = (fieldDefs ?? []) as unknown as MetadataFieldDefinition[];

  const metaFields = fieldDefList
    .map((def) => {
      const raw = song.metadata?.[def.id];
      if (raw === undefined || raw === null || raw === "") return null;
      return {
        fieldId: def.id,
        name: def.name,
        value: formatMetadataValue(raw),
        isKey: def.name.toLowerCase() === "key",
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const attachmentRows = (attachments ?? []) as unknown as SongAttachment[];
  const signedAttachments = await Promise.all(
    attachmentRows.map(async (a) => {
      const { data } = await supabase.storage
        .from("song-audio")
        .createSignedUrl(a.storage_path, 60 * 60);
      return { ...a, url: data?.signedUrl ?? null };
    }),
  );
  const playableRecordings = signedAttachments
    .filter((a): a is typeof a & { url: string } => a.url !== null)
    .map((a) => ({ id: a.id, url: a.url, filename: a.filename }));

  return (
    <SongDetailView
      song={song}
      metaFields={metaFields}
      isAdmin={isAdmin}
      playableRecordings={playableRecordings}
      signedAttachments={signedAttachments}
      listPane={<CatalogueListPane query={query} selectedSongId={song.id} isAdmin={isAdmin} />}
    />
  );
}
