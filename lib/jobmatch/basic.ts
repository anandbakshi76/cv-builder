import { newId } from "../defaults";
import type { CVData } from "../types";
import type { Analysis, MatchingProject, MissingSkill, Op, SkillMatch, Suggestion } from "./types";

/* Basic keyword matcher: works with no AI and no internet. It looks for known skill words in the job text and compares
   them with the CV. It is deliberately simple and says so ("basic"): it cannot read between the lines like an AI, but
   it gives an honest score and only suggests re-orderings. */

const TECH = [
  "python", "java", "javascript", "typescript", "react", "angular", "vue", "node.js", "nodejs", "next.js", "html", "css", "sass", "tailwind",
  "c++", "c#", ".net", "go", "golang", "rust", "php", "ruby", "swift", "kotlin", "scala", "r", "matlab", "bash", "powershell",
  "sql", "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis", "nosql", "oracle", "snowflake", "bigquery",
  "docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "devops", "git", "github", "gitlab", "linux", "unix",
  "aws", "azure", "gcp", "cloud", "serverless", "lambda",
  "rest", "api", "apis", "graphql", "microservices", "flask", "django", "fastapi", "spring", "express", "laravel",
  "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "machine learning", "deep learning", "nlp", "computer vision", "data science", "ai", "llm",
  "excel", "power bi", "tableau", "looker", "data analysis", "data visualisation", "data visualization", "statistics", "etl", "spark", "hadoop",
  "testing", "pytest", "junit", "selenium", "cypress", "unit testing", "tdd", "debugging", "agile", "scrum", "kanban", "jira", "confluence",
  "networking", "tcp/ip", "cyber security", "cybersecurity", "security", "encryption", "firewall", "iot", "embedded", "arduino", "raspberry pi",
  "algorithms", "data structures", "object-oriented", "oop", "design patterns", "version control", "figma", "ui", "ux",
];
const SOFT = [
  "communication", "teamwork", "team player", "leadership", "problem solving", "problem-solving", "time management", "customer service",
  "collaboration", "adaptability", "attention to detail", "organisation", "organization", "initiative", "creativity", "critical thinking", "presentation", "mentoring",
];
export const KNOWN_TERMS = [...new Set([...TECH, ...SOFT])];
const TERMS = KNOWN_TERMS;
const ALIASES: Record<string, string> = { nodejs: "node.js", postgres: "postgresql", apis: "api", cybersecurity: "cyber security", "problem-solving": "problem solving", "team player": "teamwork", organization: "organisation", "data visualization": "data visualisation", golang: "go" };
const canon = (t: string) => ALIASES[t] ?? t;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const countIn = (text: string, term: string): number => {
  const re = new RegExp(`(^|[^a-z0-9+#.])${esc(term)}(?![a-z0-9+#])`, "gi");
  return (text.match(re) ?? []).length;
};
const clean = (s: string) => s.toLowerCase().replace(/\[sample\]\s*/g, "").replace(/\s*\(.*?\)\s*/g, " ").trim();

