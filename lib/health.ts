import { nonBlank } from "./cv";
import type { CVData } from "./types";

export interface HealthCheck {
  label: string;
  tip: string;
  points: number;
  ok: boolean;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/* ---------- UK spelling check (this CV is UK-first) ---------- */

/** Verb/noun stems that take -ise/-yse in UK English and -ize/-yze in US English. */
const IZE_STEMS =
  "organiz|analyz|optimiz|specializ|realiz|recogniz|utiliz|prioritiz|summariz|customiz|minimiz|maximiz|standardiz|categoriz|finaliz|emphasiz|visualiz|personaliz|synchroniz|digitiz|modeliz|initializ|normaliz|centraliz|authoriz|apologiz|capitaliz|memoriz";
const IZE_RE = new RegExp(`\\b(${IZE_STEMS})(e|es|ed|ing|ation|ations|er|ers)\\b`, "gi");

const US_WORDS: Record<string, string> = {
  color: "colour", colors: "colours", colored: "coloured", colorful: "colourful",
  center: "centre", centers: "centres", centered: "centred",
  favorite: "favourite", favorites: "favourites",
  behavior: "behaviour", behaviors: "behaviours",
  defense: "defence", labor: "labour", honor: "honour", honors: "honours", honored: "honoured",
  catalog: "catalogue", catalogs: "catalogues",
  traveling: "travelling", traveled: "travelled", modeling: "modelling", modeled: "modelled",
  labeled: "labelled", canceled: "cancelled", enrollment: "enrolment", fulfill: "fulfil",
  math: "maths", gray: "grey", neighbor: "neighbour", neighbors: "neighbours",
};

const SKIP_KEYS = new Set(["id", "photo", "url", "link", "platform", "theme", "email", "phone", "dateOfBirth", "schemaVersion"]);

function collectText(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectText(x, out));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!SKIP_KEYS.has(k)) collectText(x, out);
  }
  return out;
}

/** Flags US spellings in the user's own text, e.g. [["organization", "organisation"]]. */
export function ukSpellingIssues(d: CVData): [string, string][] {
  const text = collectText(d).join("\n");
  const found = new Map<string, string>();
  for (const m of text.matchAll(IZE_RE)) {
    const stem = m[1].toLowerCase();
    const word = m[0].toLowerCase();
    found.set(word, word.replace(stem, `${stem.slice(0, -1)}s`));
  }
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (US_WORDS[w]) found.set(w, US_WORDS[w]);
  }
  return [...found.entries()].slice(0, 6);
}

/* ---------- CV strength ---------- */

/** "Is this CV ready to get an interview?" checks, based on UK/US recruiter and ATS guidance. */
export function cvHealth(
  d: CVData,
  pages = 1,
): { score: number; checks: HealthCheck[]; advisories: string[] } {
  const h = d.header;
  const roles = [...d.experience, ...d.internships];
  const bulletCount = roles.reduce((n, r) => n + nonBlank(r.responsibilities).length, 0);
  const outcomes = roles.flatMap((r) => nonBlank(r.outcomes)).concat(d.projects.flatMap((p) => nonBlank(p.details)));
  const summaryWords = words(d.summary);
  const skillCount = d.skills.technical.length + d.skills.languages.length + d.skills.soft.length;

  const checks: HealthCheck[] = [
    { label: "Full name", tip: "Add your full name.", points: 10, ok: !!h.name.trim() },
    { label: "Target role", tip: "Add the role you are seeking under your name (recruiters scan this first).", points: 5, ok: !!h.headline.trim() },
    { label: "Key positions line", tip: "Add 3–4 impact words, e.g. Software Developer | AI Enthusiast | Fast Learner.", points: 5, ok: !!h.highlights.trim() },
    { label: "Email", tip: "Add a professional email address.", points: 10, ok: /\S+@\S+\.\S+/.test(h.email) },
    { label: "Phone", tip: "Add a phone number with country code.", points: 5, ok: !!h.phone.trim() },
    { label: "Location", tip: "Add your city (no full street address needed).", points: 5, ok: !!h.location.trim() },
    {
      label: "LinkedIn / GitHub / website",
      tip: "Add a LinkedIn, GitHub or portfolio link with a real URL.",
      points: 10,
      ok: h.links.some((l) => l.url.trim() && ["LinkedIn", "GitHub", "Website", "Portfolio"].includes(l.platform)),
    },
    {
      label: "Career Snapshot (20–80 words)",
      tip: "Write 2–3 sentences, roughly 20–80 words: who you are, what you bring, what you want.",
      points: 10,
      ok: summaryWords >= 20 && summaryWords <= 80,
    },
    { label: "Education", tip: "Add your education.", points: 5, ok: d.education.some((e) => e.degree.trim() && e.institution.trim()) },
    { label: "5+ skills", tip: "List at least 5 skills; recruiters and ATS match on them.", points: 10, ok: skillCount >= 5 },
    {
      label: "Experience or projects",
      tip: "Add at least one job, internship or project (university and personal projects count).",
      points: 15,
      ok: roles.some((r) => r.title.trim()) || d.projects.some((p) => p.name.trim()),
    },
    { label: "Action bullets", tip: "Give each role 2+ bullets starting with an action verb (Built, Led, Reduced…).", points: 5, ok: bulletCount >= 2 },
    { label: "A measurable result", tip: "Add at least one number: customers served, % improved, users, hours saved.", points: 5, ok: outcomes.some((o) => /\d/.test(o)) },
    {
      label: "Extra proof",
      tip: "Add a certification, training, award or activity to show initiative.",
      points: 5,
      ok: d.certifications.length + d.trainings.length + d.awards.length + d.extracurricular.length > 0,
    },
  ];

  const score = checks.reduce((n, c) => n + (c.ok ? c.points : 0), 0);

  // Advisories: not scored, but worth acting on.
  const advisories: string[] = [];
  if (pages > 2) advisories.push(`Your CV prints on ${pages} pages. UK CVs should be 2 pages at most: shorten older or weaker entries.`);
  if (h.dateOfBirth) {
    advisories.push("Date of birth is on your CV. UK and US employers don't need it (age-discrimination rules): remove it unless an application asks for it.");
  }
  for (const [us, uk] of ukSpellingIssues(d)) advisories.push(`UK spelling: "${us}" → "${uk}".`);

  return { score, checks, advisories };
}
