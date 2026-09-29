// Vendors the ffmpeg.wasm core into public/ so audio conversion
// (src/lib/audio/convert-to-mp3.ts) can load it from our own origin instead
// of a third-party CDN. Re-run automatically by the postinstall script
// whenever @ffmpeg/core is (re)installed.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "node_modules", "@ffmpeg", "core", "dist", "umd");
const destDir = path.join(__dirname, "..", "public", "ffmpeg");

if (!fs.existsSync(srcDir)) {
  console.warn(`[copy-ffmpeg-core] ${srcDir} not found — skipping (is @ffmpeg/core installed?)`);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}
console.log(`[copy-ffmpeg-core] vendored ffmpeg-core into ${destDir}`);
