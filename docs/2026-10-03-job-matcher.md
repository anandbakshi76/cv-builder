# Job Matcher (Phase 6)

Compare your CV with a job description, see how well they match, apply safe suggestions with a click, and save the result as a new, aligned version of your CV. It is additive: the editor, saved data, themes, exports and the portfolio work as before. The only change to existing screens is one new **Job Matcher** link in the builder's toolbar (next to Versions).

Open it from the toolbar, or go to `/job-matcher`.

## How to use it
1. **Add the job.** Upload a file (PDF, DOCX, JSON, HTML, XLSX, TXT or PPTX, up to 5 MB) **or** paste the text (up to 5,000 characters). Both boxes work independently; if you use both, tick which one to analyse.
2. **Choose how to analyse.** *AI analysis* (reads the job carefully) or *Basic keyword check* (free, offline, simpler). If no AI key is set up, the basic check is selected for you.
3. **Analyse job.** You see "Analyzing with AI..." (or "Analyzing job...") and then the results.
4. **Review.** Match percentage with a coloured bar and a word label, strong / weak / missing skills with evidence, projects that fit the job, and suggestions.
5. **Apply.** Tick the suggestions you want (**Preview** shows before and after for each; **Select all re-orderings** and **Clear** are one click). The **Before and after** panel always shows exactly what would change. Unticking a suggestion undoes it.
6. **Save.** Name the version (pre-filled as "Job title - Company Job", editable) and press **Create aligned version**. It appears in your Versions list in the builder, linked to the job. Your working CV does not change. **Open it in the CV builder** makes it your working CV (your current CV is saved as a version first, and you are asked to confirm).
7. **Come back later.** "Your analysed jobs" lists every job with its score and the version made from it; **Open** shows the analysis again so you can make another version.

## Choosing which CV to use (master profile and other versions)
At the top of step 1, **"Which CV should I use?"** lists your working CV and every saved version (your master profile, older versions, earlier tailored CVs). The analysis, the suggestions and the new tailored CV are all based on the one you pick. It is only read: it is never changed.

## Create a completely new tailored CV (AI)
Like asking an AI chat to "write me a CV for this job from my base CV", but safe and saved inside the app:
1. Choose the base CV, add the job (any supported file or pasted text), tick the consent box and press **Generate tailored CV** (needs the AI to be set up; see below).
2. The AI drafts changes to the base CV: a new headline and summary, re-worded descriptions and bullets, skills and technologies re-ordered or trimmed, and items that do not fit the job left out. Each change is shown as a **before and after** card with a tick box; text can be edited by hand.
3. **Nothing can be invented.** The AI may only point at items that exist (by id) and may only choose skills, tools and technologies that are already in the same list; unknown ones are thrown away. Every new piece of wording is then checked against the base CV: if it contains **a number, a tool or skill name, or a proper name that the CV does not contain**, the card is marked "Not found in your CV: ..." and **starts switched off**. You can still keep it if it is true (for example you did build five APIs but never wrote it down) after checking it yourself. Education is never removed.
4. **Preview the new CV** shows the result as a full CV. When happy, name it (pre-filled "Tailored: Job title - Company (from Base)") and **Save as new CV**.
5. It is saved as a **separate version** marked **Tailored** (the Versions list in the builder shows the label), together with the job description; the base CV and your working CV are not touched. A free basic analysis is stored with the job if you did not run one.
6. **View and export** opens `/job-matcher/cv?id=...`, where the tailored CV is shown as the one-page profile and as the full CV, with **Print / Save as PDF, PowerPoint (.pptx), Word (.docx), HTML, plain text, LinkedIn text and JSON**: every format the CV builder offers. **Open in the CV builder** makes it your working CV (the current one is saved as a version first).

Tailoring needs the AI. Without a key, use the suggestions in steps 2 to 5 below for a free, basic **aligned** version (re-ordering only). The same safety rules apply to both: nothing is added that is not already in the CV, and your own CV is never overwritten without your say-so.

