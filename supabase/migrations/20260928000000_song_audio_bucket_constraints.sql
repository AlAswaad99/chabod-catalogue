-- Server-side enforcement to match the client-side checks in
-- song-attachments-manager.tsx — Storage itself now rejects oversized or
-- wrong-type uploads regardless of what the client sends.
update storage.buckets
set
  file_size_limit = 26214400, -- 25 MiB
  allowed_mime_types = array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a']
where id = 'song-audio';
