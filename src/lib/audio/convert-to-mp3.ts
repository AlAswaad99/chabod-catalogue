"use client";

// Client-side transcoding so every recording lands in storage as MP3
// regardless of what an admin uploads (WAV, AAC, M4A, OGG, ...) — one
// universally-playable format instead of a bucket of codecs. Runs entirely
// in the browser via a WASM build of ffmpeg, loaded lazily and reused across
// uploads in the same session. The core is vendored into public/ffmpeg at
// install time (scripts/copy-ffmpeg-core.js) rather than fetched from a CDN,
// so conversion doesn't depend on a third-party host being reachable.
const CORE_BASE_URL = "/ffmpeg";

const MP3_EXTENSION_RE = /\.mp3$/i;

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const instance = new FFmpeg();
      await instance.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return instance;
    })().catch((err) => {
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}

function mp3Filename(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "recording"}.mp3`;
}

/**
 * Converts an audio file to MP3 in-browser. Files that are already MP3 are
 * returned as-is (no re-encode). `onProgress` receives 0–1.
 */
export async function convertToMp3(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  if (MP3_EXTENSION_RE.test(file.name)) return file;

  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inputName = `input-${crypto.randomUUID()}`;
  const outputName = `output-${crypto.randomUUID()}.mp3`;

  const onProgressEvent = onProgress
    ? ({ progress }: { progress: number }) => onProgress(Math.min(1, Math.max(0, progress)))
    : undefined;
  if (onProgressEvent) ffmpeg.on("progress", onProgressEvent);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const code = await ffmpeg.exec(["-i", inputName, "-vn", "-b:a", "192k", outputName]);
    if (code !== 0) throw new Error("Audio conversion failed.");
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? Uint8Array.from(data) : new TextEncoder().encode(data);
    return new File([bytes], mp3Filename(file.name), { type: "audio/mpeg" });
  } finally {
    if (onProgressEvent) ffmpeg.off("progress", onProgressEvent);
    await Promise.all([
      ffmpeg.deleteFile(inputName).catch(() => {}),
      ffmpeg.deleteFile(outputName).catch(() => {}),
    ]);
  }
}
