import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getFieldDefs } from "@/lib/data";
import { SongDetailView } from "@/components/song-detail-view";
import type { Song, SongAttachment } from "@/types/song";

function formatMetadataValue(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default async function SongDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Everything the page needs is requested at once — the session claims are
  // local (no network), so the three queries below are the only round trips.
  const [user, fieldDefList, { data: songRow, error }, { data: attachments }] = await Promise.all([
    getSessionUser(),
    getFieldDefs(),
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    supabase.from("song_attachments").select("*").eq("song_id", id).order("created_at"),
  ]);
  const isAdmin = user?.isAdmin ?? false;

  if (error || !songRow) {
    notFound();
  }

  const song = songRow as unknown as Song;

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

  // One storage call for all recordings instead of one per file.
  const attachmentRows = (attachments ?? []) as unknown as SongAttachment[];
  const urlByPath = new Map<string, string>();
  if (attachmentRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("song-audio")
      .createSignedUrls(
        attachmentRows.map((a) => a.storage_path),
        60 * 60,
      );
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }
  }
  const signedAttachments = attachmentRows.map((a) => ({ ...a, url: urlByPath.get(a.storage_path) ?? null }));
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
    />
  );
}
