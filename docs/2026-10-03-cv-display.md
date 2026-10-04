# CV Display — View mode, print styles and ATS compatibility (Phase 2)

## What changed, and what did not
Phase 2 adds print output that is plain and ATS-friendly, and tidies a few names. Phase 1 behaviour is otherwise untouched (data model, saved data, sections, themes, layout on screen).

Owner-approved changes to Phase 1 (2026-10-04):
- The **Preview** mode is now called **View**; the toggle is **Edit | View**. It is the single read-only mode (a separate "View" and "Preview" were the same thing, so only one exists).
- Section headings use ATS-standard names, in the editor and in the PDF: Career Snapshot → **Professional Summary**, Core Experience → **Work Experience**, Impact at a Glance → **Key Highlights**, Trainings & Courses → **Training & Courses**. All other headings were already standard.

## Print options (toolbar, "Print options" popover)
Stored in their own `localStorage` key (`cv-builder:print-prefs:v1`), so the CV data schema did not change. They apply to the **Print** button and to Ctrl+P / Cmd+P.
- **Print style**: *Black & white (ATS-friendly)* (default) or *Colour (as on screen)*.
- **Include photo**: off by default; applies to both styles.

The root wrapper carries `data-print="colour|bw"` and `data-photo="show|hide"`; all print rules key off those attributes inside `@media print`.

## Colour print
Unchanged from Phase 1: the page prints as it looks on screen (themes, banner or classic header, backgrounds).

## Black & white print (`data-print="bw"`)
- Toolbar, buttons and edit controls are not printed (`.no-print`); View mode shows no form elements.
- No backgrounds, gradients, shadows, icons, decorative circles, brand-coloured social icons or pills. All text is near-black (`#111`), secondary text dark grey (`#444`); card accent bars become thin grey rules. The theme variables are forced to black/white.
- Skill and technology tags print as a plain comma-separated list.
- Photo, if included, prints in greyscale.
- Own named page (`@page cvbw { size: A4; margin: 0 }`) so Chrome and Edge add **no header/footer** (date, URL, page title). The card has its own 12 mm top/bottom padding, repeated on every page with `box-decoration-break: clone`.
- Cards and rows do not split across pages (`break-inside: avoid`); section headings stay with their first entry (`break-after: avoid`).
- Colour print keeps the earlier `@page { size: A4; margin: 10mm 0 }`; in the print dialog untick "Headers and footers" for a clean result.

### Type scale used in black & white
| Element | Size | Why |
|---|---|---|
| Name | 24 pt bold | Largest thing on the page; the usual 20–26 pt for a CV name |
| Section headings | 14 pt bold, uppercase, rule underneath | Clear scanning anchors for a recruiter's first 10 seconds |
| Entry titles (job, degree, project) | 12 pt bold | One clear step above body text |
| Body, dates, bullets, details | 10.5 pt (nothing below 10 pt) | Above the ~10 pt legibility floor, small enough to keep to the UK 2-page limit |

Basis for these numbers: ATS software has no font-size rule (it reads text, not size), so the sizes are chosen for people: print legibility (10 pt minimum, 10.5-11 pt typical for Calibri/Arial), a visible hierarchy (roughly 1.15-1.3x per step), and the page budget (UK CV: 2 pages). If the CV is short, raise body to 11 pt; if it overflows 2 pages, 10 pt is the lowest sensible value. The values live in the black & white block of `app/globals.css`.

## ATS compatibility: what was tested and fixed
Real PDFs were produced with headless Chrome (`page.pdf`) and the text extracted with pdf.js to see what a parser sees.
1. **Reading order.** First version extracted headings before their content, and the name after "Education". Cause: positioned (`relative`) elements are painted after normal-flow content, and PDFs store text in paint order. Fix: `position: static` for those elements in the black & white print, so the extracted text is name, aim, contact, links, availability, highlights, then each section in order.
2. **Ligatures.** The font joined "fi", "ff", "fl", which extracted as "Arti fi cial", "Co ff ee" (keyword matching would miss these). Fix: ligatures disabled in the black & white print; extraction now returns "Artificial", "Coffee", "Midfielder".
3. **Plain structure.** Real text headings (`<h1>`, `<h2>`), simple bullet lists, links printed as visible text (e.g. `linkedin.com/in/anand`), contact details as plain text, no text inside images, standard section names, month-level dates ("Jun 2026 – Present").
4. **Photo.** Optional and off by default (ATS parsers ignore images; UK use is optional, US usually leaves it out).

