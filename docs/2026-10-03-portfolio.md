# Portfolio website (Phase 5)

A recruiter-facing portfolio built around the CV, living next to the CV builder. It is **purely additive**: the CV builder at `/`, its saved data (`cv-builder:v1`), themes, print output and exports are unchanged, and the portfolio only *reads* the CV (it never writes to the builder's storage).

## Where things are
| URL | What it is |
|---|---|
| `/` | The CV builder, exactly as before (not moved) |
| `/portfolio` | Portfolio home: hero, highlights, about, featured projects, tech stack, education and experience, awards, call to action |
| `/portfolio/cv` | The CV, read-only and print-ready, with Print / Save as PDF, Word, HTML and plain-text buttons and a link to the builder |
| `/portfolio/projects` | Full projects gallery with filter by technology and links to code / demos |
| `/portfolio/contact` | Contact form plus direct email, location, availability and social links |

**Why `/portfolio` and not `/`:** the brief asked for the portfolio homepage at `/`, but the CV builder already lives there. Moving it would change the builder's address and bookmarks, which the project rules treat as a disruptive change that needs approval first. When you want the portfolio to be the site's front door, the swap is small and reversible: move the builder to `/cv-builder` (and `/portfolio/*` to `/`, `/cv`, `/projects`, `/contact`). Say the word and I will review the impact and do it.

## Where the data comes from
One CV drives everything (name, headline, key positions, availability, photo, summary, projects, skills, education, awards, links). Two sources, in this order:
1. **Live**: the CV saved in this browser by the CV builder. This is what you see while editing (a slim "Preview" bar says so).
2. **Published**: the file `public/portfolio-cv.json`, a normal CV Builder JSON export. A visitor's browser has no copy of your CV, so on a deployed site everyone sees this file.

A CV with no name is treated as empty, so an untouched builder never hides the published file. **To publish your real portfolio:** in the CV builder choose Export As, JSON, then save the file as `public/portfolio-cv.json` (replace the demo "Alex Morgan" content) and redeploy. The file is public to anyone who visits the site, so publish only what you are happy to share (the photo is included if the CV has one; the CV page hides date of birth, address and nationality unless a visitor ticks the box, but a phone number in the CV header is shown).

## How each page works
- **Projects** come from the CV's Projects section (`lib/portfolio.ts`: `projectViews`, `featuredProjects`). Home shows the 4 most recent (ongoing first); the Projects page shows all. A project link to github.com / gitlab.com / bitbucket.org is labelled "View code", any other link "Live demo".
- **Tech stack** = technical skills plus technologies named in projects and roles, ranked by how many projects use them (a skill that is also used in a project ranks first). `(learning)` style notes are ignored when matching, so "Python (learning)" and "Python" are one item.
- **Filter by technology** (Projects page): multi-select chips with counts, OR logic, "Clear filters", and a live "Showing x of y" line.
- **CV page** has two views (tabs; `?view=slide` or `?view=document`; the one-page profile is the default, phones open the full CV): **One-page profile**, the same one-page slide as the downloadable PowerPoint, drawn on screen from the very same list of shapes and text boxes the `.pptx` is built from (`layoutOnePager` in `lib/export/pptx.ts`, drawn by `components/portfolio/OnePagerView.tsx`), so the screen and the file always match; it uses the colours of the portfolio's current look, has a Colour / black & white switch, and on a phone stays readable and can be swiped sideways. Buttons: Print / Save as PDF (prints the slide on a landscape page of its own size, with real text), PowerPoint (.pptx). **Full CV**: the complete read-only CV, built from the same neutral model as the exports (`lib/export/model.ts`, so it follows the View-mode visibility rules), with Print / Save as PDF on its own named A4 page and Word, HTML and plain-text downloads (Phase 4 exporters). Both views have photo and personal-details switches (personal details off by default). Print uses the browser's own "Save as PDF"; the portfolio header, footer and buttons are hidden when printing. "View my CV" on the home page opens this page.
- **Contact form** needs no server of its own. Validation runs in the browser (name, valid email, message of 10 to 2,000 characters, with inline errors) and a hidden honeypot field blocks simple bots. By default **"Open in my email app"** opens the visitor's mail client with the message filled in (`mailto:` to the CV's email address) and **Copy message** is offered as a fallback. To send without a mail client, set `NEXT_PUBLIC_CONTACT_ENDPOINT` at build time to a form-backend URL (for example a Formspree form) and the form posts JSON there with `fetch` instead (name, email, subject, message). Nothing is stored by this site.
- **Look**: see "Looks and colour setting" below. Responsive from phone to desktop; mobile menu with Escape to close; skip link, visible focus, labelled form fields and live status messages for accessibility; sticky header with the same navigation on every page, a "Hire me" button and a "CV Builder" link back to `/`. Liveliness: sections fade up as they scroll into view, cards lift on hover, background circles and the glass cards drift gently, whole-number highlights count up, a thin gold progress bar follows the scroll, and the availability dot pulses; all of it is switched off for visitors who prefer reduced motion and for printing.