function titleCompany(text: string): { title: string; company: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const find = (re: RegExp) => lines.map((l) => re.exec(l)?.[1]?.trim()).find(Boolean) ?? "";
  const title = find(/^(?:job title|position|role|vacancy)\s*[:\-]\s*(.{3,80})$/i) || (lines[0] && lines[0].length <= 80 ? lines[0] : "");
  const company = find(/^(?:company|employer|organisation|organization)\s*[:\-]\s*(.{2,60})$/i) || /\bat ([A-Z][\w&.' -]{2,40})/.exec(lines[0] ?? "")?.[1] || "";
  // "Python Developer - Acme Ltd" + company "Acme Ltd" -> title "Python Developer"
  const bare = company ? title.replace(new RegExp(String.raw`\s*(?:[-–—,|@:]|\bat\b)?\s*` + esc(company) + String.raw`\s*$`, "i"), "").trim() : title;
  return { title: (bare || title).slice(0, 80), company: company.slice(0, 60) };
}

export function basicAnalysis(cv: CVData, jobText: string): Analysis {
  const text = jobText.toLowerCase();
  // job terms with how often they appear
  const job = TERMS.map((t) => ({ term: t, n: countIn(text, t) })).filter((x) => x.n > 0);
  const merged = new Map<string, number>();
  for (const j of job) merged.set(canon(j.term), (merged.get(canon(j.term)) ?? 0) + j.n);

  // where the CV mentions each term
  const cvSkillTerms = new Set([...cv.skills.technical, ...cv.skills.soft].map(clean));
  const uses = (term: string) => {
    let n = 0;
    for (const p of cv.projects) if (p.tech.some((x) => canon(clean(x)) === term) || countIn(`${p.name} ${p.description} ${p.details.join(" ")}`.toLowerCase(), term)) n++;
    for (const e of [...cv.experience, ...cv.internships]) if (e.technologies.some((x) => canon(clean(x)) === term) || e.skills.some((x) => canon(clean(x)) === term) || countIn(`${e.title} ${e.responsibilities.join(" ")}`.toLowerCase(), term)) n++;
    return n;
  };
  const allCvText = JSON.stringify([cv.summary, cv.education, cv.skills, cv.certifications, cv.trainings, cv.awards, cv.extracurricular]).toLowerCase();
  const listed = (term: string) => [...cvSkillTerms].some((s) => canon(s) === term || s.split(/[\s,/]+/).map(canon).includes(term));

  const strong: SkillMatch[] = [];
  const weak: SkillMatch[] = [];
  const missing: MissingSkill[] = [];
  let got = 0;
  let total = 0;
  for (const [term, n] of [...merged.entries()].sort((a, b) => b[1] - a[1])) {
    const weight = Math.min(4, 1 + n);
    total += weight;
    const u = uses(term);
    const inList = listed(term);
    const label = term.length <= 3 ? term.toUpperCase() : term.replace(/\b\w/g, (c) => c.toUpperCase());
    if (u > 0 && inList) {
      const m = Math.min(95, 75 + u * 8);
      strong.push({ skill: label, match: m, evidence: `Listed in your skills and used in ${u} project${u === 1 ? "" : "s"} or role${u === 1 ? "" : "s"}; the job mentions it ${n} time${n === 1 ? "" : "s"}.` });
      got += weight;
    } else if (u > 0 || inList) {
      const m = u > 0 ? 60 : 55;
      weak.push({ skill: label, match: m, evidence: u > 0 ? `Used in ${u} place${u === 1 ? "" : "s"} but not listed in your skills; the job mentions it ${n} time${n === 1 ? "" : "s"}.` : `Listed in your skills but with no project or role showing it; the job mentions it ${n} time${n === 1 ? "" : "s"}.` });
      got += weight * 0.6;
    } else if (countIn(allCvText, term) > 0) {
      weak.push({ skill: label, match: 35, evidence: `Mentioned only in passing in your CV; the job mentions it ${n} time${n === 1 ? "" : "s"}.` });
      got += weight * 0.35;
    } else {
      missing.push({ skill: label, reason: `The job mentions it ${n} time${n === 1 ? "" : "s"} and it is not in your CV.` });
    }
  }
  const score = total ? Math.round((got / total) * 100) : 0;

  // suggestions: re-orderings only
  const rank = (s: string) => merged.get(canon(clean(s))) ?? [...merged.keys()].filter((k) => clean(s).split(/[\s,/]+/).map(canon).includes(k)).length * 0.5;
  const suggestions: Suggestion[] = [];
  const add = (action: Suggestion["action"], section: string, detail: string, op: Op) => suggestions.push({ id: newId(), action, section, detail, op, needsReview: false });
  for (const g of ["technical", "soft"] as const) {
    const cur = cv.skills[g];
    const order = [...cur].sort((a, b) => rank(b) - rank(a));
    if (order.some((x, i) => x !== cur[i]) && order.some((x) => rank(x) > 0)) add("reorder", "skills", `Put the ${g} skills the job asks for first (${order.filter((x) => rank(x) > 0).slice(0, 3).join(", ")}).`, { kind: "reorder_skills", group: g, order });
  }
  const score1 = (txt: string) => [...merged.entries()].reduce((n, [t, c]) => n + (countIn(txt.toLowerCase(), t) ? Math.min(3, c) : 0), 0);
  const matching: MatchingProject[] = [];
  for (const p of cv.projects) {
    const hits = [...merged.keys()].filter((t) => p.tech.some((x) => canon(clean(x)) === t) || countIn(`${p.name} ${p.description} ${p.details.join(" ")}`.toLowerCase(), t));
    if (hits.length) matching.push({ name: p.name || "(untitled)", relevance: `uses ${hits.slice(0, 4).join(", ")}` });
  }
  for (const sec of ["projects", "experience", "internships"] as const) {
    const items = cv[sec] as any[];
    if (items.length < 2) continue;
    const text1 = (x: any) => `${x.name ?? ""} ${x.title ?? ""} ${x.description ?? ""} ${(x.details ?? x.responsibilities ?? []).join(" ")} ${(x.tech ?? x.technologies ?? []).join(" ")}`;
    const order = [...items].sort((a, b) => score1(text1(b)) - score1(text1(a))).map((x) => x.id);
    if (order.some((id, i) => id !== items[i].id) && score1(text1(items[0])) < score1(text1(items.find((x) => x.id === order[0])))) add("highlight", sec, `Show the ${sec === "projects" ? "projects" : "roles"} closest to this job first.`, { kind: "reorder_items", section: sec, order });
  }
  for (const sec of ["projects", "experience", "internships"] as const) {
    for (const x of cv[sec] as any[]) {
      const key = sec === "projects" ? "details" : "responsibilities";
      const bullets: string[] = x[key];
      if (bullets.length < 2) continue;
      const idx = bullets.map((_, i) => i).sort((a, b) => score1(bullets[b]) - score1(bullets[a]));
      if (idx.some((v, i) => v !== i) && score1(bullets[idx[0]]) > score1(bullets[0])) add("highlight", sec, `In "${x.name || x.title}", lead with the bullets that match the job.`, { kind: "reorder_bullets", section: sec, itemId: x.id, order: idx });
    }
  }

  const { title, company } = titleCompany(jobText);
  const note = merged.size === 0 ? "No known skill words were found in this text, so the score is 0. Try pasting the full job description." : `The job mentions ${merged.size} skill${merged.size === 1 ? "" : "s"} I can recognise; ${strong.length} ${strong.length === 1 ? "is" : "are"} well covered by your CV, ${weak.length} partly, and ${missing.length} ${missing.length === 1 ? "is" : "are"} missing. This is a basic keyword check: an AI analysis reads the job more carefully.`;
  return { matchScore: score, matchPercentage: `${score}%`, strongMatches: strong.slice(0, 8), weakMatches: weak.slice(0, 6), missingSkills: missing.slice(0, 6), suggestedChanges: suggestions.slice(0, 8), matchingProjects: matching.slice(0, 6), analysis: note, job: { title, company }, source: "basic" };
}
