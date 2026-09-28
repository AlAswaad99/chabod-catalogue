# Claude Code prompt — Chabod Choir Catalogue UI redesign

> Paste everything below the line into Claude Code, from the repo root. If you can, copy `Chabod Prototype.dc.html`, `Chabod Design System.dc.html` and `Chabod Wide Layouts.dc.html` into `/design-reference/` in the repo first. They are the visual source of truth. Open them in a browser; they are self-contained apart from `support.js` and the `_ds/` folder, so copy those too.

---

## 0. Your role and how to work

You are implementing a **visual and UX redesign** of an existing, working app: the Chabod Choir song catalogue (Next.js + Tailwind + Supabase). The product's behaviour, data model and API routes already exist. This is a **re-skin plus a navigation restructure plus some UX refinements** of existing screens. Do not rewrite business logic, change the database schema or swap libraries unless a step below says so or I approve it during the grilling phase.

**Work in this order. Do not skip ahead.**

1. **Explore (read-only).** Map the repo: the routes and pages for each screen in §4, the layout and nav components, the Tailwind config, global CSS, the font loading, the Supabase queries for search/songs/sections/fields/recordings/members, the auth flow (phone → Telegram bot OTP), and the PPTX generation. Write a short inventory to `docs/redesign/inventory.md`: screen → files, and for each shared component where it's used.
2. **Grill me (§7).** Interview me before writing any UI code. Then write the agreed decisions to `docs/redesign/decisions.md`.
3. **Plan.** Write `docs/redesign/plan.md`: an ordered list of small PR-sized steps, each with the files touched and a done-check. Wait for my OK.
4. **Implement step by step.** After each step run the typecheck, lint and existing tests, and tell me what to look at in the browser. Commit per step with clear messages.
5. **Verify** against the acceptance checklist (§8).

---

## 1. Design intent (read this, it drives every judgement call)

- Chabod's brand material (event posters) uses a **deep teal ground, a gold→orange painted gradient on display lettering, a bright cyan callout, black badges and cream text**.
- Direction: **adopt the palette, calm the treatment.** The teal, gold and cyan become real UI colors. The painterly gradient appears **only on the ካቦድ wordmark** (login and app header). Never use it on buttons, cards, text or chrome.
- The structure follows a **"Modernist" system**: **0px corner radius everywhere**, **2px rules between major sections, 1px rules between rows**, a **visible grid** (for example, metadata cells separated by 1px gaps), **flush-left labels, including inside buttons** (label on the left, icon on the right), **Lucide line icons**, no drop shadows on content, no gradients in UI and no rounded pills.
- **Dark is the default.** Light mode is fully supported, not an afterthought.
- Users are choir members reading lyrics **mid-rehearsal or in a dim sanctuary, one-handed, on a phone**. Legibility and speed beat decoration. Lyrics dominate and chrome recedes.
- Motion: **subtle only.** The sheet slides in over 240ms `cubic-bezier(.2,.8,.2,1)` and the scrim fades over 200ms. Nothing else animates. Respect `prefers-reduced-motion` (no transitions at all).

---

## 2. Design tokens

Implement as **CSS custom properties** on `:root` (dark) and `[data-theme="light"]`. Expose them through Tailwind (`theme.extend.colors` → `var(--…)`) so components use semantic classes like `bg-ground`, `text-muted` and `border-rule`. **No raw hex values in components.**

### 2.1 Color roles

| Token | Role | Dark (default) | Light |
|---|---|---|---|
| `--bg` | Page ground | `#0D2124` | `#F4F1EA` |
| `--surface` | Search field, sheets, player, chorus band, expanded rows | `#152D31` | `#E9E3D6` |
| `--text` | Primary ink (cream / deep teal) | `#EFE9DC` | `#10282B` |
| `--muted` | Meta, labels, secondary text, inactive icons | `#9FB3B1` | `#52676A` |
| `--rule` | 1px row dividers, 2px section dividers | `#2F4649` | `#D3CBBB` |
| `--rule2` | Secondary button and segmented control borders (stronger) | `#4A6064` | `#B4AB98` |
| `--fill` | **Gold fill**: primary button, Add song cell, play button, active input border, active tab indicator | `#E2AD4F` | `#D9A03F` |
| `--onfill` | Text and icons on gold fill | `#1A1206` | `#1A1206` |
| `--accent` | **Gold as text or icon**: Key value, verse numbers, active tab label, text buttons, tool icons | `#E2AD4F` | `#8A5A0E` (deep ochre: gold text fails contrast on cream) |
| `--label` | **Cyan**: chorus marker "አዝ", search match-type badges, Telegram-linked status, informational callouts | `#7CCFD6` | `#1F6F79` |
| `--hl` | Search-hit highlight background | `#3A3219` | `#F1D99A` |
| `--hltext` | Search-hit highlight text | `#F3C75A` | `#5E3C05` |
| `--band` | Chorus band background (= surface) | `#152D31` | `#E9E3D6` |
| `--scrim` | Behind the More sheet | `rgba(3,11,12,.72)` | `rgba(16,40,43,.45)` |
| `--danger` | Destructive actions (poster orange-red) | `#EF8A6C` | `#A8401C` |
| `--mark` | **Wordmark gradient only** | `linear-gradient(180deg,#F3C75A 0%,#EA8A34 60%,#D9542A 100%)` | `linear-gradient(180deg,#D99A2B 0%,#C8662A 60%,#A8401C 100%)` |

