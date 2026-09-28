# Redesign inventory

Repo-vs-brief mapping, written before the grilling phase per `design-reference/CLAUDE_CODE_PROMPT.md` §0 step 1.

## Stack facts (settle §7.2 without needing to ask)

- **Tailwind v4**, CSS-first config (`@import "tailwindcss"` + `@theme inline` in `src/app/globals.css`). No `tailwind.config.js/ts`. Token work happens in `globals.css` via `@theme` mapping `--color-*` to CSS custom properties, exactly the pattern the brief already assumes.
- No shadcn/ui or other component library — `src/components/*.tsx` are hand-built.
- `lucide-react` is **not installed** — needs adding.
- Fonts currently: Geist Sans/Mono via `next/font/google`, loaded in `src/app/layout.tsx`. No Archivo, no Noto Sans Ethiopic, no JetBrains Mono yet.
- `<html>`/`<body>` in `layout.tsx` has no `data-theme` handling, no pre-paint inline script — theming today is a single light palette with one `prefers-color-scheme: dark` media query override, no manual toggle, no persistence.
- Root metadata title is still the create-next-app default (`"Create Next App"`) — unrelated to the redesign but worth fixing while touching `layout.tsx`.

## Screen → files

| Brief screen (§4) | Route | File(s) |
|---|---|---|
| 4.1 Login | `/login` | `src/app/login/page.tsx` (client component, all 4 steps: phone/needs_link/otp/error) |
| — check-phone API | `/api/auth/check-phone` | `src/app/api/auth/check-phone/route.ts` |
| — sign-out | `/api/auth/sign-out` | `src/app/api/auth/sign-out/route.ts` |
| 4.2 Catalogue/search | `/catalogue` | `src/app/(app)/catalogue/page.tsx` (server component) |
| 4.3 Song detail | `/songs/[id]` | `src/app/(app)/songs/[id]/page.tsx` + `src/components/song-attachments-manager.tsx` |
| 4.4 Add/edit song | `/admin/songs/new`, `/admin/songs/[id]/edit` | `src/app/(app)/admin/songs/new/page.tsx`, `src/app/(app)/admin/songs/[id]/edit/page.tsx`, both render `src/components/song-form.tsx` |
| 4.5 Bulk import | `/admin/import` | `src/app/(app)/admin/import/page.tsx` → `src/components/bulk-import.tsx`, parser in `src/lib/bulk-import/parse.ts` |
| 4.6 Slide generator | `/admin/slides` | `src/app/(app)/admin/slides/page.tsx` → `src/components/slide-generator.tsx`, PPTX build in `src/lib/slides/build-deck.ts`, download route `src/app/api/slides/generate/route.ts` |
| 4.7 Members | `/admin/members` | `src/app/(app)/admin/members/page.tsx` → `src/components/members-manager.tsx`, actions in `src/lib/actions/members.ts` |
| 4.8 Metadata fields | `/admin/metadata-fields` | `src/app/(app)/admin/metadata-fields/page.tsx` → `src/components/metadata-fields-list.tsx`, actions in `src/lib/actions/metadata-fields.ts`, `src/lib/actions/metadata-field-admin.ts` |
| 4.9 Nav / shell | all authenticated routes | `src/app/(app)/layout.tsx` — **single shared nav array**, conditionally adds admin items, one `<nav>` for mobile bottom bar and one `<header>` for desktop. This is the 6-item cramped bar named in the brief. No MoreSheet, no split view, no rail exist today. |
| Route guarding | all routes | `src/lib/supabase/middleware.ts` (`src/proxy.ts` is the Next 16 entry point) — redirects unauthenticated users to `/login`, redirects non-admins away from `/admin/*` based on `user.app_metadata.role`. Server-side, not just UI-hidden. |

## Data model facts (settles most of §7.3)

From `supabase/migrations/20260919120000_init_schema.sql` and `src/types/song.ts`:

- **No `number` column on `songs`.** No sequential/display number exists anywhere in the schema or the app today. Catalogue and admin lists sort by `title`. This is the single highest-impact gap — the brief's SongRow, song detail header, bulk-import drafts, and Slides preview all assume a `No. 014`-style number.
- **Section order/repeats:** `songs.lyrics` is a `jsonb` array of `{ type, label?, text }`, stored in performance order already — there's no separate "sections" table plus a distinct "order" sequence. A repeated chorus is currently represented by literally duplicating the section object in the array (this is exactly what the bulk-import default-arrangement logic and the Slides song-arranger already do). This means the brief's "collapsed repeat row" (§3.12) is achievable **without a schema change** — at render time, treat a section as "a repeat" when an earlier section in the same array has the same `type` + `text`.
- **Section label:** already modeled — `label?: string` exists on every section today (optional).
- **Indented response lines:** not a distinct field. A section's `text` is one free-text block. The brief's rule ("a blank line inside a section's text starts an indented group") is a pure rendering-time parse of the existing `text` string — no schema change needed.
- **Metadata field types:** `text | number | single_select | multi_select` — already exactly matches the brief's four types, including per-field `options` for the select types.
- **Recording duration:** not stored. `song_attachments` has `id, song_id, storage_path, filename, mime_type, uploaded_by, created_at` — no `duration`. The brief's DockedPlayer wants `m:ss / m:ss`; this can be read client-side from the `<audio>` element once metadata loads (no schema change), or captured at upload time and stored (schema change, but instant display). Real tradeoff — flagged for grilling.

## Auth facts (settles most of §7.5–§7.6)

- Phone format is **fully general E.164** today (`/^\+[1-9]\d{7,14}$/` in `check-phone/route.ts`), no country restriction. The brief's PhoneInput hardcodes a `+251` prefix cell — direct conflict, flagged for grilling.
- "Linked to the Telegram bot" is detected by `check-phone` querying `telegram_links` for a row matching the (normalized) phone number; returns `status: "needs_link"` with a `botDeepLink` (`https://t.me/<username>?start=link`) when absent.
- "I've linked it, continue" today re-runs the same `check-phone` call on click — no polling.
- No resend cooldown/expiry timer exists in the UI today (Supabase's own `max_frequency` throttle exists server-side in `config.toml`, but nothing surfaces a countdown to the user).
- Role is read from `user.app_metadata.role`, set via a Postgres trigger synced from `allowed_users.role` (see `handle_new_auth_user` / `allowed_users_sync_role` in the migration) and enforced both in middleware (route redirects) and in Postgres RLS policies (`jwt_role() = 'admin'`) — genuinely server-side, confirmed via live testing.
- No "last admin" or "self-demotion" protection exists today, at any layer — `members.ts` actions allow any admin to edit/remove any `allowed_users` row including their own.

## Search facts (settles §7.4)

- Server-side Postgres full-text search via a maintained `search_vector` tsvector column (trigger-updated from title + lyrics text + metadata values), queried with `.textSearch(..., { type: "websearch", config: "simple" })` in `catalogue/page.tsx`.
- No match-type classification, no snippet/highlight generation, no Ge'ez letter-variant normalization (ሀ/ሃ/ሐ/ኀ etc.), no number-aware matching — none of this exists today. The brief's ranked/badged/highlighted search result model is new work, not a restyle.

## Slides facts (settles part of §7.9)

- `build-deck.ts` already accepts, per song, an explicit ordered list of section instances (repeats included) plus a deck title/date/closing phrase — this already matches the brief's "per-song sung order with repeats" model structurally. It generates plain-background bold-centered-text slides matching the choir's real reference deck. Decks are **ephemeral** today — nothing is saved/reused server-side; `slide-generator.tsx` holds all state client-side until the download fires.