## Supported files
| Format | How it is read | Notes |
|---|---|---|
| PDF | pdf.js, in your browser | Needs selectable text. A scanned PDF (a picture of text) cannot be read: you are told to paste the text instead. First 30 pages. |
| DOCX | the Word file's XML | Old `.doc` is not supported (save as .docx). |
| PPTX | text of every slide | Old `.ppt` is not supported. |
| XLSX | shared strings and cells, first 5 sheets and 500 rows each | Old `.xls` is not supported. |
| JSON | every text and number value | |
| HTML | visible text (scripts and styles are dropped) | |
| TXT / MD | as is | |

Files are read in your browser and are never uploaded as files; only the extracted text may be sent for the AI analysis. Over 5 MB, an unsupported type, a damaged file or a file with no text gives a clear message and the choice to paste instead. Text read from a file is cut to about 3,000 words (20,000 characters) before analysis, and you are told when that happens.

## Understanding the match percentage
The score is "how much of what the job asks for your CV already shows", from 0 to 100. The bar colour **and** the words both show the band:
| Score | Colour | Meaning |
|---|---|---|
| 80 to 100 | green | Strong match |
| 50 to 79 | yellow | Good match, room to improve |
| 30 to 49 | orange | Weak match, needs re-ordering |
| below 30 | red | Major gaps |

Skills are listed as **Strong** (in your skills and used in projects or roles), **Partial** (listed but not shown, or used but not listed) and **Missing** (not in the CV). "Missing" is information, not an instruction: the app never adds a skill for you, and you should not add one that is not true. A score is a guide: a student CV rarely scores 90 for a graduate role, and a low score on one job says nothing about your worth.

## Applying suggestions safely
Only five kinds of change exist, and none can add a fact that is not already in your CV:
- re-order your skills (technical, soft, languages);
- re-order projects, roles, internships, awards or activities;
- re-order the bullets inside one project or role;
- re-word your **summary**;
- re-word your **headline**.

Re-orderings are ticked for you. **Text rewrites start unticked** and show an editable box: read them, change them, and keep only what is true. Advice that cannot be applied automatically (for example "mention Docker") is shown greyed out as advice only. Everything the AI returns is checked before it is shown: ids, skills and bullet numbers must exist in your CV or the suggestion is downgraded to advice. The AI is also told never to invent skills, jobs or achievements and to treat the job text as data, not as instructions.

## Setting up the AI (Claude or another service)
The AI call is made by the app's own server, so the key never reaches the browser. Without a key the Job Matcher still works with the basic check.

