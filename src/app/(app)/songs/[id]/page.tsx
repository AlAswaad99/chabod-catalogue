import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LyricsSection, MetadataFieldDefinition, Song, SongAttachment } from "@/types/song";

function formatMetadataValue(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  const [{ data: songRow, error }, { data: fieldDefs }, { data: attachments }] = await Promise.all([
    supabase.from("songs").select("*").eq("id", id).maybeSingle(),
    supabase.from("metadata_field_definitions").select("*"),
    supabase.from("song_attachments").select("*").eq("song_id", id).order("created_at"),
  ]);

  if (error || !songRow) {
    notFound();
  }

  const song = songRow as unknown as Song;
  const fieldDefMap = new Map(
    ((fieldDefs ?? []) as unknown as MetadataFieldDefinition[]).map((f) => [f.id, f]),
  );

  const attachmentRows = (attachments ?? []) as unknown as SongAttachment[];
  const signedAttachments = await Promise.all(
    attachmentRows.map(async (a) => {
      const { data } = await supabase.storage
        .from("song-audio")
        .createSignedUrl(a.storage_path, 60 * 60);
      return { ...a, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/catalogue" className="text-sm text-foreground/60 hover:underline">
          ← Back to catalogue
        </Link>
        {isAdmin && (
          <Link href={`/admin/songs/${song.id}/edit`} className="text-sm text-foreground/60 underline">
            Edit
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-semibold">{song.title}</h1>

      {Object.keys(song.metadata ?? {}).length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {Object.entries(song.metadata).map(([fieldId, value]) => {
            const def = fieldDefMap.get(fieldId);
            if (!def) return null;
            return (
              <div key={fieldId}>
                <dt className="text-foreground/50">{def.name}</dt>
                <dd className="font-medium">{formatMetadataValue(value)}</dd>
              </div>
            );
          })}
        </dl>
      )}

      <div className="space-y-4">
        {(song.lyrics as LyricsSection[]).map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="text-xs uppercase tracking-wide text-foreground/50 mb-1">
                {section.label}
              </p>
            )}
            <p className="whitespace-pre-wrap leading-relaxed">{section.text}</p>
          </div>
        ))}
      </div>

      {signedAttachments.length > 0 && (
        <div className="space-y-2 border-t border-foreground/10 pt-4">
          <p className="text-sm font-medium">Recordings</p>
          {signedAttachments.map((a) => (
            <div key={a.id} className="space-y-1">
              <p className="text-xs text-foreground/60">{a.filename}</p>
              {a.url && <audio controls src={a.url} className="w-full" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