Rules:
- Gold is a **fill** in both modes, always with `--onfill` text. For gold **text or icons**, always use `--accent`, never `--fill`.
- Body text contrast must be at least 4.5:1 and large UI chrome at least 3:1. **Re-measure every pair** with a contrast tool and record the results in `decisions.md`. The design's ratios are estimates.
- Focus ring on all interactive elements: `outline: 2px solid var(--fill); outline-offset: 2px` via `:focus-visible`. Never the browser's blue ring.
- Disabled: 45% opacity, `cursor: not-allowed`.
- Hover (pointer devices only): outlined elements change border to `--fill`. Filled gold gets slightly darker, e.g. `color-mix(in srgb, var(--fill) 88%, black)`.
- Theme choice persists in `localStorage` (and in the profile if one exists). Default is dark. Set `data-theme` on `<html>` before first paint so there is no flash; use a small inline script in the root layout. Also set `<meta name="theme-color">` per theme.

### 2.2 Typography

- **Latin UI:** Archivo (Google Fonts, weights 400/500/600/800) via `next/font/google`.
- **Ge'ez / Amharic:** Noto Sans Ethiopic (400/500/700/800) via `next/font/google`.
- **Mono:** JetBrains Mono (400/500), used only for song numbers (`014`), timestamps, step counters and slide captions.
- **Font stack everywhere:** `Archivo, "Noto Sans Ethiopic", system-ui, sans-serif`. Archivo has no Ethiopic glyphs, so Ge'ez falls through to Noto, and mixed-script lines render with the correct face per script. **The lyrics body reverses the order:** `"Noto Sans Ethiopic", Archivo, sans-serif`.
- Ge'ez rules: about 20% more line-height than Latin at the same size. **Never** letter-spacing, uppercase or italics on Ge'ez. Ge'ez titles max weight 700; weight 800 is only for the wordmark.

| Style | Size / weight / line-height | Use |
|---|---|---|
| Wordmark | 76 / 800 / 1.05 (login), 26 (header), 40 (desktop rail) | "ካቦድ" with `--mark` gradient via `background-clip:text` |
| Screen heading | 26 / 800 / 1.2, tracking −0.01em | "Enter the code", "Link your phone…" |
| Top-bar title | 18 / 800 | "Edit song", "Slides", "Members" |
| Song title (detail) | 34 / 700 / 1.25 (tablet 38, desktop 44) | |
| List title | 19 / 700 / 1.35 (Latin titles 18 / 600) | Catalogue rows |
| **Lyrics** | **20 / 400 / 1.75 default; user-adjustable 16–32 in steps of 2** (tablet default 22, desktop 24) | Song detail |
| Action | 16 / 800 | Primary button labels |
| Body | 15 / 400 / 1.5 | |
| Meta | 13 / 400, `--muted` | "D♭ · 6/8 · Praise" |
| Section label | 12 / 600, uppercase, tracking 0.12em, `--muted` (Latin only) | "LYRICS", "DETAILS", "ADMIN TOOLS" |
| Badge | 11 / 600–700, uppercase, tracking 0.08em | "TITLE", "LYRICS", "ADMIN", "DUPLICATE?" |
| Field label | 11–12 / 400, `--muted` | "Key", "Time" in grids |
| Mono | 12 / 400 | `No. 014`, `1:42 / 4:32`, `01` verse markers |

### 2.3 Spacing, sizing and edges