1. Get an API key (Anthropic: console.anthropic.com, API keys; a paid account or credit is needed).
2. Copy `.env.example` to `.env.local` in the project folder and fill in:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # ANTHROPIC_MODEL=claude-sonnet-5-5     (optional: the model to use)
   ```
3. Restart `npm run dev` (environment files are read at start-up). The Job Matcher page now offers "AI analysis".
4. **Another service:** set `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL` and `OPENAI_BASE_URL` (any OpenAI-compatible service). The code is in `app/api/analyze-job/route.ts` (`callAnthropic`, `callOpenAI`).
5. **Never commit `.env.local`**: `.gitignore` already excludes `.env*` (only `.env.example` is kept).

**On a public website** (for example Vercel): the route is **off in production unless `JOB_MATCHER_ACCESS_CODE` is set**, because otherwise anyone who found the address could spend your credit. If you set a code, visitors must type it on the Job Matcher page. Every address is also limited to 10 AI requests per 10 minutes (per server process), requests are capped in size, and each call has a 60 second limit. The Job Matcher needs a Node server: it does not work on static-only hosting such as GitHub Pages (the basic check still works there).

## Cost per analysis
One analysis sends about 3,000 to 6,000 characters of CV and up to 20,000 characters of job text and asks for about 1,000 to 2,000 characters back: roughly 1,500 to 7,000 input tokens and 700 to 1,500 output tokens. At typical prices for a mid-sized model that is **about 1 to 5 pence (roughly $0.01 to $0.07)** per analysis, and up to about 10 pence for a very long job text, which matches the "about 1 to 10 pence" shown on the page. Prices change: check your provider's page. The basic check is free.

## Privacy
- **Job descriptions, analyses and the versions made from them are stored only in your browser** (`localStorage`: `cv-builder:jobs:v1` and your versions). The last 20 jobs are kept; delete any from "Your analysed jobs".
- **With AI analysis, content does leave your computer**: your CV content and the job text go to the app's server and from there to the AI provider. To limit this, the app removes your **photo(s), name, e-mail, phone, address, date of birth, nationality, visa status and profile links** before anything is sent; the job text is sent as it is, so do not paste anything private. You must tick a consent box before the first AI analysis, and the choice is remembered in your browser.
- The basic keyword check runs entirely in your browser: nothing is sent anywhere.
- Your provider's own terms apply to what they receive. If you would rather not send anything, use the basic check.

## Limits
The AI can be wrong or too generous: treat suggestions as ideas. The basic check only knows a built-in list of about 250 common technical and soft-skill words, cannot read between the lines, and only suggests re-orderings. It does not understand "5 years' experience" style requirements, salary, location or visas. Nothing here guarantees an interview.

## Code map
`app/job-matcher/page.tsx` and `components/jobmatch/JobMatcher.tsx` (the screen); `app/api/analyze-job/route.ts` and `app/api/tailor-cv/route.ts` (server routes), `lib/jobmatch/server.ts` (access code, rate limit shared by both routes, provider calls); `lib/jobmatch/types.ts` (analysis shape, the five change kinds, limits), `prompt.ts` (what is sent and the instructions), `validate.ts` (checks everything the AI returns), `apply.ts` (re-ordering, before/after, compare), `tailor.ts` (the tailoring prompt, checking the AI's plan, truthfulness flags, applying accepted changes), `components/jobmatch/TailorPanel.tsx` (review screen), `app/job-matcher/cv/page.tsx` and `components/portfolio/CvViewer.tsx` (view and export; the viewer is shared with the portfolio CV page), `basic.ts` (offline matcher), `parse.ts` (file reading), `storage.ts` (jobs, aligned versions, making a version the working CV). New packages: `pdfjs-dist` (PDF text) and `jszip` (Word, PowerPoint and Excel files). Versions gained optional `jobId`, `tailored` and `basedOn` fields (`lib/versions.ts`) and a small "Tailored" label in the Versions list; older saves simply lack them.

## Tests done
Browser tests against the running app with real files: all seven formats read; the 5 MB limit, old `.doc`, unknown type, empty file and scanned PDF all give friendly messages; paste limit; basic analysis from a PDF and from pasted text; preview, tick, untick-to-revert, save with an edited name, linked job and version, "Open in builder" (aligned CV becomes the working CV, previous one auto-saved), job history. For the AI path a **local stand-in for the Anthropic API** was used (no real key was available when this was built), which checked: access code, consent, request headers and body, that no name, e-mail, phone, photo or links are sent, response parsing from a code-fenced reply, rejection of invalid ids and skills, advice-only suggestions, an edited rewrite, and the friendly messages for failing (500), busy (429), rejected key (401) and unreadable replies, plus fall-back to the basic check and the rate limit. For tailoring the same stand-in checked: the chosen master profile (not the working CV) is what is sent, invented ids and skills are dropped, flagged wording starts off, an edited bullet and a re-enabled flagged summary end up in the saved version, left-out items are gone, the base CV and working CV stay unchanged, the version is marked Tailored and linked to the job, the viewer exports PDF, PowerPoint, Word, HTML, text, JSON and LinkedIn text containing the tailored wording, loading it into the builder works, and a failing AI shows a friendly message. **Not tested: a real Claude or OpenAI call**, so do one analysis after adding your key and tell me if anything looks off.
