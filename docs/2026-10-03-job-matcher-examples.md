# Job Matcher: worked examples

Both examples use the same sample CV (a first-year Computer Science with AI student; details in `docs/2026-10-03-job-matcher.md`) and were produced by running the real app. They use the **basic keyword check**, so they can be reproduced without an API key. An AI analysis gives richer wording and may suggest other changes (see "What an AI result looks like" at the end), but the screens, the one-click apply and the saved versions work the same way.

**The CV before any change**
- Technical skills: HTML, CSS, JavaScript, Python (learning), Git
- Soft skills: Leadership, Teamwork, Communication, Time management, Problem solving
- Projects: 1. Weather Dashboard (JavaScript, HTML, CSS; fetches data from a weather API) 2. Expense Tracker (Python, CSV, pytest, Git; bullets: "Stores data in CSV files", "Added 10 pytest tests", "Used Git for version control")

---

## Example 1: Python Developer (Graduate), Acme Ltd

Job text (shortened): build REST APIs with Python and Flask; SQL and PostgreSQL; Docker and AWS; Git and GitHub; tests with pytest; Agile / Scrum; good communication, teamwork, problem solving; JavaScript or React is a bonus.

**Result: 36% Match, "Weak match, needs re-ordering" (orange).**
- The job names 20 skills the app recognises: 3 are well covered, 6 partly, 11 are missing.
- **Strong:** Python (83%), JavaScript (83%), Git (83%).
- **Partial:** API (60%), pytest (60%), version control (60%), communication, teamwork, problem solving (55% each: listed in skills, no project shows them).
- **Missing:** React, SQL, PostgreSQL, Docker, GitHub, AWS. Not added to the CV; they are the things to learn next.
- **Projects that fit:** Weather Dashboard (uses JavaScript and an API); Expense Tracker (uses Python, Git, pytest, version control).

**Four suggestions, all re-orderings, ticked by default**
| # | Suggestion | Before | After |
|---|---|---|---|
| 1 | Put the technical skills the job asks for first (Python, JavaScript, Git) | HTML, CSS, JavaScript, Python (learning), Git | Python (learning), JavaScript, Git, HTML, CSS |
| 2 | Put the soft skills the job asks for first (Teamwork, Communication, Problem solving) | Leadership, Teamwork, Communication, Time management, Problem solving | Teamwork, Communication, Problem solving, Leadership, Time management |
| 3 | Show the projects closest to this job first | 1. Weather Dashboard, 2. Expense Tracker | 1. Expense Tracker, 2. Weather Dashboard |
| 4 | In "Expense Tracker", lead with the bullets that match the job | Stores data in CSV files / Added 10 pytest tests / Used Git for version control | Used Git for version control / Added 10 pytest tests / Stores data in CSV files |

**Saved version:** "Python Developer (Graduate) - Acme Ltd Job" (the name is pre-filled; the user can change it). The working CV is unchanged until "Open it in the CV builder" is pressed, which first saves the old CV as "Auto-saved before aligning ...". Unticking suggestion 4 before saving leaves the bullet order as it was and still keeps 1 to 3.

**What the user should do next:** the missing skills are real gaps. The honest moves are to learn SQL and Docker (the job mentions both several times) and add a small project showing them; not to add them to the skills list now.

---

## Example 2: Data Analyst Intern, Brightside Retail

Job text (shortened): clean and analyse sales data with Excel, SQL and Python (pandas); dashboards in Power BI or Tableau; present to non-technical colleagues; statistics, communication, attention to detail, time management; data visualisation is a plus.

**Result: 20% Match, "Major gaps" (red).**
- 11 recognised skills: 1 well covered, 2 partly, 8 missing.
- **Strong:** Python (83%). **Partial:** communication and time management (55%).
- **Missing:** SQL, pandas, Excel, Power BI, Tableau, data visualisation (among others).
- **Projects that fit:** Expense Tracker (uses Python).

**Three suggestions, all re-orderings**
| # | Suggestion | Before | After |
|---|---|---|---|
| 1 | Put the technical skills the job asks for first (Python) | HTML, CSS, JavaScript, Python (learning), Git | Python (learning), HTML, CSS, JavaScript, Git |
| 2 | Put the soft skills the job asks for first (Communication, Time management) | Leadership, Teamwork, Communication, Time management, Problem solving | Communication, Time management, Leadership, Teamwork, Problem solving |
| 3 | Show the projects closest to this job first | 1. Weather Dashboard, 2. Expense Tracker | 1. Expense Tracker, 2. Weather Dashboard |

