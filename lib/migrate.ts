import { blankEducation, blankExperience, defaultCV, newId } from "./defaults";
import { normDate as rawNormDate } from "./dates";
import { THEMES } from "./themes";
import type { CVData, Display, EducationItem, ExperienceItem } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * An earlier bug saved blank dates as "2001-01" (the browser parsed "" as Jan 2001). No real CV entry is dated
 * Jan 2001, so that exact value is treated as blank and repaired on load.
 */
const normDate = (v: unknown): string => {
  const n = rawNormDate(v);
  return n === "2001-01" ? "" : n;
};

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strs = (v: unknown): string[] => arr(v).filter((s) => typeof s === "string");
const disp = (v: unknown): Display => (v === "line" || v === "hide" ? v : "row");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function experience(list: unknown): ExperienceItem[] {
  return arr(list).map((x) => ({
    ...blankExperience(),
    id: str(x.id) || newId(),
    title: str(x.title),
    company: str(x.company),
    from: normDate(x.from),
    to: normDate(x.to),
    // v1 stored one free-text description; split it into bullets
    responsibilities: Array.isArray(x.responsibilities) ? strs(x.responsibilities) : lines(str(x.description)),
    technologies: strs(x.technologies),
    skills: strs(x.skills),
    outcomes: strs(x.outcomes),
  }));
}

function education(old: any): EducationItem[] {
  if (Array.isArray(old)) return old.map((e) => ({ ...blankEducation(), ...e, end: normDate(e.end) }));
  if (!old || typeof old !== "object") return defaultCV.education;
  // v1: single object with university/degree/previous*
  const items: EducationItem[] = [];
  if (str(old.university) || str(old.degree)) {
    items.push({
      ...blankEducation(),
      id: "edu-current",
      degree: str(old.degree),
      institution: str(old.university),
      current: true,
      yearOfStudy: Number(old.yearOfStudy) || 1,
      courseLength: Number(old.courseLength) || 4,
      grades: str(old.grades),
      coursework: str(old.coursework),
    });
  }
  if (str(old.previousInstitution) || str(old.previousQualification)) {
    const q = str(old.previousQualification);
    const g = str(old.previousGrade);
    items.push({
      ...blankEducation(),
      id: "edu-alevels",
      degree: g ? `${q} (Grade: ${g})` : q,
      institution: str(old.previousInstitution),
    });
  }
  return items;
}

/** Photo library: older saves have only `photo`, which becomes the first library entry. */
function photoFields(h: any): { photos: string[]; portfolioPhoto: string } {
  const isImg = (x: unknown): x is string => typeof x === "string" && x.startsWith("data:image");
  const cv = isImg(h?.photo) ? h.photo : "";
  const lib: string[] = [];
  for (const x of [cv, ...(Array.isArray(h?.photos) ? h.photos : [])]) if (isImg(x) && !lib.includes(x)) lib.push(x);
  const pf = isImg(h?.portfolioPhoto) && lib.includes(h.portfolioPhoto) ? h.portfolioPhoto : "";
  return { photos: lib, portfolioPhoto: pf };
}

/** Turns whatever is in localStorage (any earlier shape) into a valid CVData. */
export function migrate(raw: any): CVData {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    ...defaultCV,
    schemaVersion: 1,
    summary: str(p.summary),
    stats: arr(p.stats).map((x) => ({ id: str(x.id) || newId(), value: str(x.value), label: str(x.label) })),
    theme: typeof p.theme === "string" && p.theme in THEMES ? p.theme : defaultCV.theme,
    headerStyle: p.headerStyle === "classic" ? "classic" : "banner",
    header: {
      ...defaultCV.header,
      ...p.header,
      links: arr(p.header?.links).map((l) => ({ id: str(l.id) || newId(), platform: l.platform ?? "Other", url: str(l.url) })),
      ...photoFields(p.header),
    },
    education: education(p.education),
    skills: { ...defaultCV.skills, ...p.skills },
    experience: experience(p.experience),
    internships: experience(p.internships),
    projects: arr(p.projects).map((x) => ({
      id: str(x.id) || newId(),
      name: str(x.name),
      organization: str(x.organization),
      description: str(x.description),
      details: strs(x.details),
      tech: strs(x.tech),
      link: str(x.link),
      from: normDate(x.from ?? x.dates),
      to: normDate(x.to),
    })),
    mergeCertTraining: !!p.mergeCertTraining,
    certifications: arr(p.certifications).map((x) => ({
      id: str(x.id) || newId(),
      name: str(x.name),
      issuer: str(x.issuer),
      validFrom: normDate(x.validFrom ?? x.date),
      validTill: normDate(x.validTill),
      lifetime: !!x.lifetime,
      display: disp(x.display),
    })),
    trainings: arr(p.trainings).map((x) => ({
      id: str(x.id) || newId(),
      name: str(x.name),
      provider: str(x.provider),
      completed: normDate(x.completed),
      description: str(x.description),
      display: disp(x.display),
    })),
    awards: arr(p.awards).map((x) => ({
      id: str(x.id) || newId(),
      title: str(x.title),
      issuer: str(x.issuer),
      date: normDate(x.date),
      description: str(x.description),
    })),
    extracurricular: arr(p.extracurricular).map((x) => ({
      id: str(x.id) || newId(),
      activity: str(x.activity),
      description: str(x.description),
      from: normDate(x.from ?? x.duration),
      to: normDate(x.to),
    })),
  };
}
