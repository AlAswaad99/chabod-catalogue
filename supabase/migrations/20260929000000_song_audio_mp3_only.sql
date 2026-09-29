-- Every recording is now transcoded to MP3 client-side before upload
-- (src/lib/audio/convert-to-mp3.ts), so storage only ever needs to accept
-- the one format it's actually given — tightened here to match, as defense
-- in depth against a client that skips the conversion step.
update storage.buckets
set allowed_mime_types = array['audio/mpeg']
where id = 'song-audio';
