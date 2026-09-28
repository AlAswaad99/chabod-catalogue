# Redesign plan

Ordered, PR-sized steps. Each is committed individually (Q12: straight to `main`, no feature flag) once its done-check passes. Built against the tokens/components in `design-reference/CLAUDE_CODE_PROMPT.md` §2–3 and the decisions in `docs/redesign/decisions.md`.

Phone + desktop-rail together per screen, tablet split-view deferred (Q10). Member-facing screens before admin screens.

---

## Phase 0 — Foundation

### Step 1: Design tokens + theming infrastructure
- **Touches:** `src/app/globals.css`, `src/app/layout.tsx`
- Add every token from brief §2.1 as CSS custom properties on `:root` (dark default) and `[data-theme="light"]`. Wire through Tailwind's `@theme` block as semantic colors (`bg-ground`, `text-muted`, `border-rule`, etc.) — no raw hex anywhere after this step.
- Add the pre-paint inline script in `layout.tsx` that reads `localStorage` and sets `data-theme` on `<html>` before first paint (no flash), plus `<meta name="theme-color">` per theme.
- Add a lightweight guard (ESLint rule or a `grep`-based check wired into `npm run lint`) blocking raw hex and `rounded-*` in `src/components/**`.
- **Done-check:** toggling `data-theme` manually in devtools flips the whole page between the two palettes with no unstyled flash on reload; lint fails if a raw hex or `rounded-*` is introduced in `src/components`.

### Step 2: Typography
- **Touches:** `src/app/layout.tsx`, `src/app/globals.css`
- Replace Geist Sans/Mono with Archivo, Noto Sans Ethiopic, and JetBrains Mono via `next/font/google` (brief §2.2 weights). Set the two font-stack variables (UI order vs. lyrics-reversed order). Add the type-scale as utility classes or a small `<Text>`-style helper matching brief's table (§2.2).
- **Done-check:** a mixed Amharic/Latin test string (e.g. song title + "· Praise") renders each script in its correct face with no fallback-to-Latin-tofu on Ge'ez characters; lyrics block visibly uses 1.75 line-height.

### Step 3: Icons
- **Touches:** `package.json`
- `npm install lucide-react`. No other change in this step.
- **Done-check:** `npx tsc --noEmit` clean, one icon renders in a throwaway spot to confirm the import path works, then revert the throwaway usage.

### Step 4: Core primitive components
- **Touches:** new `src/components/ui/` — `wordmark.tsx`, `button.tsx`, `text-input.tsx`, `phone-input.tsx`, `otp-input.tsx`, `search-bar.tsx`, `segmented-control.tsx`, `chip.tsx`, `badge.tsx`
- Build each per brief §3.1–§3.9, both themes, hover/focus/disabled states, 44px minimum tap targets, `:focus-visible` gold ring.
- **Done-check:** a throwaway `/dev/ui-kit` page (deleted before the final step) renders every component in both themes side by side for visual review; keyboard-only tab-through hits a visible focus ring on every one.

### Step 5: Composite components
- **Touches:** new `src/components/ui/` — `song-row.tsx`, `meta-grid.tsx`, `lyric-section.tsx`, `docked-player.tsx`, `toast.tsx`, `top-bar.tsx`, `sticky-footer-action.tsx`
- Build per brief §3.10–§3.13, §3.16–§3.18, including the "repeat row" collapse logic in `lyric-section.tsx` (dedup by `type`+`text` match against earlier sections in the same array — no schema change, per the inventory).
- **Done-check:** same throwaway kit page extended with these; `LyricSection` correctly collapses a manually-constructed array with a duplicated chorus into one 48px repeat row instead of repeating the full text.

