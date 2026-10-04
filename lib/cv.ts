import type { CVData } from "./types";

const filled = (...v: string[]) => v.some((s) => s.trim() !== "");

/** Per-section "has content" checks. Empty sections are hidden in preview mode. */
export const has = {
  stats: (d: CVData) => d.stats.some((x) => filled(x.value, x.label)),
  summary: (d: CVData) => filled(d.summary),
  education: (d: CVData) => d.education.length > 0,
  skills: (d: CVData) => d.skills.technical.length + d.skills.languages.length + d.skills.soft.length > 0,
  experience: (d: CVData) => d.experience.length > 0,
  internships: (d: CVData) => d.internships.length > 0,
  projects: (d: CVData) => d.projects.length > 0,
  certifications: (d: CVData) => d.certifications.some((x) => x.display !== "hide"),
  trainings: (d: CVData) => d.trainings.some((x) => x.display !== "hide"),
  awards: (d: CVData) => d.awards.length > 0,
  extracurricular: (d: CVData) => d.extracurricular.length > 0,
};

export const hasHeader = (d: CVData) =>
  filled(d.header.name, d.header.headline, d.header.highlights, d.header.availability, d.header.workEligibility, d.header.nationality, d.header.visaStatus, d.header.email, d.header.phone, d.header.location, d.header.dateOfBirth, d.header.address, d.header.photo) ||
  d.header.links.length > 0;

/**
 * UK academic year starts in September. Year 1 started in the current
 * academic year's September; graduation is June after the final year.
 */
export function expectedGraduation(yearOfStudy: number, courseLength: number, now = new Date()): string {
  const academicStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const startYear = academicStart - (yearOfStudy - 1);
  return `Jun ${startYear + courseLength}`;
}

export function hrefFor(link: string): string {
  const t = link.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** "https://www.linkedin.com/in/anand/" -> "linkedin.com/in/anand" */
export const displayUrl = (link: string) => link.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

export const nonBlank = (items: string[]) => items.filter((s) => s.trim() !== "");
