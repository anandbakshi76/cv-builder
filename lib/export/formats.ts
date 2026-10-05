import { displayUrl, expectedGraduation, nonBlank } from "../cv";
import { fmtMonth, fmtRange } from "../dates";
import { migrate } from "../migrate";
import type { CVData } from "../types";
import type { DocModel, Entry, Section } from "./model";

/** "Deekshan Bakshi" -> "Deekshan_Bakshi_CV" (first and last name; safe for file names). */
export function fileBase(name: string, suffix = "CV"): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.normalize("NFKD").replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  const person = parts.length > 1 ? `${parts[0]}_${parts[parts.length - 1]}` : parts[0] ?? "";
  return person ? `${person}_${suffix}` : suffix;
}

/* Plain text keeps to ASCII punctuation so every ATS, e-mail client and form field copes with it. */
const ascii = (s: string) => s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/•/g, "-");

function entryLines(e: Entry): string[] {
  const out: string[] = [];
  const head = [e.title, e.subtitle].filter(Boolean).join(", ");
  out.push(e.date ? `${head} | ${e.date}` : head);
  for (const l of e.lines ?? []) out.push(l);
  for (const b of e.bullets ?? []) out.push(`- ${b}`);
  for (const d of e.details ?? []) {
    if (d.text) out.push(`${d.label}: ${d.text}`);
    if (d.items?.length) {
      out.push(`${d.label}:`);
      d.items.forEach((i) => out.push(`- ${i}`));
    }
  }
  return out;
}

function sectionText(s: Section): string[] {
  const out = [s.heading.toUpperCase(), "-".repeat(s.heading.length)];
  if (s.paragraph) out.push(s.paragraph);
  (s.entries ?? []).forEach((e, i) => {
    if (i > 0) out.push("");
    out.push(...entryLines(e));
  });
  for (const l of s.lines ?? []) out.push(l.label ? `${l.label}: ${l.value}` : l.value);
  return out;
}

/** Plain-text CV: no formatting, clear section headers. For ATS forms, e-mail bodies and copy-paste. */
export function toPlainText(m: DocModel): string {
  const top: string[] = [m.name.toUpperCase()].filter((x) => x);
  if (m.headline) top.push(m.headline);
  if (m.highlights) top.push(m.highlights);
  if (m.contact.length) top.push(m.contact.join(" | "));
  for (const l of m.links) top.push(`${l.label}: ${l.url}`);
  if (m.facts.length) top.push(m.facts.join(" | "));
  const blocks = [top.join("\n"), ...m.sections.map((s) => sectionText(s).join("\n"))];
  return ascii(blocks.join("\n\n")) + "\n";
}

export const LINKEDIN_LIMITS = { headline: 220, about: 2600 };

/**
 * Text arranged for LinkedIn, one block per LinkedIn field/section, using LinkedIn's own field names so each
 * value can be pasted straight into the matching box. Includes the headline/About limits so nothing is silently cut.
 */
