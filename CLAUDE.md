# CV Builder

Single-page, click-to-edit CV for a UK/US-style student CV. Next.js (App Router) + TypeScript + Tailwind v4. No backend, no login: data lives in `localStorage` under `cv-builder:v1`.

## Project phases and working rules (owner's instructions, apply to every later prompt)
The project is built in 6 phases. **Phase 1 is complete and frozen** as the base: see `docs/PHASE-1-FROZEN-BASELINE.md` and git tag `phase-1-base`. Work in manual mode, prompt by prompt, until prompt/phase 6 is done:
1. **Additive and non-disruptive** (new, useful functionality that leaves existing behaviour, sections, settings, themes, data and look unchanged): go ahead and build it.
2. **Anything that changes, removes or could negatively disrupt existing Phase 1 behaviour** (settings, sections, themes, data model, saved data, layout, defaults): do NOT make the change. First review and analyse it, tell the owner the impact, and ask for approval.
3. Keep saved data compatible: new fields need defaults and a `lib/migrate.ts` step; never rename or drop existing fields or the `cv-builder:v1` key without approval.
4. Verify with `npx tsc --noEmit` (and `npm run build` for larger changes) and update `CLAUDE.md` / `docs/` for what was added.

## Commands
- `npm run dev` — http://localhost:3000
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build

## Structure
- `app/page.tsx` — renders `<CVEditor />`; `app/globals.css` — Tailwind import, `.editable` styles, print CSS
- `components/CVEditor.tsx` — the whole page: toolbar (save status, theme swatches, Edit/Preview, Print, Reset), gradient header banner, all sections in CV order, plus `Card`/`CardHead`/`TagsRow` helpers (template-style grey card with accent bar, bold title, accent subtitle, white date pill)
- `components/Editable.tsx` — in-place text (uncontrolled `contentEditable="plaintext-only"`); also owns `EditContext`. In Preview, an empty `Editable` renders nothing. Supports `onEnter` / `onBackspaceEmpty` / `autoFocus` for bullets
- `components/BulletList.tsx` — bullet editor (Enter = next bullet, Backspace on empty removes)
- `components/DateField.tsx` — `DateField` (native month calendar, `type="month"`), `DateRange` (from/to + "Ongoing" checkbox storing `"present"`), `DatePill`
- `components/SocialIcon.tsx` — brand-coloured circular icons + `PLATFORMS`
- `components/TagList.tsx` — comma-separated tags; clicking a tag toggles a highlight (hook for future filtering)
- `components/PhotoUpload.tsx` — square-crops and resizes to a 240px JPEG data URL
- `components/Section.tsx` — `Section` (hidden when `visible` is false), `AddButton`, `RemoveButton`, `Label`
- `lib/themes.ts` — colour themes (gold, indigo, emerald, rose, amber, slate), applied as CSS vars `--accent`, `--accent2`, `--tint` on the root wrapper
- `lib/types.ts` — data model; `lib/defaults.ts` — defaults, blank-item factories, storage key; `lib/cv.ts` — `has.*` content checks, graduation calc
- `lib/health.ts` — "CV strength" score, advisories (page count, date of birth, UK spelling) shown from the toolbar
- `lib/dates.ts` — month formatting and legacy-date parsing; `lib/migrate.ts` — turns any older saved shape into the current `CVData`
- `lib/useCV.ts` — loads (via `migrate`) after mount, debounced (400 ms) save, `saved | unsaved | error` status, flush on `pagehide`

## Section order (do not reorder casually)
Header banner (name, aim, key-positions line, contact, social links) → quick-facts strip (availability, work eligibility) → Impact at a Glance (optional stat tiles) → Career Snapshot → Education → Core Experience → Internships → Projects → Skills → Certifications → Trainings & Courses → Awards & Recognition → Extracurricular & Volunteering.
Rationale in `docs/2026-10-03-cv-builder-core.md`.

## Visibility rule
Edit mode shows every section (empty ones as "Add your…" placeholders). Preview mode shows a section only if `has.<section>(data)` is true, and hides empty fields inside it. List sections are visible when their array is non-empty.

## Data model (`CVData`, `schemaVersion: 1`)
`header` (name, headline, highlights, availability, workEligibility, email, phone, location, dateOfBirth, address, photo, `links[]` = `{id, platform, url}`) · `summary` · `education[]` (degree, institution, current, yearOfStudy, courseLength, end, grades, coursework, notes) · `skills` (technical/languages/soft) · `theme` · `experience[]` and `internships[]` (title, company, from, to, `responsibilities[]`, `technologies[]`, `skills[]`, `outcomes[]`) · `stats[]` (value, label) · `projects[]` (organization, description, details[], tech[], from/to) · `certifications[]` (validFrom, validTill, lifetime) · `trainings[]` (completed) · `awards[]` · `extracurricular[]` (from/to). List items carry a stable `id`.
All dates are `"YYYY-MM"`; end dates may be `"present"`. Part-time jobs go in Core Experience (there is no separate part-time section).

## Migration
`lib/migrate.ts` handles earlier saves: single education object → `education[]`, free-text `description` → bullet `responsibilities`, text dates → `YYYY-MM`, `date`/`dates`/`duration` → new date fields. Add a new step there whenever a field is renamed.

## Themes and header style
`lib/themes.ts` holds 10 themes plus `THEME_GROUPS` (Conservative / Creative); the toolbar `ThemePicker` popover in `CVEditor.tsx` sets `theme` and `headerStyle` (`banner` | `classic`). `.header-classic` in `globals.css` overrides the banner's `text-white` / `bg-white/15` / `border-white` utilities, so when adding banner markup keep using those utilities (or add a matching override) and mark decorations with `.deco` and the accent line with `.hl`.

## Certifications and trainings
Two arrays (`certifications[]`, `trainings[]`), each entry with `display: "row" | "line" | "hide"`. Rows render compactly; `line` entries are folded into one "Other courses:" / "Other certifications:" line; `hide` entries stay in the data but are skipped in Preview/print. `mergeCertTraining` renders both in one "Certifications & Training" section with a type tag per entry. `has.certifications` / `has.trainings` ignore hidden entries.

## Page counter
`CVEditor` renders `CVDocument` twice: the visible one, and a hidden 794 px-wide Preview copy measured with `ResizeObserver` (`PAGE_PX` = 277 mm of A4 at 96 dpi). Pages = ceil(height / PAGE_PX). Print CSS: `@page { size: A4; margin: 10mm 0 }`, card forced to 210 mm. Cards use `break-inside-avoid`.

## Styling
Theme CSS vars on the root wrapper: `--accent` (fills, bars, banner), `--accent2` (banner gradient end), `--tint` (light backgrounds), `--ink` (darker shade for text/buttons on white; use it instead of `--accent` for text). The name `<h1>` uses `.name-trim` so the photo's top edge matches the top of the capital letters.

## Gotchas
- `Editable` is uncontrolled: never pass changing `key`s to it, and do not make it render `value` as children (caret would jump).
- Render the editor only after `useCV` has loaded (avoids SSR/localStorage hydration mismatch).
- Expected graduation assumes a September start: `Jun (start year + courseLength)`.
- On Windows, edit files with the Edit/Write tools; Python's default `open()` encoding (cp1252) corrupts non-ASCII characters like `—` and `…`.
