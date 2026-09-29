# Redesign decisions log

Filled in during the grilling phase (`design-reference/CLAUDE_CODE_PROMPT.md` §7). Format: question → answer → implication for code.

## Q1 — Song numbers

**Answer:** Option A — add a real, permanent `number` column to `songs`, assigned once at creation, stable for the song's life, never reused (gaps allowed, no shifting).

**Implication for code:**
- New migration: a dedicated Postgres sequence (`song_number_seq`) backing `songs.number integer not null unique default nextval('song_number_seq')`, so concurrent inserts (regular add-song and bulk-import) get atomic, race-free numbers without app-level coordination.
- Catalogue and admin lists sort/display by `number` instead of `title`.
- New-song form shows a provisional "next number" via a non-consuming read (`last_value + 1` from the sequence) purely as a UI hint — the real assignment happens at insert time via the sequence default, so this preview can theoretically race under concurrent creation. Acceptable for a low-traffic internal tool; noted here rather than engineered around.
- Bulk-import "Saved as No. 016" text uses the same server-assigned value returned after insert.

## Q2 — Phone country code

**Answer:** Option B — hardcode `+251` exactly as the brief specifies, no override.

**Implication for code:**
- `PhoneInput` gets a fixed, non-editable `+251` prefix cell plus a numeric field for the remaining digits.
- `check-phone/route.ts`'s validation regex (currently fully general E.164) should tighten to match `+251` + the expected Ethiopian mobile digit count, since the UI will only ever submit that shape.
- Member-facing format elsewhere (e.g. Members admin, §4.7) displays as `+251 91 234 5678`.
- **Flagged, not yet confirmed:** the production admin account (added via the hosted-infra wizard) needs to actually be a `+251` number, or this change locks that account out of login entirely. Worth a quick DB check before shipping this — `select phone_number from allowed_users where role = 'admin'` on the hosted project.

## Q3 — Recording duration

**Answer:** Option A — client-only, read from the `<audio>` element's metadata once loaded. No schema change.

## Q4 — Search sophistication scope

**Answer:** Build ranking (title/number → lyrics → field values) + match-type badges + highlighted snippets + number-aware matching ("14" finds №14 and №014) now. Skip Ge'ez letter-variant normalization (ሀ/ሃ/ሐ/ኀ, ሰ/ሠ equivalence) for this pass — plain-text matching only; revisit later if real usage shows it's needed.

**Implication for code:** this is real search-logic work in `catalogue/page.tsx` (and possibly a Postgres function/view for ranking+snippet extraction), not a pure restyle. Scope explicitly approved. No Ge'ez equivalence table gets built.

## Q5 — Editor autosave vs. save-only

**Answer:** Option A — save-only, matching every other form in the app. No autosave, no draft persistence; rely on the brief's existing dirty-confirm-on-close.

## Q6 — Last-admin / self-demotion protection layer

**Answer:** Option B — enforce in the database (trigger or RLS-level guard on `allowed_users`), not just hidden/disabled in the UI.

**Implication for code:** new migration adding a guard (likely a `BEFORE UPDATE OR DELETE` trigger on `allowed_users`) that rejects: (a) any change that would leave zero rows with `role = 'admin'`, and (b) an admin modifying/deleting their own row. UI in Members (§4.7) still shows the explanatory line instead of the controls, as a good-UX mirror of the real DB-level rule — not a substitute for it.

## Q7 — Bulk import parsing engine

**Answer:** Option A — keep the existing `🎤`-tag-based parser in `src/lib/bulk-import/parse.ts` exactly as-is (already validated against real pasted lyrics). Restyle/extend the review UI to match the brief's visual language (draft cards, "guessed" chips, Save/Merge next/Discard action bar, saved/discarded-with-undo rows). The brief's `Key:`-syntax and orphan-detection description does not get implemented — it describes a different, unvalidated parsing convention.

## Q8 — Slide deck persistence

**Answer:** Option A — stay ephemeral, exactly current behavior. No new table, no "recent decks" feature this pass.

## Q9 — Fields admin: data-integrity policies

**Answer:**
- **9a (merge conflict):** canonical field's existing value wins; duplicate's value is discarded for any song that had both.
- **9b (option deletion in use):** blocked while any song uses that option; UI surfaces the count so the admin can address it first.

**Implication for code:** `metadata-field-admin.ts` (or a new merge action) needs the conflict-resolution logic for 9a; option-delete logic in the same area needs a usage-count check (query songs whose `metadata` jsonb references that field+option) before allowing delete, per 9b.

## Q10 — Responsive scope

**Answer:** Modified option B — build phone **and** desktop-rail layouts together, screen by screen, in priority order (member-facing first, then admin). **Defer the 768–1199px tablet split-view breakpoint** to a later pass.

**Implication for plan:** each screen's PR-sized step includes both its phone and desktop layout before moving to the next screen. Tablet split-view (§4.10) is out of scope for this whole redesign pass — will need its own follow-up plan later.