## Known limits
- The page counter measures the on-screen (colour) layout; the black & white print is slightly more compact, so it can fit on fewer pages than the counter says. Treat the counter as a safe upper estimate.
- Browser print dialogs control margins and "Headers and footers"; the black & white print avoids them through a zero-margin page, but older browsers without named-page support fall back to default margins.
- Colour print inherits the Phase 1 look (including its 10 mm top and bottom page margins).

## How it was tested
A throwaway script (outside the repo) filled `localStorage` with a full sample CV, switched to View, and called `page.pdf()` in print media for: black & white without photo, black & white with photo, and colour. The PDFs were rendered to images with pdf.js and their extracted text inspected.

## Review of the first real PDFs (2026-10-04)
Three PDFs printed by the owner (colour, black & white with photo, black & white without photo) were rendered and measured.

Found and fixed in this round:
- **Section headings were 10.5 pt, not 14 pt** (a broader text-size rule had higher CSS specificity), which made entry titles (12 pt) larger than the headings. Now 14 pt, confirmed in a regenerated PDF.
- **Skill commas** printed as "English , hindi" (a flex gap before the comma). Now "English, hindi".
- **CERTIFICATION / TRAINING tags** printed as plain words in front of each entry in the black & white print; they are now hidden there (kept on screen).
- **PDF title** was "CV Builder" instead of the candidate's name; the title is now also set on `beforeprint`.
- The Print options panel now warns against the "Adobe PDF" and "Microsoft Print to PDF" printers.

Reported, then approved by the owner and done:
- **Blank dates saved as "Jan 2001"** (an earlier bug: the browser parsed "" as Jan 2001). `lib/migrate.ts` now treats exactly `2001-01` as blank, and `useCV` writes the repaired data back on load. Verified: no "Jan 2001" left in the saved data or in the PDFs.
- **Links with no web address** no longer show as bare icons in View/print; they appear only when a URL is entered.
- **Date of birth is labelled** ("Born: 3 Oct 2006") in View and print.
- **No empty space inside cards**: the bullets, details and description blocks are only rendered when they have content (Education, Experience, Internships, Projects, Extracurricular).
- **Colour print**: nothing below 10 pt (stat labels, header contact column and small tags were 7.5-9.75 pt).
- **Black & white print**: left and right margins raised from about 10.6 mm to 15 mm.
- **"Other courses" renamed "Other Trainings"** (matches "Other certifications").

Critical finding: all three PDFs were made with the **Adobe PDF printer** (Creator "PScript5.dll", Producer "Acrobat Distiller"). That path stores text as Type 3 font shapes with no Unicode mapping and drops link annotations, so the text cannot be extracted (ATS sees gibberish) and links are dead. Use the browser's own **Save as PDF** destination; those PDFs embed real Calibri with a text map and extract cleanly.

## Second PDF review (2026-10-04, PDFs saved with Chrome's own "Save as PDF")
Confirmed good: Producer Skia/PDF (Chrome), Calibri embedded as real fonts with a text map, four live link annotations, black & white text order starts with the name, 14 pt headings, 10.5 pt body, 15 mm side margins, photo prints (greyscale in black & white).

Found and fixed (print-only or invisible changes):
- **Skills cards split across pages** (label at the bottom of page 2, tags at the top of page 3): cards now `break-inside: avoid`.
- **Duplicate text in the colour PDF** ("Deekshan BakshiDeekshan Bakshi"): `text-shadow` is painted as a second copy of the text; removed in print.
- **PDF title stayed "CV Builder"**: the framework re-writes `<title>` after hydration. The title is now kept in place with a `MutationObserver` (and re-applied on `beforeprint`); verified `document.title` and the PDF title are "Name – CV".
- **Colour print with Margins = None** left no top margin on pages 2 and 3; the Print options panel now says Margins: Default for Colour, None or Default for Black & white.