## Looks and colour setting (separate from the CV builder)
The portfolio has its OWN colours: changing the theme in the CV builder does **not** change the portfolio's look (an earlier version let looks A to C follow the CV theme; that was wrong for a separate setting and is fixed). Six ready-made looks:

| Look | Name | Hero | Colours |
|---|---|---|---|
| A (`teal-gold`, default) | Teal + gold | dark | teal, gold accent |
| B (`teal-coral`) | Teal + coral | dark | teal, coral accent |
| C (`light`) | Light hero + gold | light | teal, gold accent |
| D (`navy-gold`) | Deep navy + gold | dark | navy, gold accent |
| E (`black-gold`) | Black + gold | dark | black and charcoal, warm gold |
| F (`slate-gold`) | Slate + gold | dark | slate grey-blue, gold accent |

**Choosing the look for visitors:** edit `public/portfolio-theme.json` (optional file; deploy again after changing it):
```json
{ "look": "black-gold" }
```
and, if you want, override parts of a look: `"base"` (any CV theme id such as `navy`, `burgundy`, `forest`, `slate`, or `"cv"` to follow whatever theme is selected in the CV builder), `"accent"` (any `#rrggbb` colour) `"hero"` (`"dark"` or `"light"`) and `"floatingCards"` (`false` hides the glass highlight cards around the photo), for example `{ "look": "light", "base": "navy", "accent": "#ff7a59" }`. A missing, broken or invalid file falls back to the default look, so the site never breaks.

**Floating cards around the photo (on or off):** for visitors, set `"floatingCards": false` in `public/portfolio-theme.json` (default is on). In your own preview, use the **Photo cards: on/off** button in the dark bar at the top, next to the look buttons (remembered in this browser only, key `portfolio:cards`, never seen by visitors).

**Trying looks:** in your own preview the dark bar at the top has the buttons A to F (your pick is remembered in this browser only, key `portfolio:look`, and never affects visitors); anyone can also add `?look=black-gold` to any portfolio address to see that look. Order of precedence: `?look=` then your preview pick then the theme file then the default. Styles are CSS variables set on the portfolio root (`--accent`, `--accent2`, `--tint`, `--ink`, `--pf-gold`, `--pf-on-gold`) plus `data-hero`, with the rest derived in `app/portfolio/portfolio.css` (all selectors under `.pf-root`).

## Testing done
Headless Chrome against the running app with a real CV: no horizontal scroll at 1440, 820 and 390 px on all four pages; mobile menu opens, navigates and closes; tech filter; contact validation, honeypot and confirmation; visitor view (empty browser) falls back to the published demo; printing the CV page to PDF gives real text, A4 pages and no portfolio chrome; the saved CV was byte-identical before and after browsing the portfolio; the Phase 4 (40) and export (9) checks still pass. Not tested: a real mail client opening, a real Formspree endpoint, Safari and Firefox.

## Code map
`app/portfolio/layout.tsx` (+ `page.tsx`, `cv/page.tsx`, `projects/page.tsx`, `contact/page.tsx`), `components/portfolio/PortfolioShell.tsx` (header, mobile menu, footer, theme variables and the data context), `components/portfolio/ui.tsx` (section heading, page banner, reveal and count-up effects, buttons, chips, project card, empty state), `lib/portfolioTheme.ts` (the looks and the theme file), `app/portfolio/portfolio.css` (scoped styles and animations), `public/portfolio-theme.json` (your look), `components/portfolio/CVSheet.tsx` (read-only CV), `components/portfolio/OnePagerView.tsx` (on-screen one-page slide), `lib/portfolio.ts` (data loading and derived lists), `public/portfolio-cv.json` (demo published snapshot). The only existing files touched are `CLAUDE.md` and `README.md` (documentation) and `lib/export/pptx.ts` (the PowerPoint builder was split so the same layout can also be drawn on screen; the .pptx output is unchanged).

## Ideas not built (need a decision or a backend)
Per-project screenshots and case-study pages (the CV has no image or long-text fields for them; adding them would change the data model), a blog, analytics, a custom domain, GitHub Pages deployment (see `docs/2026-10-03-sharing.md`), and swapping the portfolio in at `/` (above).

## Live address opens the portfolio
`vercel.json` (project root) holds one temporary redirect, `/` to `/portfolio`, so the published address (deekshan-bakshi.vercel.app) opens the portfolio. Only Vercel reads it: `localhost:3000` still opens the CV builder. The builder page is therefore not linkable on the live site (it would be empty for visitors anyway). To undo, delete `vercel.json` and push.