- Spacing scale: 4, 8, 12, 16, 20, 24, 32 px. Screen side margin: **16px** for lists and forms, **20px** for reading (song detail), **24px** for login.
- **Tap targets: minimum 44×44** for every icon button, A−/A+, clear, move up/down and remove.
- Heights: search bar **52**, primary/secondary buttons and text inputs **56** (compact inputs 44–48), bottom nav **72**, docked player **72**, top bar **60**, list rows at least **64**.
- Radius: **0 everywhere**. Remove every `rounded-*` from redesigned components.
- Borders: sections use `2px solid var(--rule)`, rows `1px solid var(--rule)`, the focused or active input `2px solid var(--fill)`, secondary buttons `2px solid var(--rule2)`.
- Grids of cells (metadata grid, admin tools grid, type picker): the container gets `gap:1px; background:var(--rule)` and each cell gets `background:var(--bg)` or `var(--surface)`. This draws the 1px grid lines without doubled borders.
- Safe areas: pad the bottom bar, docked player and sticky footers with `env(safe-area-inset-bottom)`.
- Hide scrollbars inside the mobile app shell, but keep content scrollable.

### 2.4 Icons

Lucide (`lucide-react`), `strokeWidth={2}` (2.4 for plus/check on gold), 20–24px. Icons used: `Search, X, ArrowLeft, ArrowRight, Plus, Music, Ellipsis, Play, Pause, Upload, Presentation, Users, Tag, Moon, LogOut, Send, Pencil, ChevronUp, ChevronDown, ChevronRight, Trash2, Repeat, Check, Download, Circle`.

---

## 3. Core components (build these first, in `components/ui/`)

Build each as a small typed React component on the tokens. Every one needs a dark and a light state, plus hover, focus and disabled where relevant.

1. **Wordmark**: "ካቦድ" in Noto Sans Ethiopic 800 with the `--mark` gradient text. Size prop. This is the *only* gradient in the app.
2. **Button**
   - `primary`: 56px tall, `--fill` background, `--onfill` 16/800 label **flush left**, optional trailing icon **flush right** (`justify-between`), full-width by default.
   - `secondary`: same size, transparent, `2px --rule2` border, 15/600.
   - `text`: `--accent`, 14/600, no box, still has a 44px hit area.
   - `danger` (outlined `--danger` border and text) and `danger-confirm` (filled `--danger`, `--bg` text). Used for two-tap confirmation, see §5.
   - `icon`: 44×44, centered icon.
3. **TextInput / TextArea / Select**: `--surface` background (`--bg` when inside a surface card), `1px --rule2` border that becomes `--fill` on focus, 0 radius, placeholder in `--muted`. A label above in 12px `--muted`.
4. **PhoneInput**: 2-column grid, a fixed `+251` prefix cell (`--muted`, right border) and a tel input (`inputMode="numeric"`, 19/500, letter-spacing 0.04em). 2px `--fill` border when active.
5. **OtpInput**: 6 equal cells in a `2px --rule2` bordered grid with 1px dividers, 60px tall, digits 26/800. The **active cell shows a gold caret and a 3px gold bottom inset**. It is backed by one invisible real `<input inputMode="numeric" autoComplete="one-time-code" maxLength=6>` laid over the grid. Auto-submits at 6 digits.
6. **SearchBar**: 52px, `2px --fill` border, `--surface` background, gold search icon, 17px input, and a clear (X) icon button when there's a value. On desktop, show a `/` keyboard hint chip and bind `/` to focus the field.
7. **SegmentedControl**: `1px --rule2` outer border, options separated by 1px, selected = `--fill` background with `--onfill` 600 text, 40–44px tall. Used for Dark/Light, Member/Admin and the field type picker (2×2 grid variant).
8. **Chip / OptionChip**: 40px, min-width 44, `1px --rule2`. Selected = `--fill`/`--onfill` 700. Used for single- and multi-select field values and for the section palette in Slides.
9. **Badge**: `match` (cyan `--label` text, no box: TITLE / LYRICS / FIELD / NO.), `role-admin` (gold fill), `role-member` (1px `--rule2` outline, `--muted`), `warn` (1px `--label` outline, `--label` text: DUPLICATE?).
10. **SongRow** (list item): grid `52px | 1fr`. A mono song number (`014`, zero-padded to 3, `--muted`) on the left. On the right: title (19/700) with the matched substring in `--accent`, an optional match badge on the far right, an optional lyric snippet (`…pre <mark>hit</mark> post…`, 14px, with `--hl`/`--hltext` on the hit), then a meta line (first 3 field values joined by " · "). 1px bottom rule. The whole row is a button. When selected in split view: `--surface` background, a 3px gold inset on the left, and the number in `--accent`.
11. **MetaGrid**: 3 columns on phone, 4 on tablet, over the 1px grid. Each cell shows the label (11px `--muted`) and the value (17/700). **The Key value is always 20/800 in `--accent`.** Fields beyond the grid render as full-width `96px | 1fr` rows (label / value) with 1px rules.
12. **LyricSection**: grid `40px | 1fr`.
    - **Verse**: marker is a mono 2-digit counter (`01`, `02`…) in `--accent`.
    - **Chorus**: marker "አዝ" (Noto 700, 13px, `--label`). The whole block sits on a full-bleed `--band` background (negative side margins, 14px vertical padding).
    - **Bridge/Intro/Outro/Other**: short tag (`BR`, `IN`, `OUT`, `•`) in `--accent`.
    - **Optional section label**: if set, 12/600 uppercase `--muted`, above the lines.
    - **Indented response lines**: a blank line inside a section's text starts an indented group (`padding-left:20px`, margin-top 6).
    - **Repeat row**: when a section that has already appeared shows up again in the song's order, render a **single 48px row**, not the full text again. The marker is "አዝ" in `--label`, followed by "Chorus · repeat · {first line}…" in `--muted`/`--text`, with 1px rules above and below, ellipsized.
