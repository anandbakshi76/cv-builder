import { displayUrl, expectedGraduation, nonBlank } from "../cv";
import { fmtDay, fmtMonth, fmtRange } from "../dates";
import type { CVData } from "../types";

/** What to include in an export. Mirrors the "Print options" toggles. */
export interface ExportOptions {
  photo: boolean;
  personal: boolean;
}

/** A labelled detail under an entry, e.g. "Key Technologies" (text) or "Outcomes & Accomplishments" (items). */
export interface Detail {
  label: string;
  text?: string;
  items?: string[];
}

export interface Entry {
  title: string;
  subtitle?: string;
  date?: string;
  lines?: string[];
  bullets?: string[];
  details?: Detail[];
}

export interface Section {
  heading: string;
  paragraph?: string;
  entries?: Entry[];
  /** Plain label/value lines (skills, personal details, "Other courses:" ...) */
  lines?: { label?: string; value: string }[];
}

export interface DocModel {
  name: string;
  headline: string;
  highlights: string;
  contact: string[];
  links: { label: string; url: string }[];
  facts: string[];
  /** Data URL of the photo, only when the photo option is on */
  photo: string;
  sections: Section[];
}

const t = (s: string) => s.trim();

/**
 * One neutral description of the CV in reading order, built with the same rules as View mode:
 * empty entries and sections are skipped, hidden certifications/trainings stay out, "folded" ones become an
 * "Other ..." line, and the optional blocks follow the options. Word, text and LinkedIn exports render this.
 */