Still open: the "Jan 2001" dates reappeared because the browser tab was not reloaded after the repair shipped (its in-memory data kept re-saving them); one refresh repairs them. The colour print is meant for people: its text order is scrambled for parsers (headings before content), so use Black & white for ATS uploads. Whitespace: with every optional section filled the CV runs to 3 pages, and long cards that do not fit are moved whole to the next page, leaving gaps.

## Owner-approved refinements after the second review
- **Nationality and Visa / work status** (optional header fields, no passport number or expiry: a passport number on a CV is an identity-theft risk and employers check originals at offer stage). Shown in the quick-facts strip under the banner, with text labels ("Visa / work status:", "Nationality:") so they still make sense when icons are hidden in black & white. If Nationality later moves to a "Personal details" block, move it with the date of birth and address.
- **Long entries may split across pages** (Education, Work Experience, Internships, Projects): this removed the large blank gaps (a test CV with long entries now fills every page). Protections in the print CSS: the title row has `break-after: avoid`, bullets and a bold label such as "Outcomes & Accomplishments:" are never separated from what follows, `orphans/widows: 2`, and `box-decoration-break: clone` repeats the accent bar and padding on each page. Small rows (certifications, trainings, awards, activities) and the Skills cards never split.
- **Personal Details block at the end of the CV** (owner decision): date of birth, address and nationality now live in a last section, **Personal Details**, instead of the banner (which keeps name, aim, key-positions line, email, phone, city and links). Visa / work status stays in the quick-facts strip because it belongs with right to work. A third Print option, **Include personal details** (default on), leaves the block out of a printout/PDF (`data-personal="show|hide"`, hidden with `.cv-personal` in `@media print`); recommended off for ATS uploads. The block prints as plain labelled text ("Date of birth: 12 Mar 2006", "Nationality: Indian", "Address: ...").

## Final quality check (third PDF set, 2026-10-04) and last polish
Four PDFs (colour and black & white, with and without photo, personal details on) were saved with Chrome's own Save as PDF and checked: file names and PDF title are "Name – CV"; fonts are real Calibri with a text map; four live links; no "Jan 2001" left; no duplicated text; the photo is embedded only when selected; the black & white text starts with the name and follows the page order; 14 pt headings, 10.5 pt body, 15 mm side margins; personal details block present at the end.

Two issues remained and were fixed afterwards:
- **Colour print depended on the Margins setting**: with "Margins: None" pages 2 and 3 started flush with the top edge. Colour now uses a zero-margin named page (`cvcolour`) with its own 10 mm top/bottom padding repeated per page (`box-decoration-break: clone`), like the black & white print; verified top margins of 30 pt (page 1) and 41 pt (later pages) without any dialog setting. The look with default margins is unchanged.
- **"Other certifications / Other Trainings" line could be stranded** on the next page away from its section rows: `.folded-line { break-before: avoid }` keeps it with the rows above.

Known limits (unchanged): the colour PDF is meant for people (its extracted text order starts with the strip and headings before the name), so use black & white for ATS uploads; page count follows content (a CV with every optional section filled can exceed the UK 2-page guideline; the toolbar chip warns).

## Colour print: banner flush with the top of page 1 (fourth PDF set)
After the zero-margin colour page, every page had a consistent 10 mm top margin, but on page 1 the banner (full width sideways) floated 10 mm below the top edge with a white band above it, unlike the on-screen look. The banner now starts at the very top edge of page 1 (`margin-top: -10mm`) and its top padding grows by 10 mm (`padding-top: calc(10mm + 0.875rem)`), so the colour fills the band and the name stays about 30 pt from the edge (clear of printers' unprintable border). Later pages keep their 10 mm margin (verified: text starts 41 pt from the top on pages 2+). Colour print only; black & white is unchanged.

Correction (fifth PDF set): filling the whole top 10 mm with empty banner colour looked like a dead band above the name. The extra height is now split evenly above and below the banner text (`padding-top` and `padding-bottom: calc(5mm + 0.875rem)`), so the banner has balanced padding and the name sits roughly 9 mm from the top edge, clear of printers' unprintable border. The `margin-top: -10mm` that makes the banner start at the top edge is unchanged.
