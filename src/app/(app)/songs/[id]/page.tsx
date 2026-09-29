import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SongAttachmentsManager } from "@/components/song-attachments-manager";
import { SongLyrics } from "@/components/song-lyrics";
import { SongDesktopSidebar } from "@/components/song-desktop-sidebar";
import { CatalogueListPane } from "@/components/catalogue-list-pane";
import { ReadingSizeControl } from "@/components/reading-size-control";
import { TopBar } from "@/components/ui/top-bar";
import { MetaGrid } from "@/components/ui/meta-grid";
import { DockedPlayer } from "@/components/ui/docked-player";
import { Button } from "@/components/ui/button";
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
    <div className="tablet:flex desktop:block">
      {/* Tablet split-view's left column (§4.10) — hidden on phone (full-screen
          reading) and at desktop (which has its own list column via the rail
          + reading column + sidebar layout instead). */}
      <div className="hidden tablet:block tablet:w-[380px] tablet:shrink-0 tablet:border-r-2 tablet:border-rule desktop:hidden">
        <CatalogueListPane query={query} selectedSongId={song.id} isAdmin={isAdmin} />
      </div>

      <div
        className={`tablet:min-w-0 tablet:flex-1 ${playableRecordings.length > 0 ? "pb-[72px] desktop:pb-0" : ""}`}
      >
        <TopBar
          backHref="/catalogue"
          noBorder
          right={
            <div className="flex items-center gap-2">
              <ReadingSizeControl />
              {isAdmin && (
                <>
                  <div className="desktop:hidden">
                    <Button
                      variant="icon"
                      icon={Pencil}
                      href={`/admin/songs/${song.id}/edit`}
                      aria-label="Edit song"
                    />
                  </div>
                  <div className="hidden desktop:block">
                    <Button
                      variant="secondary"
                      icon={Pencil}
                      href={`/admin/songs/${song.id}/edit`}
                      fullWidth={false}
                      className="h-11 px-3"
                    >
                      Edit
                    </Button>
                  </div>
                </>
              )}
            </div>
          }
        />

        <div className="desktop:flex">
          <div className="min-w-0 flex-1 desktop:max-w-[600px] desktop:px-14">
            <div className="space-y-1 border-b-2 border-rule px-5 pb-4 desktop:px-0">
              <p className="type-mono text-muted">No. {String(song.number).padStart(3, "0")}</p>
              <h1 className="type-song-title text-ink">{song.title}</h1>
            </div>

            {metaFields.length > 0 && (
              <div className="desktop:hidden">
                <MetaGrid fields={metaFields} />
              </div>
            )}

            <SongLyrics sections={song.lyrics} />
          </div>

          <SongDesktopSidebar fields={metaFields} recordings={playableRecordings} />
        </div>

        <SongAttachmentsManager
          songId={song.id}
          songTitle={song.title}
          isAdmin={isAdmin}
          initialAttachments={signedAttachments}
        />

        <div className="desktop:hidden">
          <DockedPlayer recordings={playableRecordings} aboveBottomNav={isAdmin} spanTabletRightColumn />
        </div>
      </div>
    </div>
  );
}