**What this tells the user:** the red band is the honest message. Re-ordering helps a little, but this role needs data tools the CV does not show yet. A sensible plan is to apply anyway for roles closer to the CV, and to build a small data project (for example an Expense Tracker analysis with pandas and a chart) so that this kind of job moves into the orange or yellow band.

---

## Example 3: a tailored CV from a master profile (AI)
Base: the saved version "Master profile" (the sample CV above). Job: Example 1. These are the changes the AI plan contained in a test run with the local stand-in, to show how the review works (a real AI will word things differently):
| Change | Before | After | Flagged? |
|---|---|---|---|
| Headline | Master profile | Python and web developer in training seeking a graduate role | no, ticked |
| Summary | First-year Computer Science with AI student. | Computer Science student who has built 5 REST APIs with Flask and Docker and writes Python with pytest tests. | **yes, off**: "5", Flask, Docker, REST are not in the CV |
| Skills (technical) | HTML, CSS, JavaScript, Python (learning), Git | Python (learning), Git, JavaScript (an invented "Kubernetes" was thrown away) | no, ticked |
| Expense Tracker: description | A command-line app that totals spending by category. | A Python command-line app that totals spending by category, tested with pytest. | no, ticked |
| Expense Tracker: bullets | Stores data in CSV files / Added 10 pytest tests / Used Git for version control | Added 10 pytest tests to check the calculations / Stores data in CSV files / Used Git for version control | no, ticked (the 10 is in the CV) |
| Weather Dashboard | (in the CV) | left out of this CV | no, ticked |
| Award description | Awarded for top A-level results (Physics A*, ...) | Top 1% of 300 students for A-level results. | **yes, off**: "1%" and "300" are not in the CV |
| a "ghost project" with an id that does not exist | | thrown away | n/a |

The user kept everything that was ticked, switched the summary on after checking and edited one bullet, then saved. Result: a new version "Tailored: Python Developer (Graduate) - Acme Ltd (from Master profile)" marked Tailored, with one project (Expense Tracker, edited bullets), three technical skills, and the 5-APIs summary the user chose to keep; "Master profile" is exactly as before. It then opened in the viewer and exported as PDF, PowerPoint, Word, HTML, text, JSON and LinkedIn text, all containing the tailored wording and none containing the left-out project. (The invented "5 REST APIs" sentence is in this example only to show the flag: do not keep wording that is not true.)

---

## What an AI result looks like
With an API key the same page shows the AI's wording. The AI is asked for JSON of this shape (the app checks every part before showing it; ids, skills and bullet numbers must exist in the CV):

```json
{
  "matchScore": 72,
  "job": { "title": "Python Developer (Graduate)", "company": "Acme Ltd" },
  "strongMatches": [{ "skill": "Python", "match": 90, "evidence": "Used in the Expense Tracker project" }],
  "weakMatches": [{ "skill": "SQL", "match": 30, "evidence": "Not shown in any project" }],
  "missingSkills": [{ "skill": "Docker", "reason": "Required by the job but not in your CV" }],
  "matchingProjects": [{ "name": "Expense Tracker", "relevance": "Python, pytest and Git" }],
  "suggestedChanges": [
    { "action": "reorder", "section": "skills", "detail": "Put Python and Git first",
      "op": { "kind": "reorder_skills", "group": "technical", "order": ["Python (learning)", "Git", "JavaScript"] } },
    { "action": "rewrite", "section": "summary", "detail": "Mention Python and testing in the summary",
      "op": { "kind": "rewrite_summary", "text": "First-year Computer Science with AI student who writes Python with automated tests (pytest) and uses Git ..." } },
    { "action": "add", "section": "skills", "detail": "Docker would help (advice only: not in your CV, so it cannot be applied)" }
  ],
  "analysis": "Your CV is 72% aligned: Python, Git and testing are shown well; SQL, Docker and Flask are gaps."
}
```
(This sample was produced by the local stand-in used for testing, not by a real AI.) In the app: the two `op` suggestions are ticked or unticked as above (the summary rewrite starts **unticked** and editable), the "add Docker" advice has no tick box, and a suggestion whose `op` points at something that is not in the CV is shown as advice only. In a test, the user edited the rewritten summary before saving; the saved version contained the edited text, the re-ordered skills and projects, and nothing that was not in the original CV.