### Step 6: Navigation shell — BottomNav, MoreSheet, DesktopRail
- **Touches:** new `src/components/ui/bottom-nav.tsx`, `more-sheet.tsx`, `desktop-rail.tsx`; rewrite `src/app/(app)/layout.tsx`
- This is the actual fix for the cramped-nav complaint. Members: no bottom bar, theme + sign-out in the catalogue header only. Admins below 1200px: 3-cell BottomNav (Catalogue · Add song · More) + MoreSheet (2×2 grid: Slides/Import/Members/Fields, Appearance segmented control, Sign out), focus-trapped, Esc-closes, 240ms slide / 200ms scrim fade, `prefers-reduced-motion` respected. Admins 1200px+: DesktopRail replaces both (§4.10 desktop bullet).
- **Done-check:** resizing the viewport across 1200px swaps BottomNav+MoreSheet for DesktopRail with no layout jump; a member account never sees any admin nav element at any width (already covered by the existing member-role RLS test, now also checked in the UI); Esc and scrim-tap both close the sheet and return focus to the More button.

### Step 7: Migration — song numbers
- **Touches:** new `supabase/migrations/*_add_song_numbers.sql`
- Sequence-backed `songs.number integer not null unique default nextval(...)`, per Q1. Backfills existing rows.
- **Done-check:** `supabase db reset` applies cleanly; inserting two songs concurrently (or in quick succession) never collides; catalogue/admin list ordering switches from `title` to `number`.

### Step 8: Migration — last-admin / self-demotion guard
- **Touches:** new `supabase/migrations/*_allowed_users_admin_guard.sql`
- Trigger on `allowed_users` rejecting an `UPDATE`/`DELETE` that would remove the last admin, or that an admin attempts against their own row, per Q6.
- **Done-check:** direct SQL attempts (not through the app) to demote the sole admin, and to let an admin delete their own row, both fail with a clear error — tested the same way the member-role RLS boundary was verified earlier (raw REST calls with a real token), not just through the UI.

---

## Phase 1 — Member-facing screens

### Step 9: Login
- **Touches:** `src/app/login/page.tsx` (likely split into smaller pieces under it), `src/app/api/auth/check-phone/route.ts` (tighten E.164 regex to `+251` + expected digit count per Q2)
- Phone step with fixed `+251` PhoneInput; needs-link step (numbered 3-step instructions, "Open @ChabodBot" / "I've linked it, continue"); OTP step with `OtpInput` (auto-submit at 6 digits, real resend countdown sourced from server `max_frequency`, inline wrong/expired-code error instead of a separate error screen); Wordmark. Phone + desktop.
- **Done-check:** full phone→link→otp→catalogue flow works against local Supabase exactly as it does today (same test-OTP account), visually matches brief §4.1, resend countdown counts down from the real configured value and becomes a working "Resend" action at zero.

### Step 10: Catalogue / search
- **Touches:** `src/app/(app)/catalogue/page.tsx`, likely a new `src/lib/search/` module for ranking/snippet/badge logic
- New ranked search (title/number → lyrics → field values), match badges, highlighted snippets, number-aware matching (Step 7 dependency). `SongRow`/`SearchBar` wired in. Member header (wordmark, count, theme toggle, sign out) vs. admin (BottomNav/MoreSheet from Step 6). Phone + desktop rail.
- **Done-check:** searching a known lyric substring returns the song with a highlighted snippet and a "lyrics" badge; searching "14" and "014" both find song №14; empty state matches brief copy; a member sees no admin chrome anywhere on this screen.

### Step 11: Song detail
- **Touches:** `src/app/(app)/songs/[id]/page.tsx`, `src/components/song-attachments-manager.tsx` (restyle into `DockedPlayer`)
- `TopBar` with A−/A+ (persisted per device, 16–32 range), `No. 014` + title header, `MetaGrid` (gold Key), `LyricSection`s in sung order with repeat-collapse, `DockedPlayer`, Wake Lock (feature-detected), pause-on-`visibilitychange`. Phone + desktop reading column.
- **Done-check:** A−/A+ persists across a reload; a song with a repeated chorus shows the full chorus once and a collapsed repeat row on its later occurrences; opening a different song resets scroll to top; recording pauses when the tab is hidden.