export function toLinkedIn(m: DocModel, cv: CVData): { headline: string; about: string; text: string } {
  const t = (s: string) => s.trim();
  const headlineSrc = m.highlights || m.headline;
  const headline = ascii(m.headline && m.highlights ? `${m.headline} | ${m.highlights}` : headlineSrc).slice(0, LINKEDIN_LIMITS.headline);

  const summary = m.sections.find((s) => s.heading === "Professional Summary")?.paragraph ?? "";
  const hl = m.sections.find((s) => s.heading === "Key Highlights")?.lines?.map((l) => l.value) ?? [];
  const aboutParts = [summary, hl.length ? `Highlights: ${hl.join("; ")}.` : "", m.facts.length ? m.facts.join(". ") + "." : ""].filter(Boolean);
  const about = ascii(aboutParts.join("\n\n")).slice(0, LINKEDIN_LIMITS.about);

  const bar = "=".repeat(60);
  const block = (title: string, body: string[]) => [bar, title, bar, ...body, ""];
  const numbered = (items: string[][]) => items.map((lines, i) => lines.filter(Boolean).map((l, j) => (j === 0 ? `${i + 1}. ${l}` : `   ${l}`)).join("\n")).join("\n\n");
  const field = (label: string, value: string | undefined) => (value && t(value) ? `${label}: ${t(value)}` : "");

  // Experience and internships
  const pick = (h: string) => m.sections.find((s) => s.heading === h);
  const roles = [...(pick("Work Experience")?.entries ?? []), ...(pick("Internships")?.entries ?? [])];
  const exp = numbered(
    roles.map((e) => {
      const lines = [field("Title", e.title), field("Company", e.subtitle), field("Dates", e.date), "Description:"];
      for (const b of e.bullets ?? []) lines.push(`- ${b}`);
      for (const d of e.details ?? []) {
        if (d.text) lines.push(`${d.label}: ${d.text}`);
        if (d.items?.length) {
          lines.push(`${d.label}:`);
          d.items.forEach((i) => lines.push(`- ${i}`));
        }
      }
      return lines;
    }),
  );

  // Education
  const edu = numbered(
    cv.education
      .filter((e) => t(e.degree) || t(e.institution))
      .map((e) => {
        const grad = e.current ? expectedGraduation(e.yearOfStudy, e.courseLength) : fmtMonth(e.end);
        const start = e.current ? `Sep ${Number(grad.slice(-4)) - e.courseLength}` : "";
        return [
          field("School", e.institution),
          field("Degree", e.degree),
          field("Start date", start),
          field(e.current ? "End date (expected)" : "End date", grad),
          field("Grade", e.grades),
          field("Description", [e.current ? `Year ${e.yearOfStudy} of ${e.courseLength}` : "", t(e.coursework) && `Relevant coursework: ${t(e.coursework)}`, t(e.notes)].filter(Boolean).join(". ")),
        ];
      }),
  );

  // Skills (technical + soft) and Languages are separate places on LinkedIn
  const seen = new Set<string>();
  const skills = [...cv.skills.technical, ...cv.skills.soft].filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));

  // Licenses & certifications, and courses
  const certs = numbered(
    cv.certifications
      .filter((c) => c.display !== "hide" && t(c.name))
      .map((c) => [
        field("Name", c.name),
        field("Issuing organization", c.issuer),
        field("Issue date", fmtMonth(c.validFrom)),
        c.lifetime ? "Expiration date: Does not expire" : field("Expiration date", fmtMonth(c.validTill)),
      ]),
  );
  const courses = cv.trainings
    .filter((x) => x.display !== "hide" && t(x.name))
    .map((x) => `- ${[t(x.name), [t(x.provider), fmtMonth(x.completed)].filter(Boolean).join(", ")].filter(Boolean).join(" (")}${t(x.provider) || fmtMonth(x.completed) ? ")" : ""}`);

  // Projects
  const projects = numbered(
    cv.projects
      .filter((p) => t(p.name))
      .map((p) => [
        field("Project name", p.name),
        field("Dates", fmtRange(p.from, p.to)),
        field("Associated with", p.organization),
        field("Description", p.description),
        ...nonBlank(p.details).map((d) => `- ${t(d)}`),
        field("Skills", p.tech.join(", ")),
        field("Project URL", p.link ? displayUrl(p.link) : ""),
      ]),
  );

  // Honours & awards and volunteering
  const awards = numbered(
    cv.awards
      .filter((a) => t(a.title))
      .map((a) => [field("Title", a.title), field("Issuer", a.issuer), field("Issue date", fmtMonth(a.date)), field("Description", a.description)]),
  );
  const volunteer = numbered(
    cv.extracurricular
      .filter((x) => t(x.activity))
      .map((x) => [field("Role / activity", x.activity), field("Dates", fmtRange(x.from, x.to)), field("Description", x.description)]),
  );

  const contact = [m.contact.length ? `Email / phone / location: ${m.contact.join(" | ")}` : "", ...m.links.map((l) => `${l.label}: ${l.url}`)].filter(Boolean);

  const lines: string[] = [
    "HOW TO USE: copy each block below and paste it into the matching part of your LinkedIn profile (edit profile > pencil icon).",
    "The field names (Title, Company, School, Issue date ...) match LinkedIn's own boxes.",
    "",
    ...block(`HEADLINE (${headline.length}/${LINKEDIN_LIMITS.headline} characters)`, [headline || "(add a headline or key-positions line in the CV)"]),
    ...block(`ABOUT (${about.length}/${LINKEDIN_LIMITS.about} characters)`, [about || "(add a Professional Summary in the CV)"]),
    ...(contact.length ? block("CONTACT INFO AND WEBSITES (Contact info on your profile)", contact) : []),
    ...block("EXPERIENCE (add one position per entry)", [exp || "(no experience or internships in the CV)"]),
    ...(edu ? block("EDUCATION (add one school per entry)", [edu]) : []),
    ...block("SKILLS (add each one under Skills)", [skills.length ? skills.join(", ") : "(no skills in the CV)"]),
    ...(cv.skills.languages.length ? block("LANGUAGES (Add profile section > Languages; choose a proficiency for each)", [cv.skills.languages.join(", ")]) : []),
    ...(certs ? block("LICENSES AND CERTIFICATIONS (add one per entry)", [certs]) : []),
    ...(courses.length ? block("COURSES (Add profile section > Courses)", courses) : []),
    ...(projects ? block("PROJECTS (Add profile section > Projects)", [projects]) : []),
    ...(awards ? block("HONOURS AND AWARDS (Add profile section > Honors & awards)", [awards]) : []),
    ...(volunteer ? block("VOLUNTEER EXPERIENCE (Add profile section > Volunteer experience)", [volunteer]) : []),
  ];
  return { headline, about, text: ascii(lines.join("\n")).trimEnd() + "\n" };
}

/** JSON backup: the whole CV plus a small header so an import can recognise the file. */
export function toJson(cv: CVData): string {
  return JSON.stringify({ app: "cv-builder", format: 1, exportedAt: new Date().toISOString(), cv }, null, 2) + "\n";
}

/** Read a JSON file produced by toJson (or a bare CV object) into valid CV data. Throws a readable Error on bad input. */
export function parseImport(text: string): CVData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const obj = raw as { cv?: unknown; header?: unknown } | null;
  const candidate = obj && typeof obj === "object" && "cv" in obj ? obj.cv : obj;
  const c = candidate as { header?: unknown; education?: unknown } | null;
  if (!c || typeof c !== "object" || !c.header || typeof c.header !== "object") {
    throw new Error("That JSON file does not look like a CV Builder export (no CV header found).");
  }
  return migrate(c);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const downloadText = (text: string, filename: string, type = "text/plain") =>
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