**Update (post-Step 17):** the deferred tablet split-view was built as a follow-up. Added a `tablet:` (768px) breakpoint alongside the existing `desktop:` (1200px) one. `/catalogue` and `/songs/[id]` now share a `CatalogueListPane` component (380px column: header, search, list) — `/catalogue` pairs it with an empty state ("Choose a song to read"), `/songs/[id]` pairs it with the existing reading pane, with the open song's row marked `selected` (`SongRow` already had that prop, unused until now). Search navigates relative to the current pathname (`usePathname()`) so typing in the list while a song is open filters that list in place instead of leaving the song, per §4.10's "searching filters the list without closing the open song." `AdminShell` now checks the pathname to constrain `BottomNav` to the list column's width (380px) on these two routes only — everywhere else it still spans full width below the desktop breakpoint. `MetaGrid` was changed from "3 columns on phone, promoted to 4 at our desktop breakpoint since tablet didn't exist" (the original stand-in) to the brief's actual "3 on phone, 4 on tablet+" via two parallel grid/row variants toggled by `tablet:`/`hidden`, since the two breakpoints show a genuinely different field count, not just a wider grid. `DockedPlayer` gained a `spanTabletRightColumn` prop so it starts after the list column (`tablet:left-[382px]`) instead of full-bleed, reverting to normal at the desktop breakpoint (which uses the sidebar `RecordingRow` list instead). Desktop and phone layouts are both byte-for-byte unchanged — every tablet-specific class has a matching `desktop:` override that restores the pre-existing desktop behavior, verified in the browser at 900px, 1280px, and 375px against both an admin and a member session.

## Settled without asking (already decided by the brief's own text, or by the repo)

- **Theme persistence:** the brief says "in localStorage (and in the profile if one exists)" — no user-profile/preferences mechanism exists in this schema (`allowed_users` has no such column), so this is localStorage-only, per device. Not a real open question.
- **Lyric size (A−/A+) persistence:** same reasoning — localStorage per device, no profile to extend it to.
- **Resend-code countdown duration:** rather than hardcoding the brief's illustrative "0:42", the UI will read whatever `auth.sms.max_frequency` is actually configured as (currently 5s locally; will be whatever's set on the hosted project) so the displayed countdown can never drift out of sync with the real server-enforced throttle.
- **Bot username:** already known — `ChabodCatalogueBot` (set up during the hosted-infra work).

## Q11 — Reading-aid behaviors on song detail

**Answer:**
- **11a (Screen Wake Lock):** yes, feature-detected (Wake Lock API), silent no-op where unsupported.
- **11b (pause audio on tab/app hide):** yes, pause on `visibilitychange`.

## Q12 — Rollout strategy

**Answer:** Option A — straight replace on `main`, screen by screen, no feature flag.

## My call, not worth blocking on (noted for the plan, not asked)

