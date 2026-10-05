# CV Builder

A click-to-edit CV builder for students and early-career job seekers (UK first, US-aware). Everything runs in your browser: **no account, no server, no tracking**. Your CV is stored in `localStorage` on your own device.

Built with Next.js (App Router), TypeScript and Tailwind CSS.

## Features
- **Click any text to edit it**; add or remove experience, internships, projects, certifications, trainings, awards and activities. Auto-saves.
- **Edit and View modes.** View hides empty sections and shows the CV the way a recruiter sees it.
- **ATS-friendly print / PDF.** Black & white (plain, real text, no backgrounds) or colour; optional photo and personal details. Use your browser's own **Save as PDF** destination.
- **Skill filter in View mode.** Click a skill to highlight the experience and projects that mention it.
- **Export:** PDF, Word (.docx), a self-contained HTML page, a one-page landscape PowerPoint, plain text, JSON (re-importable backup), LinkedIn-ready text, e-mail draft and QR code (contact card or profile link).
- **Versions.** Save as many named versions as you like (e.g. "Python Dev - TechStartup"), load or delete them; the sidebar shows how much browser storage they use.
- **Ten colour themes**, a classic white header option, an A4 page counter (UK 2-page guide) and a "CV strength" checklist with UK-spelling hints.

## Quick start
Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run build` | Production build |
| `npm start` | Serve the production build on port 3000 |

## Your data and privacy
- The CV lives in your browser (`localStorage` key `cv-builder:v1`); saved versions in `cv-builder:versions:v1`; print choices in `cv-builder:print-prefs:v1`.
- Nothing is sent anywhere. There is no backend. Clearing site data deletes your CV, so use **Export As → JSON** for a backup (and **Import JSON** to restore it on this or another computer).
- Browsers allow roughly 5 MB per site. A photo is stored as a small Base64 JPEG (about 10-40 KB); each saved version includes its own copy.

## Project layout
```
app/            Next.js entry (page, layout, global CSS incl. print styles)
components/     CVEditor (the page), editing widgets, PrintOptions, ExportMenu, VersionsPanel, Modal
lib/            data model (types, defaults, migrate), view/print helpers, skill filter, versions
lib/export/     model (one description of the CV), formats (text, LinkedIn, JSON), docx
docs/           design notes for each phase
CLAUDE.md       architecture notes and working rules (read this before changing things)
```

## Contributing
Read `CLAUDE.md` and the notes in `docs/` first. Key rules:
- Keep saved data compatible: new fields need a default and a step in `lib/migrate.ts`; do not rename or remove existing fields or the `cv-builder:v1` key without discussion.
- Printing must stay ATS-friendly (real text in DOM order, no ligature splits). Test changes by saving a PDF and checking its text.
- Run `npm run typecheck` and `npm run build` before opening a pull request.

## Deploying
The app is fully client-side, so any Node host works (for example Vercel or Netlify). A static export (GitHub Pages) is possible but needs a `basePath` configuration and has not been set up yet; see `docs/2026-10-03-sharing.md` for the related hosting decisions.

## License
No license has been chosen yet. Add a `LICENSE` file (for example MIT) before publishing if you want others to be able to reuse the code.