13. **DockedPlayer**: 72px, `--surface`, **2px `--fill` top border**, grid `64px | 1fr`. A gold square play/pause button on the left. On the right: recording title (13/600, ellipsis), an "N of M ›" button (mono 12, cycles to the next recording), and a 3px progress track (`--rule`) with a `--fill` progress bar that is click/tap-to-seek, plus `m:ss / m:ss` mono 11. Uses a real `<audio>` element. Pause when leaving the song. Hidden if the song has no recordings.
14. **BottomNav (admin, mobile and tablet only)**: 72px, `2px --rule` top border, three equal cells, **labels and icons flush left** (padding-left 18). Cells:
    - **Catalogue**: when active, `--accent` color and a 3px `--fill` inset top bar.
    - **Add song**: **always gold fill**, 800 label. This is the one prominent action.
    - **More**: `--muted` normally. While the sheet is open it takes the active treatment, and Catalogue goes muted.
15. **MoreSheet**: slides up from above the bottom nav (sits at `bottom:72px`, above the scrim; the nav stays on top). `--surface`, **2px `--fill` top border**. Header "ADMIN TOOLS" and a close X. A **2×2 grid** over the 1px gaps: Slides ("Build a service deck"), Import ("Paste lyrics in bulk"), Members ("Phone access · roles"), Fields ("Metadata cleanup"). Each cell shows a 24px gold icon, a 16/800 name and a 12px muted subline. Then an Appearance row with a Dark/Light segmented control, then a Sign out row. Closes on: scrim tap, the X, tapping Catalogue, Esc, and navigating. Focus is trapped while open and returns to the More button on close. `role="dialog" aria-modal`.
16. **Toast**: sits above the bottom nav (bottom 88px), inverse colors (`--text` background, `--bg` text), 14/600, auto-dismisses after about 2.2s, `role="status"`.
17. **TopBar**: 60px, back or close icon button, 18/800 title, a right slot (mono counter or a text action), and a 2px bottom rule.
18. **StickyFooterAction**: the bottom-pinned primary button area on form screens: 12px 16px padding, 2px top rule, `--bg`.

---

## 4. Screens and features

The data model below describes what the prototype assumes. **Map it to the real schema during exploration and flag any mismatch in the grilling phase.** Song: `number`, `title`, ordered **metadata fields** (admin-defined: name + type ∈ {text, number, single-select, multi-select} + options), **sections** (type ∈ verse/chorus/bridge/intro/outro/other, optional label, lines, optional indented response lines), an **order** (a sequence of section references in which a section may repeat), and **recordings** (title, audio URL, duration).

