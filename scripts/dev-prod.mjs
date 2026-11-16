// Runs `next dev` against the hosted (production) Supabase project instead of
// the local Docker stack that .env.local points at.
//
//   npm run dev:prod            (extra args go to next dev, e.g. -- -p 3100)
//
// Values already in the process environment win over .env.local, so loading
// .env.production into this process first is enough. (Node's --env-file flag
// can't be used: Next re-passes execArgv through NODE_OPTIONS, which rejects it.)
//
// WARNING: this is the real database. Saving, deleting or renumbering songs
// here changes live data.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

process.loadEnvFile(".env.production");

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

console.warn("\n⚠  dev:prod — connected to the HOSTED Supabase project. Edits change live data.\n");

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