---

## Phase 2 — Admin screens

### Step 12: Add / edit song
- **Touches:** `src/components/song-form.tsx`, `src/app/(app)/admin/songs/new/page.tsx`, `src/app/(app)/admin/songs/[id]/edit/page.tsx`
- Section cards (type select, ↑↓🗑, label + textarea), chorus "Repeat this chorus" inserting a compact repeat item, ↑/↓ reordering (no drag-and-drop), DETAILS field editor with the 2×2 type-picker inline "create a new field" flow, dirty-check confirmation on close, sticky "Save song". Provisional next-number preview (Step 7). Phone + desktop.
- **Done-check:** creating a field inline and assigning it doesn't leave the form; deleting a section removes its repeat items too; save validation (title + ≥1 section with lyrics) matches brief; discarding a dirty draft prompts for confirmation.

### Step 13: Bulk import
- **Touches:** `src/components/bulk-import.tsx` (restyle only — parser in `src/lib/bulk-import/parse.ts` untouched per Q7)
- Draft cards, "guessed" chips, Save/Merge next/Discard three-column action bar, saved (✓ row) / discarded-with-undo row states, sticky "Save all N remaining" footer. Phone + desktop.
- **Done-check:** re-run the same real lyrics example used to validate the parser earlier in this project — output drafts are identical to before, only the presentation changed.

### Step 14: Slide generator
- **Touches:** `src/components/slide-generator.tsx`
- Deck fields, full-screen song picker with checkboxes, per-song accordion arrange (sung-order list + OptionChip palette to append repeats), live 16:9 preview strip matching the *real* PPTX output style (plain background, bold centered text — not themed). Phone + desktop with preview column.
- **Done-check:** generated `.pptx` is byte-for-byte the same style as `build-deck.ts` already produces (no visual regression in the actual exported file — only the in-app builder UI changed); preview strip thumbnail count matches the real generated slide count.

### Step 15: Members
- **Touches:** `src/components/members-manager.tsx`, `src/lib/actions/members.ts`
- Inline "Add member" card (PhoneInput with `+251`, role segmented control), row expand with role control + two-tap "Remove access", link-status display, self/last-admin rows show the explanatory line instead of controls (Step 8 dependency). Phone + desktop.
- **Done-check:** attempting to demote/remove the last admin or yourself shows the explanatory line and the underlying action is a no-op even if attempted directly (Step 8's guard, not just UI hiding).

### Step 16: Metadata fields
- **Touches:** `src/components/metadata-fields-list.tsx`, `src/lib/actions/metadata-field-admin.ts`
- Duplicate-name detection badge + merge flow (canonical wins on conflict, Q9a), options editor, two-tap delete showing usage count and blocking while any option is in use (Q9b). Phone + desktop.
- **Done-check:** merging two fields with a genuine value conflict on a real song keeps the canonical value; deleting an in-use option is blocked with an accurate usage count shown.

---

## Phase 3 — Verification

### Step 17: Acceptance pass
- **Touches:** none (verification only, fixes land as small follow-up commits if needed)
- Walk the full checklist in `design-reference/CLAUDE_CODE_PROMPT.md` §8. Measure real contrast ratios for every token pair in both themes and record results in `decisions.md` (brief's ratios are estimates, per §2.1). Confirm `npx tsc --noEmit`, `npm run lint`, and any existing tests are clean with no console errors. Delete the throwaway `/dev/ui-kit` page from Steps 4–5 if it wasn't already removed.
- **Done-check:** every box in §8 checked or explicitly noted as deferred (tablet split-view, per Q10) with a reason.

---

## Not in this plan (explicitly deferred per grilling)

- Tablet split-view (768–1199px) — Q10.
- Slide deck persistence/reuse — Q8.
- Ge'ez letter-variant search normalization — Q4.
- Any schema/feature not already called for above (brief §6 "out of scope").