### 4.1 Login (members and admins)
- **Step 1, phone:** large gradient wordmark, the uppercase subline "Chabod Choir · Song catalogue", a 2px rule, the PhoneInput, helper text "We'll send a one-time code through **@ChabodBot** on Telegram." and a bottom-pinned primary "Send code →".
- **Step 1b, first-time link (only if the number isn't linked to the bot yet):** back button and small wordmark. A cyan uppercase kicker "One-time setup". Heading "Link your phone to our Telegram bot". Helper text "Login codes come through Telegram, not SMS. You only do this once." A numbered list of 3 steps (gold numbers, 1px rules): open @ChabodBot and tap Start → tap Share phone number → come back and continue. At the bottom: primary "Open @ChabodBot" (Send icon; opens `https://t.me/<bot>`) and secondary "I've linked it, continue". Continue re-checks the link status. If still unlinked, show an inline message rather than a toast.
- **Step 2, code:** mono "Last step", heading "Enter the code", helper text naming the phone number, the OtpInput (autofocused, auto-submits), "Resend in 0:42" (a real countdown that becomes a text button when it reaches 0) and a "Change number" text button. Show wrong or expired code errors inline under the cells in `--danger`.

### 4.2 Catalogue / search (home, most-used)
- **Header:** small wordmark on the left, song count on the right. **Members only:** theme toggle (Moon) and Sign out icon buttons in the header, because members have no bottom bar or More sheet.
- **SearchBar** at the top, sticky.
- Below it, a status line (12px muted, 2px bottom rule): "All songs · by number" when empty, otherwise "N matches in titles, lyrics and fields".
- **One query matches titles, full lyrics text and metadata values at once, plus the song number** ("14" or "014"). Result ranking: title and number matches first, then lyrics, then field values. Each result shows its match badge. Lyric matches show a snippet from the matching line with the hit highlighted (up to 16 characters before it). Field matches rewrite the meta line to include `FieldName: value`. Matching should be case-insensitive and Ge'ez-aware (plain substring is fine to start; confirm in grilling). Debounce about 150ms.
- **Empty result:** "Nothing matches “{q}”" (17/800) with the hint "Try one word from a line, a key like “D♭”, or a song number."
- Default list sorted by song number. Rows open the song detail.
- **Admin:** BottomNav + MoreSheet (see §3).

### 4.3 Song detail (reading)
- **Top bar (no bottom border):** back button. On the right, A− / A+ as one bordered pair of 44×40 cells, plus Edit (pencil, admin only).
- Header block (2px bottom rule): mono `No. 014`, then the title (34/700).
- **MetaGrid** (first 3 fields, Key highlighted), then the remaining fields as rows.
- **Lyrics:** sections in their sung order using LyricSection, including collapsed repeat rows. Padding 22px 20px 32px, gap 20px, lyrics font size from the A−/A+ control. **Persist the lyric size per device** (localStorage).
- **DockedPlayer** pinned at the bottom if there are recordings.
- The screen wakes lock while reading if the browser supports it (confirm in grilling). Opening a different song resets scroll to the top.

### 4.4 Add / edit song (admin)
- Entry points: Add song (nav) creates a blank draft with Key/Time/Genre prefilled as empty fields. Edit (pencil) loads the song. TopBar with close X (discard, ask for confirmation if dirty), title "New song" / "Edit song", and mono `No. 015` on the right (next number for new songs).
- **Title** input (56px, 21/700).
- **LYRICS** section header with a "N parts" count. Each **section card**: `--surface` background, 2px `--rule2` top border, a header row with position mono `01` in `--accent`, a **type select** (Verse/Chorus/Bridge/Intro/Outro/Other), and ↑ ↓ 🗑 icon buttons (trash in `--danger`). Under the header: an optional **Label** input and a **textarea** (Noto 17/1.7, auto-grows, placeholder "One lyric line per row. A blank line starts an indented response."). Chorus cards get a "Repeat this chorus" text button that inserts a **repeat item** right after.
- **Repeat items** are compact 56px outlined rows ("Repeat · Chorus · first line…" with ↑ ↓ ✕). Deleting a section also deletes its repeats.
- "Add section" secondary button (plus icon).
- **Reordering uses ↑/↓ buttons**, a deliberate one-handed choice. Drag-and-drop may be added on desktop only as an enhancement.
- **DETAILS** section: each assigned field shows a name, a "· Type" hint and a remove ✕. The value control depends on type: **single/multi-select as OptionChips** (single: tap again to clear; multi: toggle), **text as an input**, **number as a numeric input (140px)**.
- **Add field** button opens an inline panel (2px `--fill` border): a list of existing fields not yet on the song (name · type, tap to add), then "Create a new field". The create form: name input, a **type picker as a 2×2 segmented grid** (Text / Number / Single-select / Multi-select), and for select types an **option list editor** (option chips with ✕, an "New option" input, Enter or the Add button adds). Validation: name required and unique (case-insensitive); select types need at least 1 option. "Add field to song" creates the field **globally** and assigns it to this song **without leaving the form**. Cancel returns to the song.
- Sticky primary "Save song ✓". Validation: title required and at least one section with lyrics. On save, go to the song detail and toast "Song saved" / "Song added".

### 4.5 Bulk import (admin)
- **Paste step:** TopBar "Import lyrics". Helper text: title on the first line, **two blank lines between songs**, numbered lines (`1.`) start verses, `አዝ` starts a chorus. A large full-height textarea (Noto 16/1.7). Sticky primary "Split into songs →".
- **Split heuristics** (match or improve on the existing implementation; the design assumes these): chunks separated by 2 or more blank lines. The first line is the title unless it starts with a verse or chorus marker. `Key: G · 6/8` lines become guessed Key/Time metadata. `N.`/`N)` starts a verse. `አዝ`/`chorus` starts a chorus.
- **Review step:** TopBar with an "Edit paste" text action (goes back and keeps the text). A summary line "N drafts found · 1 needs a look". **Draft cards** (`--surface`, 2px `--rule2` top):
  - mono "Draft 2" and an editable title input
  - guessed metadata as outlined chips ("Key **G**") followed by a muted "guessed"
  - section summary rows (marker, first line ellipsized, "N lines")
  - an action bar, 3 columns: **Save** (gold fill), **Merge next** (appends the next pending draft's sections and metadata into this one), **Discard** (`--danger`).
- **Orphan detection:** a draft with no title that follows another pending draft shows a cyan-outlined callout "No title line found. This looks like the rest of Draft N." with a "Merge into Draft N" button.
- **Saved drafts** collapse to a row (cyan ✓, title, "Saved as No. 016"). **Discarded drafts** collapse to a row with **Undo**.
- Sticky footer: "Save all N remaining" (primary). When none remain it becomes "Done · back to catalogue" (secondary).

### 4.6 Slide generator (admin)
- TopBar "Slides" with a mono "N slides" counter.
- **Deck fields:** Deck title, Date (native date input), Closing slide text (a 2-column row for date and closing).
- **SONGS · N** header with an "+ Add songs" text button, which opens a **full-screen picker**: close X, a SearchBar (title or number), rows with number, a square checkbox (gold fill with check when selected, 2px `--rule2` when not), title and meta, and "Already in deck" in `--label` if present. Sticky primary "Add N songs" (disabled label "Select songs to add"). Added songs get their default sung order = the song's own order.
- **Song rows in the deck:** position mono, title, and a meta line "5 slides · 01 አዝ 02 አዝ". ↑ ↓ ✕ to reorder or remove songs. **Tap to expand** (accordion, one open at a time) into a `--surface` panel:
  - "Sung order" with "Reset to song order"
  - an ordered list of section instances (marker, first line, ↑ ↓ ✕)
  - "Tap to add to the end" plus a **palette of OptionChips**, one per distinct section ("01 Verse 1", "አዝ Chorus"). Tapping appends, so repeats are allowed.
- **PREVIEW:** a horizontal strip of 16:9 thumbnails that update live: Title slide (deck title + formatted date), then for each song a **divider slide** (title + short white rule) and one **lyric slide per section instance** (up to 4 lines), then a **Closing slide**. Each has a mono caption "04 · 01". The thumbnails show **the real output style: plain black background, bold white centered text.** They are *not* themed, because they represent the PPTX.
- Sticky primary "Generate PowerPoint · N slides" with a download icon. It calls the existing PPTX generation with the new structure (deck title, date, closing, and per song an ordered list of section instances) and downloads `Sunday-Service-2026-10-04.pptx`. The generated deck must keep matching the choir's existing lyric-slide format.

### 4.7 Members (admin)
- TopBar "Members". A primary "Add member" button expands into an inline card (2px `--fill`): PhoneInput, a Member/Admin segmented control, a note "They'll link Telegram the first time they sign in.", and "Give access" / "Cancel". Validation: a 9-digit Ethiopian number, not already present. Format as `+251 91 234 5678`.
- Summary line "8 numbers · 2 admins · 2 not linked".
- **Member rows** (at least 68px): the phone number (16/600, " · You" for the current user), link status ("✓ Telegram linked" in `--label`, "○ Not linked yet" in `--muted`), and a role badge on the right. **Tap to expand:** a Role segmented control and "Remove access" with **two-tap confirm** (the first tap turns the button into a filled danger "Tap again to remove +251…"). **The current user cannot change their own role or remove themselves.** Show an explanatory line instead. Also block removing or demoting the **last** admin (server-side too).

### 4.8 Metadata fields (admin)
- TopBar "Fields" and an intro paragraph: new fields are usually created while editing a song; this page is for renaming, tidying options, merging duplicates and deleting unused fields.
- **Field rows:** name (16/700) and meta "Single-select · 12 options · 4 songs" (or "unused"). **Duplicate detection:** a field whose name matches another case-insensitively gets a "DUPLICATE?" warn badge.
- **Expanded:**
  - **Duplicate callout** (cyan) "Looks like a duplicate of **Chant type**…" with "Merge into Chant type". Merging moves values to the canonical field, drops conflicting values where the song already has the canonical field (confirm the policy in grilling), and deletes the duplicate.
  - **Name** input with a "Rename" button shown only when changed. Renaming applies everywhere.
  - For select types, an **Options** editor (chips ✕ + add).
  - "Delete field" with two-tap confirm: "Tap again · removes it from N songs".

### 4.9 Navigation model (the core fix)
- **Members:** no bottom bar at all. The catalogue is their only area. The song detail has a back button. Theme and sign-out live in the catalogue header.
- **Admins, below 1200px:** a 3-cell BottomNav (**Catalogue · Add song · More**) on the Catalogue screen. **More → MoreSheet** holds Slides, Import, Members, Fields, Appearance and Sign out. Tool screens and the editor are full-screen with a TopBar back/close and **no bottom nav**.
- **All widths:** routes should be real URLs (`/`, `/songs/[number]`, `/songs/new`, `/songs/[number]/edit`, `/admin/import`, `/admin/slides`, `/admin/members`, `/admin/fields`, `/login`), adapted to existing routes. Hide admin items from members **and guard the routes server-side**.

### 4.10 Responsive
- **Below 768:** phone layouts as above.
- **768–1199 (tablet):** a **split view**. A 380px left column holds the catalogue (header, search, list), with a 2px right rule. The right side shows the open song (top bar, header, 4-column MetaGrid, lyrics default 22px max-width ~560px, docked player spanning the right column). The admin BottomNav spans under the left column only. The selected row shows the selected state. Searching filters the list without closing the open song. With no song selected, show an empty state that prompts the user to choose a song.
- **1200 and up (desktop):**
  - **Left rail** (232px, 2px right rule). The large gradient wordmark with the "Chabod Choir" subline, a primary "Add song" button, the Catalogue nav item (active: `--surface` background, 3px gold left inset, `--accent`), the "ADMIN TOOLS" label, then Slides, Import, Members and Fields (gold icons, 44px rows). At the bottom, the Dark/Light segmented control, then the phone number and Sign out. **The rail replaces both the BottomNav and the MoreSheet.**
  - **400px list column**, including the `/` shortcut.
  - **Reading column:** lyrics default 24px, max-width ~600px, 56px side padding, and an "Edit" outlined button in the top bar.
  - **300px right column:** DETAILS as label/value rows and RECORDINGS as a list, each with a 44px play/pause square and progress. On desktop this replaces the docked player.
  - Admin form screens stay single-column, max-width 720px, centered in the content area. Slides adds a live preview column beside the form.
  - Members use the same layout without the ADMIN TOOLS group.

---

## 5. Interaction and behaviour rules

- **Destructive actions use two-tap confirmation inline** (the button turns filled `--danger` with a specific consequence label). Use this rather than modal dialogs, except for discarding a dirty editor, which uses a confirm dialog.
- **Toasts** are for confirmations only ("Song saved", "Access removed", "Merged into Chant type", "Renamed in 4 songs"). Validation errors should be inline next to the field where possible. The prototype uses toasts for some validation messages; replace those with inline errors.
- Primary actions are **bottom-pinned** on mobile (thumb reach).
- All rows and cells are real `<button>` or `<a>` elements with visible focus. The sheet and pickers support Esc to close.
- Loading: use skeleton rows styled as the real rows (surface blocks, no shimmer, or reduced-motion safe). Keep optimistic UI on role, option and field edits.
- Audio: one active recording at a time. Stop playback on route change and on sign-out. Pause on `visibilitychange` (confirm in grilling).

---

## 6. Out of scope unless I say otherwise
- Schema changes beyond what is strictly required. Propose them in grilling first.
- Changing the auth provider or the OTP mechanism.
- New features not listed here: filters, favourites, setlists outside Slides, offline mode, sharing.
- Changing the PPTX visual format.

---

## 7. GRILLING PHASE: do this before writing any UI code

Interview me relentlessly until every ambiguity that would change the implementation is resolved. Rules:

- **Ask one question at a time.** Wait for my answer. Where you can, give 2–4 concrete options plus your recommendation and why. Base every question on something you actually found in the repo (cite the file) or a real gap in this brief. Don't ask things this brief already answers.
- Keep a running **Decisions log** in `docs/redesign/decisions.md` (question → answer → implication for code). Update it after every answer.
- If an answer conflicts with this brief, point out the conflict and ask which wins.
- Stop when you can write a plan with **no "TBD"s**. Then summarise the decisions and ask for a final OK.

**You must cover at least these topics (skip any the repo already settles, and say how it settles them):**

1. **Existing structure:** which current routes and components map to each screen in §4? Should any be replaced wholesale rather than restyled? Is there an existing component library or shadcn setup to adapt or remove?
2. **Tailwind strategy:** extend the config with semantic tokens and remove default palette usage, or keep defaults available? Tailwind version (v3 config vs v4 `@theme`)? Should a lint rule block raw hex and `rounded-*` in redesigned components?
3. **Data model gaps:**
   - Do songs have a `number` column? If not, add one, derive it, or drop numbers?
   - How are the section **order and repeats** stored today? Does "indented response lines" exist? Does "section label" exist?
   - Are metadata field types (text / number / single / multi) and options already modelled?
   - Is there a recording duration?
4. **Search:** is search client-side or in Postgres (ILIKE, full-text, trigram)? Does it cover lyrics and field values and return match type and snippet? Should highlighting happen server-side? How should Ge'ez normalisation be handled (for example ሀ/ሃ/ሐ/ኀ and ሰ/ሠ variants)? Should the number match "14" and "014"?
5. **Auth flow:** how is "linked to the Telegram bot" detected? How does "I've linked it, continue" check it (polling vs. on click)? What are the resend cooldown and code expiry? What is the bot username? What does an admin see for a member who never linked?
6. **Roles and guards:** where is the role checked today? Confirm server-side protection for the admin routes, and the rules for last-admin and self-demotion.
7. **Editor semantics:** when a section is deleted, should repeats be deleted with it? Should field removal from a song be allowed for "required" fields? Is autosave or draft persistence wanted, or save-only? Where does the next song number come from?
8. **Import heuristics:** how does the existing splitter work? Keep it, improve it, or adopt the rules in §4.5? Can merge also merge into the *previous* draft? Does Save all create songs in one transaction?
9. **Slides:** what does the current PPTX generator accept? Does it need changes for per-song section order with repeats, divider slides and closing text? Should the deck be saved or reused (for example, "last Sunday's deck"), or is it ephemeral?
10. **Fields admin:** what is the merge-conflict policy when a song already has the canonical field? When an option is deleted, what happens to songs using it (block, clear, or reassign)?
11. **Theme:** is the preference stored per device or per user profile? Should the app follow `prefers-color-scheme` on first visit, or always start dark?
12. **Reading aids:** Wake Lock on song detail, yes or no? Should lyric size be per device or per user? Should audio pause on tab hide?
13. **Responsive:** are tablet split view and desktop rail both in scope for this pass, or phone first with the wider layouts in a follow-up PR?
14. **Accessibility and QA:** target WCAG AA? Which real devices or browsers to test (low-end Android Chrome, iOS Safari)? Are there existing tests to keep green, and should any be added (for example, visual snapshots of the core components)?
15. **Rollout:** a feature flag or a straight replace? One PR per screen or one branch?

---

## 8. Acceptance checklist

- [ ] All redesigned UI uses the semantic tokens only: no raw hex, no `rounded-*`, no shadows on content, and the gradient only on the Wordmark.
- [ ] Dark is the default and light mode is complete on every screen. No theme flash on load. The theme persists.
- [ ] Measured contrast meets AA for body text in both themes (results recorded in `decisions.md`).
- [ ] Every tap target is at least 44px. Primary actions are bottom-pinned on mobile. Safe-area insets are respected.
- [ ] Mixed Ge'ez and Latin render in the correct faces. Lyrics line-height is 1.75. There is no letter-spacing or uppercase on Ge'ez.
- [ ] Members: no bottom nav, theme and sign-out in the header, admin routes unreachable (server-guarded).
- [ ] Admins below 1200: a 3-cell bottom nav, with More opening the sheet (focus trap, Esc, scrim, 240ms slide, reduced-motion respected).
- [ ] Search matches title, lyrics, fields and number, with badges and highlighted snippets. Empty state as specified.
- [ ] Song detail: No. header, MetaGrid with gold Key, verse numbers, chorus band with አዝ, repeats collapsed to one row, persisted A−/A+ (16–32), working docked player.
- [ ] Editor: sections add, retype, label, reorder and delete, chorus repeat, all 4 field types, and inline new-field creation without leaving the form.
- [ ] Import: split, edit title, guessed meta, merge next or into previous, save, discard with undo, save all.
- [ ] Slides: multi-pick, per-song sung order with repeats, live 16:9 preview, PPTX in the existing format.
- [ ] Members: add, change role, two-tap remove, self and last-admin protections.
- [ ] Fields: rename everywhere, option edits, duplicate merge, two-tap delete with usage count.
- [ ] Tablet split view and desktop rail layout (if in scope per grilling).
- [ ] Typecheck, lint and tests pass. No console errors.

Start with step 1 (Explore). When the inventory is written, begin the grilling phase with your first question.