export function buildModel(cv: CVData, opts: ExportOptions): DocModel {
  const h = cv.header;
  const sections: Section[] = [];
  const add = (s: Section) => {
    const has = s.paragraph || (s.entries && s.entries.length) || (s.lines && s.lines.length);
    if (has) sections.push(s);
  };

  add({
    heading: "Key Highlights",
    lines: cv.stats.filter((x) => t(x.value) || t(x.label)).map((x) => ({ value: [t(x.value), t(x.label)].filter(Boolean).join(" - ") })),
  });
  add({ heading: "Professional Summary", paragraph: t(cv.summary) });

  add({
    heading: "Education",
    entries: cv.education
      .filter((e) => t(e.degree) || t(e.institution))
      .map((e) => ({
        title: t(e.degree),
        subtitle: t(e.institution),
        date: e.current ? `Expected graduation: ${expectedGraduation(e.yearOfStudy, e.courseLength)}` : fmtMonth(e.end),
        lines: [
          e.current ? `Year ${e.yearOfStudy} of ${e.courseLength}` : "",
          t(e.grades) && `Grades: ${t(e.grades)}`,
          t(e.coursework) && `Relevant coursework: ${t(e.coursework)}`,
          t(e.notes),
        ].filter(Boolean) as string[],
      })),
  });

  const roleEntries = (list: CVData["experience"]): Entry[] =>
    list
      .filter((x) => t(x.title) || t(x.company) || nonBlank(x.responsibilities).length)
      .map((x) => ({
        title: t(x.title),
        subtitle: t(x.company),
        date: fmtRange(x.from, x.to),
        bullets: nonBlank(x.responsibilities).map(t),
        details: [
          x.technologies.length ? { label: "Key Technologies", text: x.technologies.join(", ") } : null,
          x.skills.length ? { label: "Skills", text: x.skills.join(", ") } : null,
          nonBlank(x.outcomes).length ? { label: "Outcomes & Accomplishments", items: nonBlank(x.outcomes).map(t) } : null,
        ].filter(Boolean) as Detail[],
      }));
  add({ heading: "Work Experience", entries: roleEntries(cv.experience) });
  add({ heading: "Internships", entries: roleEntries(cv.internships) });

  add({
    heading: "Projects",
    entries: cv.projects
      .filter((p) => t(p.name) || t(p.description))
      .map((p) => ({
        title: t(p.name),
        subtitle: t(p.organization),
        date: fmtRange(p.from, p.to),
        lines: [t(p.description)].filter(Boolean),
        bullets: nonBlank(p.details).map(t),
        details: [
          p.tech.length ? { label: "Tech Used", text: p.tech.join(", ") } : null,
          t(p.link) ? { label: "Link", text: displayUrl(p.link) } : null,
        ].filter(Boolean) as Detail[],
      })),
  });

  add({
    heading: "Skills",
    lines: [
      cv.skills.technical.length ? { label: "Technical", value: cv.skills.technical.join(", ") } : null,
      cv.skills.languages.length ? { label: "Languages", value: cv.skills.languages.join(", ") } : null,
      cv.skills.soft.length ? { label: "Soft skills", value: cv.skills.soft.join(", ") } : null,
    ].filter(Boolean) as { label: string; value: string }[],
  });

  // Certifications and trainings: own rows, folded "Other ..." lines, hidden ones skipped
  const certValidity = (c: CVData["certifications"][number]) =>
    c.lifetime ? `${c.validFrom ? `${fmtMonth(c.validFrom)} - ` : ""}Lifetime validity` : c.validFrom || c.validTill ? `Valid ${fmtRange(c.validFrom, c.validTill)}` : "";
  const folded = (name: string, meta: string[]) => {
    const m = meta.filter(Boolean).join(", ");
    return m ? `${name} (${m})` : name;
  };
  const certRows: Entry[] = cv.certifications
    .filter((c) => c.display === "row" && t(c.name))
    .map((c) => ({ title: t(c.name), subtitle: t(c.issuer), date: certValidity(c) }));
  const trainRows: Entry[] = cv.trainings
    .filter((x) => x.display === "row" && t(x.name))
    .map((x) => ({ title: t(x.name), subtitle: t(x.provider), date: fmtMonth(x.completed), lines: t(x.description) ? [t(x.description)] : [] }));
  const certFolded = cv.certifications.filter((c) => c.display === "line" && t(c.name)).map((c) => folded(t(c.name), [t(c.issuer), fmtMonth(c.validFrom)]));
  const trainFolded = cv.trainings.filter((x) => x.display === "line" && t(x.name)).map((x) => folded(t(x.name), [t(x.provider), fmtMonth(x.completed)]));
  // Labels carry no colon: every renderer adds its own ("Other certifications: ...").
  const foldedLines = (c: string[], tr: string[]) =>
    [
      c.length ? { label: "Other certifications", value: c.join(", ") } : null,
      tr.length ? { label: "Other Trainings", value: tr.join(", ") } : null,
    ].filter(Boolean) as { label: string; value: string }[];

  if (cv.mergeCertTraining) {
    add({ heading: "Certifications & Training", entries: [...certRows, ...trainRows], lines: foldedLines(certFolded, trainFolded) });
  } else {
    add({ heading: "Certifications", entries: certRows, lines: foldedLines(certFolded, []) });
    add({ heading: "Training & Courses", entries: trainRows, lines: foldedLines([], trainFolded) });
  }

  add({
    heading: "Awards & Recognition",
    entries: cv.awards
      .filter((a) => t(a.title))
      .map((a) => ({ title: t(a.title), lines: [[fmtMonth(a.date), t(a.issuer), t(a.description)].filter(Boolean).join(" - ")].filter(Boolean) })),
  });
  add({
    heading: "Extracurricular & Volunteering",
    entries: cv.extracurricular
      .filter((x) => t(x.activity))
      .map((x) => ({ title: t(x.activity), date: fmtRange(x.from, x.to), lines: t(x.description) ? [t(x.description)] : [] })),
  });

  if (opts.personal) {
    add({
      heading: "Personal Details",
      lines: [
        h.dateOfBirth ? { label: "Date of birth", value: fmtDay(h.dateOfBirth) } : null,
        t(h.nationality) ? { label: "Nationality", value: t(h.nationality) } : null,
        t(h.address) ? { label: "Address", value: t(h.address) } : null,
      ].filter(Boolean) as { label: string; value: string }[],
    });
  }

  return {
    name: t(h.name),
    headline: t(h.headline),
    highlights: t(h.highlights),
    contact: [t(h.email), t(h.phone), t(h.location)].filter(Boolean),
    links: h.links.filter((l) => t(l.url)).map((l) => ({ label: l.platform, url: displayUrl(l.url) })),
    facts: [
      t(h.availability),
      t(h.workEligibility),
      t(h.visaStatus) && `Visa / work status: ${t(h.visaStatus)}`,
    ].filter(Boolean) as string[],
    photo: opts.photo && h.photo ? h.photo : "",
    sections,
  };
}
