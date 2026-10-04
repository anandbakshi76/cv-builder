# Skill filtering in View mode (Phase 3)

Recruiters can click skills in the **Skills** section of View mode to see which **experience, internship and project** entries mention them. It is additive: Edit mode, saved data and printing are unchanged.

## What the viewer sees
- Skill tags (Technical, Languages, Soft skills) are buttons. Clicking one selects it (filled tag, `aria-pressed`); clicking again deselects it.
- **Multiple skills, OR logic**: an entry matches if it mentions **any** selected skill.
- Matching cards get a coloured outline and a small badge, e.g. `Matches: Python, SQL` (so the viewer sees why it matched). Non-matching cards are dimmed to 40% (hover raises them to 85% so they stay readable).
- A floating filter bar (bottom of the screen, any scroll position) shows the selected skills (click a chip to remove it), a live count ("1 experience entry, 2 projects match"), a **Show only matches** checkbox (hides non-matching cards instead of dimming) and **Clear filters**. With "Show only matches" on and nothing matching in a section, the section shows "No entries here mention the selected skills."
- Education, certifications, trainings, awards, activities and personal details are never filtered or dimmed.
- Mobile: the Skills cards stack in one column, tags wrap, the filter bar fits the screen width (checked at 375 px: no horizontal scroll).
- A short hint ("Click a skill to highlight the experience and projects that mention it.") is shown above the skills until something is selected.

## Matching rules (`lib/filter.ts`)
- Case-insensitive, **whole-term** match. Letters, digits, `+` and `#` count as part of a term, so `C` does not match `C++`, `C#` or `Canva`; `Java` does not match `JavaScript`; `Node.js` and `C++` match themselves. (Unit-checked: "C" in "firmware in C" = yes, in "C++ tool" = no.)
- Text searched, experience and internships: job title, company, responsibilities, Key Technologies, Skills and Outcomes. Projects: name, organisation, summary, details and Tech Used. So a skill is found whether it is in a structured field or only mentioned in a bullet.
- No aliases or fuzzy matching (e.g. "JS" does not match "JavaScript"): add both spellings to the skills if needed.

## State
Selected skills and the "Show only matches" choice live in React state in `CVEditor` only. They are not saved, not in the URL and not in `localStorage`, so the data schema and the `cv-builder:v1` key are untouched. Switching to Edit clears the selection (filters only exist in View mode). The "Clear filters" button clears the selection; the "Show only matches" choice stays as the viewer left it.

## Edit mode is unchanged
`TagList` gained two optional props (`selected`, `onToggle`). Only the View-mode Skills section passes them; everywhere else the tag keeps its Phase 1 behaviour (a local highlight toggle in Edit mode). The hidden page-measuring copy of the CV never receives a filter, so the page counter is unaffected by filtering.

## Printing always ignores filters
Filtering only adds CSS classes (`fx-hit`, `fx-dim`, `fx-hide`, `fx-badge`, `fx-selected`); no entry is removed from the page. `@media print` resets all of them: full opacity, no outline or glow, hidden cards shown again (`display: block !important`), badges hidden, the selected-tag style replaced by the normal tag style, and transitions disabled so a printout cannot capture a half-faded card. The filter bar is `no-print`.

Tested with real PDFs (headless Chrome, print media), each printed with and without an active filter, in black & white and in colour (the black & white run used Python + SQL with "Show only matches", which hid 3 of 5 entries on screen):
- the extracted PDF text of the filtered and the unfiltered version is **identical**, and the page counts are the same;
- every card is `display` visible, opacity 1, no outline, no shadow in print; badges hidden; selected tags look like normal tags.

## Files
`lib/filter.ts` (matching, `SkillFilter` type), `components/TagList.tsx` (optional controlled selection), `components/CVEditor.tsx` (state, filter bar, per-card `fx` state and badge, Skills hint), `app/globals.css` (the `fx-*` classes and their print resets).

## Limits and ideas for later
- Only the Skills section is clickable; the "Key Technologies / Skills / Tech Used" lines inside entries are plain text. Making those words clickable too would help when a skill is not in the Skills list.
- A shareable link such as `?skills=Python,SQL` would let a candidate send a pre-filtered view.
- No alias matching.
