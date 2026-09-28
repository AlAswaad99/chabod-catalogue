"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { SongAttachment } from "@/types/song";

const MAX_SIZE = 25 * 1024 * 1024;
const ACCEPT = ".mp3,.wav,.aac,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/mp4,audio/x-m4a";

export interface AttachmentWithUrl extends SongAttachment {
  url: string | null;
}

function sanitizeForFilename(text: string): string {
  return text.replace(/[\\/:*?"<>|]/g, "").trim();
}

function timestampLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

// Admin-only recordings management (upload/delete). Playback for everyone
// lives in DockedPlayer instead — this renders nothing for members, and
// nothing for admins either once §4.4's editor grows its own recordings UI.
export function SongAttachmentsManager({
  songId,
  songTitle,
  isAdmin,
  initialAttachments,
}: {
  songId: string;
  songTitle: string;
  isAdmin: boolean;
  initialAttachments: AttachmentWithUrl[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setError("File is too large — max 25MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const storagePath = `${songId}/${crypto.randomUUID()}.${ext}`;
      const displayFilename = `${sanitizeForFilename(songTitle)} - ${timestampLabel()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("song-audio")
        .upload(storagePath, file, { contentType: file.type || undefined });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("song_attachments").insert({
        song_id: songId,
        storage_path: storagePath,
        filename: displayFilename,
        mime_type: file.type || null,
        uploaded_by: user?.id ?? null,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: AttachmentWithUrl) {
    if (confirmingId !== attachment.id) {
      setConfirmingId(attachment.id);
      return;
    }
    setConfirmingId(null);
    await supabase.storage.from("song-audio").remove([attachment.storage_path]);
    await supabase.from("song_attachments").delete().eq("id", attachment.id);
    router.refresh();
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-3 border-t-2 border-rule px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="type-section-label">Recordings</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="text"
          icon={Upload}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload recording"}
        </Button>
      </div>

      {error && <p className="type-meta text-danger">{error}</p>}

      {initialAttachments.length === 0 ? (
        <p className="type-meta">No recordings yet.</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {initialAttachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
              <p className="type-meta min-w-0 truncate text-ink">{a.filename}</p>
              <button
                type="button"
                onClick={() => handleDelete(a)}
                className={`type-badge shrink-0 px-2 py-1 ${
                  confirmingId === a.id ? "bg-danger text-ground" : "text-danger"
                }`}
              >
                {confirmingId === a.id ? (
                  "Tap again"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Trash size={14} strokeWidth={2} aria-hidden />
                    Delete
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
