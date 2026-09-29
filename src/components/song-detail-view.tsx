"use client";

import type { ReactNode } from "react";
import { Maximize2, Minimize2, Pencil } from "lucide-react";
import { useFullscreen } from "@/lib/fullscreen";
import { SongAttachmentsManager } from "@/components/song-attachments-manager";
import { SongLyrics } from "@/components/song-lyrics";
import { SongDesktopSidebar } from "@/components/song-desktop-sidebar";
import { ReadingSizeControl } from "@/components/reading-size-control";
import { TopBar } from "@/components/ui/top-bar";
import { MetaGrid } from "@/components/ui/meta-grid";
import { DockedPlayer } from "@/components/ui/docked-player";
import { Button } from "@/components/ui/button";
import type { MetaGridField } from "@/components/ui/meta-grid";
import type { DockedPlayerRecording } from "@/components/ui/docked-player";
import type { AttachmentWithUrl } from "@/components/song-attachments-manager";
import type { Song } from "@/types/song";

export function SongDetailView({
  song,
  metaFields,
  isAdmin,
  playableRecordings,
  signedAttachments,
  listPane,
}: {
  song: Song;
  metaFields: MetaGridField[];
  isAdmin: boolean;
  playableRecordings: DockedPlayerRecording[];
  signedAttachments: AttachmentWithUrl[];
  listPane: ReactNode;
}) {
  const { fullscreen, setFullscreen } = useFullscreen();

  // Reading focus mode: just the lyrics and the docked player, on an
  // otherwise clean screen — no TopBar, header, metadata, recordings
  // manager, or nav chrome (AdminShell hides itself too, via the same
  // context). A slim floating bar keeps reading-size and the exit control
  // reachable without bringing back everything else.
  if (fullscreen) {
    return (
      <div>
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 border-b-2 border-rule bg-ground px-4 py-2">
          <p className="type-topbar-title min-w-0 flex-1 truncate text-ink">{song.title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <ReadingSizeControl />
            <Button
              variant="icon"
              icon={Minimize2}
              onClick={() => setFullscreen(false)}
              aria-label="Exit fullscreen"
            />
          </div>
        </div>

        <div className={`pt-[52px] ${playableRecordings.length > 0 ? "pb-[72px]" : ""}`}>
          <SongLyrics sections={song.lyrics} />
        </div>

        <DockedPlayer recordings={playableRecordings} />
      </div>
    );
  }

  return (
    <div className="tablet:flex desktop:block">
      {/* Tablet split-view's left column (§4.10) — hidden on phone (full-screen
          reading) and at desktop (which has its own list column via the rail
          + reading column + sidebar layout instead). */}
      <div className="hidden tablet:block tablet:w-[380px] tablet:shrink-0 tablet:border-r-2 tablet:border-rule desktop:hidden">
        {listPane}
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
              <Button
                variant="icon"
                icon={Maximize2}
                onClick={() => setFullscreen(true)}
                aria-label="Read fullscreen"
              />
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
