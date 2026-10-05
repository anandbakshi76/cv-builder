# Phase 1 — Frozen baseline (2026-10-04)

Phase 1 of 6 is complete and approved by the owner. Git tag: `phase-1-base`. Production build (`npm run build`) and `tsc --noEmit` both pass at this point.

**Everything below is frozen.** Later phases may add features around it, but must not change, remove or silently alter any of it without the review-and-approval step in `CLAUDE.md`.

## Frozen: sections and order
Header banner (photo, name, aim, key-positions line, email, phone, location, social links) → quick-facts strip (availability, work eligibility) → Key Highlights (optional, up to 4 tiles) → Professional Summary → Education → Work Experience → Internships → Projects → Skills → Certifications → Training & Courses (or merged "Certifications & Training") → Awards & Recognition → Extracurricular & Volunteering → Personal Details (optional, last).

## Frozen: behaviour
- Click-to-edit text; Edit / View modes; empty sections and fields hidden in View.
- Bullet editor (Enter = new bullet); comma-separated tag fields; calendar month pickers with "Ongoing" (stores `present`); full-date picker for date of birth.
- Experience cards: bullets, Key Technologies, Skills, Outcomes & Accomplishments. Projects: organisation, summary, bullet details, tech, link, dates.
- Certifications: valid from / till or lifetime validity. Certifications and trainings: per-entry "On CV" (own row / folded "Other Trainings" line / hidden) and optional merged section with type tags.
- Education: degree first, institution below, "currently studying" with auto-calculated expected graduation (September start).
- Autosave to `localStorage` key `cv-builder:v1` (400 ms debounce, status indicator, flush on page hide); schema version 1 with `lib/migrate.ts` upgrading older saves.
- Toolbar: save status, Theme popover, Edit/View, page counter (A4, UK max 2 pages), CV strength panel (score, UK spelling check, advisories), Print (switches to View first), Reset (confirm dialog, restores defaults).
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

## Changes approved after the freeze
- 2026-10-04 (Phase 2): "Preview" renamed **View** (toggle is Edit | View); headings renamed to ATS-standard names (Professional Summary, Work Experience, Key Highlights, Training & Courses). The names above already reflect this. See `docs/2026-10-03-cv-display.md`. The tag `phase-1-base` still points at the original wording.
- 2026-10-04 (after the PDF review, approved by the owner): blank dates saved as Jan 2001 are repaired on load; links without a URL hidden in View; date of birth labelled "Born:" in View; no empty padding blocks inside cards; the folded line for trainings is labelled "Other Trainings"; the Print options panel warns against the Adobe PDF / Microsoft Print to PDF printers; the PDF title is the candidate's name. Details: `docs/2026-10-03-cv-display.md`.
- 2026-10-04 (second PDF review, approved by the owner): optional Nationality and Visa / work status fields added to the quick-facts strip; long entries may split across pages when printing. Details: `docs/2026-10-03-cv-display.md`.
- 2026-10-04 (owner decision): date of birth, address and nationality moved from the banner to a final **Personal Details** section, with a Print option to include or hide it. Details: `docs/2026-10-03-cv-display.md`.

## Phase 2 complete (2026-10-04, git tag `phase-2`)
View mode (formerly Preview), Print options (black & white ATS-friendly or colour, photo, personal details), ATS-standard headings, personal details block, page splitting, and the quality fixes from five rounds of real-PDF review. `tsc` and `npm run build` pass. Treat Phase 2 as part of the frozen base for Phase 3 onwards: the same review-and-approval rule applies to changing it.

## Phase 3 complete (2026-10-04, git tag `phase-3`): skill filter in View mode
Additive: no change to Edit mode, saved data or printing. See `docs/2026-10-03-cv-filtering.md`.

## Phase 4 (2026-10-04, in progress): export, versions, photo checks
Additive: Export As menu (Word, text, JSON + import, LinkedIn, e-mail, QR), Versions sidebar, photo upload checks and fixes, README and CI workflow. Share links are waiting for an owner decision (needs a backend). Small approved-by-prompt change to existing behaviour: the PDF's file name / title while printing is now `First_Last_CV`. See `docs/2026-10-03-export-formats.md` and `docs/2026-10-03-sharing.md`.
- 2026-10-04 (Phase 4 follow-up, owner request): no limit on the number of saved versions; Word export gained colour themes, a photo / personal-details dialog, footer and UK English; LinkedIn text restructured to LinkedIn's field names.
- 2026-10-04 (Phase 4 follow-up, owner request): HTML and one-page landscape PowerPoint exports added; Word colour header strip aligned with the banner. See `docs/2026-10-03-export-formats.md`.