- **Raw-hex/`rounded-*` lint guard:** add a lightweight ESLint rule (or just a grep-based CI check) blocking raw hex colors and `rounded-*` classes in redesigned component files, so the token discipline in §2 doesn't quietly erode over many small PRs. Low effort, no real downside, not worth a question.
- **Test devices/browsers:** I can drive the app through the built-in browser pane (Chromium-based) at emulated mobile/desktop widths, which covers layout, contrast, and most interaction bugs. I cannot test real iOS Safari or a genuine low-end Android device — anything specific to those (e.g. Safari's historical Wake Lock/PWA quirks) will need a real check on your end after each screen ships.

## Step 17 — Acceptance pass

Walked design-reference/CLAUDE_CODE_PROMPT.md §8 against the finished redesign (Steps 1-16). Status per box:

- **Semantic tokens only, no raw hex/`rounded-*`, gradient only on Wordmark.** ✅ Grepped `src/**/*.tsx` for hex literals and `rounded-`: the only hex hit is `layout.tsx`'s `<meta name="theme-color">` tag, which has to be a literal color for browser chrome and is kept in sync with `--bg` by `setTheme()`. No `rounded-*` anywhere. `linear-gradient`/`--mark` only appear in `globals.css` (the token) and `wordmark.tsx` (its one consumer).
- **Dark default, light complete everywhere, no flash, persists.** ✅ Verified via `THEME_INIT_SCRIPT` (pre-paint, Step 1) and spot-checked every screen (catalogue, song detail, login, song editor, bulk import, slides, members, fields) in light mode with zero console errors.
- **Contrast meets AA for body text, both themes — measured, not estimated.** ✅ Computed real WCAG ratios (relative-luminance formula) for every token pair actually used as text-on-background in the app. All 12 pairs pass AA-normal (≥4.5:1) in **both** themes — none needed the AA-large-only allowance:

  | pair | dark | light |
  |---|---|---|
  | text on bg | 13.78:1 | 13.68:1 |
  | text on surface | 11.96:1 | 12.07:1 |
  | muted on bg | 7.58:1 | 5.31:1 |
  | muted on surface | 6.58:1 | 4.68:1 |
  | accent on bg | 8.19:1 | 5.24:1 |
  | accent on surface | 7.11:1 | 4.63:1 |
  | onfill on fill | 9.11:1 | 7.99:1 |
  | label on bg | 9.33:1 | 5.16:1 |
  | label on surface | 8.10:1 | 4.55:1 |
  | danger on bg | 6.76:1 | 5.45:1 |
  | danger on surface | 5.87:1 | 4.81:1 |
  | hltext on hl (search highlight) | 7.96:1 | 7.12:1 |

  The brief's §2.1 ratios were estimates; these are the real measured numbers, superseding them.
- **44px tap targets, bottom-pinned primary on mobile, safe-area insets.** ✅ with two explicit, brief-mandated exceptions: the A−/A+ control is "44×40" per §4.3 (44 wide, 40 tall — not a general button), and Chip/OptionChip is "40px, min-width 44" per §3's component spec. Found and fixed **six real violations** during this pass — buttons built at `h-10` (40px tall, no width exception) instead of `h-11` (44px): the song-form discard-confirm button, the desktop-only song-detail Edit button, the desktop rail's sign-out button, the members "Give access" button, and both the metadata-fields "Merge into…" and "Rename" buttons. All bumped to `h-11`. Safe-area insets (`env(safe-area-inset-bottom)`) confirmed present on every fixed-bottom element: BottomNav, DockedPlayer, StickyFooterAction.
- **Mixed Ge'ez/Latin correct faces, 1.75 lyrics line-height, no letter-spacing/uppercase on Ge'ez.** ✅ with **one real bug found and fixed**: the "አዝ" chorus marker in Slides' sung-order list and Bulk Import's section-summary rows was styled with `type-badge`, which applies `text-transform: uppercase; letter-spacing: 0.08em` — both forbidden on Ge'ez script. Replaced with a plain `text-[13px] font-bold` class (no transform/spacing), matching how `LyricSection` itself already renders the same marker correctly. Admin-entered free text (section `label`, metadata field names, search match badges) can theoretically contain Ge'ez and still gets `type-section-label`/`type-badge` treatment — this is the same "enforced by usage, not CSS" tradeoff globals.css already documents from Step 2, not something introduced or newly reviewed in this step.
- **Members: no bottom nav, theme/sign-out in header, admin routes unreachable.** ✅ (Step 10; route guard re-checked here: `middleware.ts` blocks any `/admin/*` path for non-admins via a single `pathname.startsWith("/admin")` check, so it already covers every admin route added in Phase 2 without needing per-route updates.)
- **Admins <1200: 3-cell bottom nav, More sheet (focus trap, Esc, scrim, 240ms, reduced-motion).** ✅ (Step 6; reduced-motion re-confirmed here via `motion-safe:` prefixes on both the scrim and sheet transitions.)
- **Search: title/lyrics/fields/number, badges, highlighted snippets, empty state.** ✅ (Step 10)
- **Song detail: No. header, MetaGrid gold Key, verse numbers, አዝ chorus band, collapsed repeats, persisted A−/A+, docked player.** ✅ (Step 11)
- **Editor: sections add/retype/label/reorder/delete, chorus repeat, all 4 field types, inline field creation without leaving the form.** ✅ (Step 12)
- **Import: split, edit title, guessed meta, merge next, save, discard+undo, save all.** ✅ (Step 13 — "merge next" per the brief's actual button name/direction, not "merge into previous" as an earlier draft of this checklist item might suggest)
- **Slides: multi-pick, per-song sung order with repeats, live 16:9 preview, real PPTX format.** ✅ (Step 14; `build-deck.ts` itself untouched, so PPTX output is byte-identical in style to before)
- **Members: add, change role, two-tap remove, self/last-admin protection.** ✅ (Step 15, DB guard from Step 8)
- **Fields: rename everywhere, option edits, duplicate merge, two-tap delete with usage count.** ✅ (Step 16 — see that step's commit for the note that true duplicates are structurally unreachable through the app's own write paths, since `metadata_field_definitions` already has a case-insensitive unique index predating this redesign; verified the merge logic anyway by temporarily dropping that index in local dev only)
- **Tablet split view and desktop rail (if in scope).** Desktop rail: ✅ (Step 6 and per-screen since). Tablet split-view (768–1199px): ✅ **built as a follow-up immediately after this acceptance pass** (see Q10's "Update" note above) — the catalogue/song-detail split view, selected-row state, search-without-closing, and the width-constrained BottomNav are all in place and verified in the browser.
- **Typecheck, lint, tests pass, no console errors.** ✅ `npx tsc --noEmit` clean. `npm run lint` clean for all app code (the only remaining lint output is pre-existing warnings/errors in `design-reference/`'s third-party reference bundle, unrelated to and untouched by this redesign). No test runner is configured in this project (`package.json` has no `test` script), so there are no automated tests to run. Deleted the throwaway `/dev/ui-kit` page.

