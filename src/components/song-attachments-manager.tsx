"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    if (!window.confirm(`Delete "${attachment.filename}"?`)) return;
    await supabase.storage.from("song-audio").remove([attachment.storage_path]);
    await supabase.from("song_attachments").delete().eq("id", attachment.id);
    router.refresh();
  }

  if (!isAdmin && initialAttachments.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-foreground/10 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Recordings</p>
        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-foreground/60 underline disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "+ Upload recording"}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialAttachments.length === 0 ? (
        <p className="text-sm text-foreground/50">No recordings yet.</p>
      ) : (
        initialAttachments.map((a) => (
          <div key={a.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground/60 truncate">{a.filename}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  className="text-xs text-red-600 shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
            {a.url && <audio controls src={a.url} className="w-full" />}
          </div>
        ))
      )}
    </div>
  );
}
