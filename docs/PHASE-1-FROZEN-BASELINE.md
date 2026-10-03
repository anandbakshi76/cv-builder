# Phase 1 — Frozen baseline (2026-10-04)

Phase 1 of 6 is complete and approved by the owner. Git tag: `phase-1-base`. Production build (`npm run build`) and `tsc --noEmit` both pass at this point.

**Everything below is frozen.** Later phases may add features around it, but must not change, remove or silently alter any of it without the review-and-approval step in `CLAUDE.md`.

## Frozen: sections and order
Header banner (photo, name, aim, key-positions line, email, phone, location, optional date of birth and address, social links) → quick-facts strip (availability, work eligibility) → Impact at a Glance (optional, up to 4 tiles) → Career Snapshot → Education → Core Experience → Internships → Projects → Skills → Certifications → Trainings & Courses (or merged "Certifications & Training") → Awards & Recognition → Extracurricular & Volunteering.

## Frozen: behaviour
- Click-to-edit text; Edit / Preview modes; empty sections and fields hidden in Preview.
- Bullet editor (Enter = new bullet); comma-separated tag fields; calendar month pickers with "Ongoing" (stores `present`); full-date picker for date of birth.
- Experience cards: bullets, Key Technologies, Skills, Outcomes & Accomplishments. Projects: organisation, summary, bullet details, tech, link, dates.
- Certifications: valid from / till or lifetime validity. Certifications and trainings: per-entry "On CV" (own row / folded "Other courses" line / hidden) and optional merged section with type tags.
- Education: degree first, institution below, "currently studying" with auto-calculated expected graduation (September start).
- Autosave to `localStorage` key `cv-builder:v1` (400 ms debounce, status indicator, flush on page hide); schema version 1 with `lib/migrate.ts` upgrading older saves.
- Toolbar: save status, Theme popover, Edit/Preview, page counter (A4, UK max 2 pages), CV strength panel (score, UK spelling check, advisories), Print (switches to Preview first), Reset (confirm dialog, restores defaults).
- Browser spell-check in UK English (`lang="en-GB"`).

## Frozen: look and feel
- 10 themes in two groups: Conservative (Navy, Teal, Slate, Forest, Burgundy) and Creative (Gold, Indigo, Emerald, Rose, Amber). Default for a new CV: Teal.
- Header style: Colour banner or Classic (white). Section spacing 24 px; compact header; A4-width card (794 px); font stack Calibri, Carlito, Segoe UI, Helvetica, Arial.
- Template-style cards (grey card, accent bar, bold title, accent subtitle, date pill) for experience, education, projects and awards; compact one-line rows for certifications and trainings.

## Frozen: defaults for a new CV
BSc Computer Science with Artificial Intelligence, University of Nottingham, Year 1 of 4; A-levels (Grade: A*AA), Harvest International; everything else blank.

## Frozen: data model
`CVData` in `lib/types.ts` (schemaVersion 1). New fields may be added only with a default and a step in `lib/migrate.ts`; existing fields are not renamed or removed.

## Known limits at the freeze
- Data lives only in the browser's `localStorage` (per browser, per address). No export/import yet.
- PDF export is the browser's print dialog; the page count is an estimate.
- Reset has no undo.
