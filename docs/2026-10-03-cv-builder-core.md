# CV Builder — Core (2026-10-03, revised)

## 1. Why the sections are in this order
UK and US recruiters skim for about 10 seconds. UK graduate CVs lead with a personal profile then education; US resumes lead with a summary then education for students and recent graduates. Both then put the strongest evidence of ability first. For a fresher that is education, then any paid work and internships, then projects, then skills that back it all up:

1. **Header** — name, target role, a "key positions / impact words" line (e.g. `Software Developer | AI Enthusiast | Fast Learner`), contact and social links. Directly under the banner sits a slim "quick facts" strip with availability and work eligibility (important for a part-time job search; kept out of the banner to avoid clutter). Date of birth and home address are optional extras (hidden unless filled in); UK/US employers do not need them and the CV strength panel warns about a date of birth. Marital status is not offered. photo optional (common in the UK, discouraged in the US).
1b. **Impact at a Glance** (optional) — up to four headline-number tiles (e.g. `A*AA` A-level grades, `Top 5%` Dean's List) so a recruiter sees proof in the first second. Hidden if empty.
2. **Career Snapshot** — 2–3 punchy sentences (the usual "Professional Summary / Personal Profile", named for impact). Hidden if empty.
3. **Education** — degree first, institution below, date on the right. First among content sections because it is a fresher's strongest credential; it moves below experience once the user has substantial work history.
4. **Core Experience** — paid work including part-time jobs, newest first.
5. **Internships** — kept separate so they are easy to spot.
6. **Projects** — university, hackathon and personal work; carries much of the weight experience would.
7. **Skills** — scannable tags that recruiters and ATS match against (also repeated per role as "Key Technologies" and "Skills").
8. **Certifications** (with validity), 9. **Trainings & Courses**, 10. **Awards & Recognition**, 11. **Extracurricular & Volunteering** — supporting evidence, last.

Social links sit in the header with brand-coloured icons: LinkedIn, GitHub, Website, Portfolio, Instagram, Facebook, X, Other. LinkedIn and GitHub are what recruiters expect; add the others only if the account is professional.

## 2. Data structure (localStorage)
Key `cv-builder:v1`, one JSON document of type `CVData` (`lib/types.ts`):

```
{ schemaVersion: 1,
  header: { name, headline, highlights, availability, workEligibility, email, phone, location, dateOfBirth("YYYY-MM-DD"), address, photo(dataURL),
            links: [{ id, platform, url }] },
  stats: [{ id, value, label }],
  summary,
  education: [{ id, degree, institution, current, yearOfStudy, courseLength, end,
                grades, coursework, notes }],
  skills: { technical[], languages[], soft[] },
  theme: "gold" | "indigo" | "emerald" | "rose" | "amber" | "slate",
  experience:  [{ id, title, company, from, to,
                  responsibilities[], technologies[], skills[], outcomes[] }],
  internships: [same shape],
  projects: [{ id, name, organization, description, details[], tech[], link, from, to }],
  certifications: [{ id, name, issuer, validFrom, validTill, lifetime }],
  trainings: [{ id, name, provider, completed, description }],
  awards: [{ id, title, issuer, date, description }],
  extracurricular: [{ id, activity, description, from, to }] }
```
- **Dates** are `"YYYY-MM"` (what the browser's calendar picker produces) and display as "Jun 2026". An end date can be `"present"` (the "Ongoing" checkbox). Certifications use `lifetime: true` instead of a `validTill`.
- Bullet-style fields are `string[]`; comma-style fields (technologies, skills, tech) are `string[]` too, so they can become filter targets later.
- Every list item has an `id`, so removal never depends on index.
- The photo is a ~240px JPEG data URL to stay well inside the ~5 MB localStorage quota.
- `lib/migrate.ts` upgrades any earlier saved shape on load.

Saving: every edit marks "Unsaved changes…", a 400 ms debounce writes to localStorage and flips to "All changes saved". A pending write is flushed on `pagehide`; a failed write shows an error status.

## 3. Design decisions for freshers
- **Everything optional.** No validation blocks anything.
- **Edit vs Preview.** Edit mode shows every section with "Add your…" placeholders so nothing is hidden from someone starting out. Preview shows only filled content, i.e. what a recruiter sees.
- **Smart defaults.** Pre-filled: BSc Computer Science with AI at the University of Nottingham (Year 1 of 4) and A-levels (A*AA) from Harvest International.
- **Expected graduation is derived** from year of study and a September start (Year 1 in Oct 2026 gives Jun 2030).
- **Experience cards follow the bendirt.com template**: grey card with an accent bar, bold title, accent-coloured company, white date pill, bullet responsibilities, then "Key Technologies:", "Skills:" and "Outcomes & Accomplishments:" blocks. Education and Awards use the same card style.
- **Plain-text editing only** (pasted formatting is stripped).

## 4. Look and feel
Gradient banner header (left aligned, photo top-aligned with the name), icon contact row, underlined accent section headings, six colour themes including a Gold theme matching the template, and a Print button with print CSS (browser print-to-PDF; proper PDF export is still a future phase).

## 5. Quality review against UK/US best practice (2026-10-03)
Covered: single-column ATS-safe structure with real text headings; reverse-chronological entries; month-level dates in a format both UK and US readers understand; action-verb bullets plus a dedicated "Outcomes & Accomplishments" block; no date of birth, marital status or full address; optional photo; links with real URLs; skills as plain text; print stylesheet; keyboard-accessible form controls and labelled inputs; text contrast checked (a darker "ink" shade of each theme is used for text and buttons on white; the gold banner uses white text with a light shadow).
Deliberate omissions: "References available on request" (modern guidance says it wastes space), a photo requirement, and a two-column layout (many ATS parsers read columns out of order).
Built in response to the review: availability and work-eligibility line, Impact at a Glance tiles, project organisation + bullet details, and a **CV strength** checklist (toolbar) that scores the CV (name, role line, contact, links, 20-80 word snapshot, 5+ skills, experience or projects, action bullets, a measurable result, extra proof) and lists what is missing.
Added after the review: browser spell-check on every text field with `lang="en-GB"`; a UK-spelling check in the CV strength panel (flags "organized", "color", "optimized"… and suggests the UK form); a page counter (see section 6).
Known gaps: PDF export relies on the browser's print dialog; the browser dictionary only works if the browser's spell-check language includes English (UK).

## 6. Page counter (UK first)
UK CVs should be 2 pages at most. The card is exactly A4 wide (794 px = 210 mm at 96 dpi) and prints with `@page { size: A4; margin: 10mm 0 }`, so one printed page holds 277 mm = about 1047 px of card height. A hidden, fixed-width copy of the Preview is rendered off-screen and measured with a `ResizeObserver`; pages = ceil(height / 1047). The toolbar shows "N pages · UK max 2" (red over 2), Preview draws dashed "Page N ends" lines, and the CV strength panel warns above 2 pages. It is an estimate: entries are not split across pages when printed (`break-inside-avoid`), so a real printout can run slightly longer. Print always switches to Preview first.

## 7. Typography
Font stack `Calibri, Carlito, "Segoe UI", Helvetica, Arial, sans-serif`: plain sans-serif faces that exist on Windows, macOS and Linux and that ATS parsers and recruiters are used to (Arial/Calibri/Helvetica are the usual recommendations; avoid decorative fonts). Body is 15 px (about 11 pt); the name is 30–36 px bold (roughly 22–27 pt), inside the usual 18–28 pt range for a CV name. Earlier versions used a heavier 48 px name, which was larger than convention. The name is now 28 px on phones and 32 px on larger screens.

For reference, the bendirt.com template sets everything in `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`, with the name at 35.2 px, bold (700). Segoe UI exists only on Windows (other systems fall back to Tahoma/Verdana/generic sans), which is why we use a stack that looks similar everywhere.

The header and "Impact at a Glance" were compacted to save page space. The banner is now two columns: identity (name, aim, key-positions line) on the left and plain-text contact details (email, phone, location, optional date of birth and address) on the right, with the social links on one line underneath. Links are shown as icon plus visible address (e.g. `linkedin.com/in/anand`) rather than icon-only, so they are readable on paper and by ATS. Photo is 80 px; stat tiles are smaller and their heading is hidden in Preview. With a typical CV (LinkedIn and GitHub, no date of birth or address) the banner is about 130 px tall, down from about 245 px. Certifications and Trainings & Courses print as one compact line each (`Name · Provider` on the left, validity or completion date as plain text on the right; no pill, tight padding), about half the height of the earlier card layout, because these lists grow over a career. Edit mode keeps the roomier card for the date controls. Every certification and training has an **On CV** setting: *Own row*, *In the "Other courses / Other certifications" line*, or *Hidden (kept, not shown)*. Short online courses can be folded into one line such as `Other courses: Python for Everybody (Coursera, Dec 2025), Git Essentials (Udemy, Jan 2026)`, and hidden entries stay in the master list so a different CV can show a different selection. The two sections can also be combined into one **Certifications & Training** section (checkbox in Edit mode); each entry then carries a small CERTIFICATION or TRAINING tag, because the data stays in two separate lists (`certifications[]`, `trainings[]`) with different fields (validity dates vs completion date). Gaps between sections are 24 px (16 px above the stat tiles), down from 32 px: still clearly separated by the underlined, accent-barred headings.

## 8. Themes and header style
Colour guidance used: one accent colour, near-black body text, strong contrast, must survive black-and-white printing, avoid red text. Ten themes in two groups, chosen from a **Theme** popover in the toolbar:
- **Conservative** (finance, law, consulting, corporate, public sector): Navy, Teal, Slate, Forest, Burgundy.
- **Creative** (design, marketing, hospitality, retail, start-ups): Gold, Indigo, Emerald, Rose, Amber.
Default for a new CV is Teal (modern but professional); Navy is the safest for corporate applications.

**Header style** (same popover): *Colour banner* (gradient, white text) or *Classic (white)* (white header, dark text, a coloured rule underneath), the better choice for law, finance and photocopying. It is implemented as `.header-classic` CSS that re-skins the banner's white-on-colour utilities, so both styles share one set of markup. Both settings are saved in `theme` and `headerStyle`.

## 9. Future phases (not built)
- **PDF export** — the print stylesheet is the first step; then optional server-side render for ATS-clean text.
- **Tag filtering** — tags already toggle a highlight; next step is dimming experience/projects that do not mention the active tags, to tailor a CV per job.
- **Version control** — named snapshots of `CVData` (one localStorage key each, or IndexedDB), diff and restore; `schemaVersion` plus `migrate.ts` is the hook.
- Also likely: JSON import/export backup, drag-to-reorder items, multiple layouts.
