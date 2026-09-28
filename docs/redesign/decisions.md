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

