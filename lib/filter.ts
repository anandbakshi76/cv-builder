import type { ExperienceItem, ProjectItem } from "./types";

/** Skill filter used by View mode. State is not saved: it only exists while the page is open. */
export interface SkillFilter {
  /** Skills the viewer has clicked, in click order (OR logic: an item matches if it mentions ANY of them) */
  selected: string[];
  toggle: (skill: string) => void;
  /** false = matching items are highlighted and the rest dimmed; true = non-matching items are hidden */
  onlyMatches: boolean;
}

export type FxState = "hit" | "dim" | "hide";

export const sameSkill = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-term, case-insensitive mention. Letters, digits, "+" and "#" count as part of a term, so
 * "C" does not match "C++" or "C#", "Java" does not match "JavaScript", and "Node.js" matches itself.
 */
export function mentions(text: string, skill: string): boolean {
  const s = skill.trim();
  if (!s || !text) return false;
  return new RegExp(`(?<![A-Za-z0-9+#])${escapeRegExp(s)}(?![A-Za-z0-9+#])`, "i").test(text);
}

/** Which of the selected skills appear in any of the given text fields. */
export function matchedSkills(selected: string[], fields: string[]): string[] {
  const text = fields.filter((f) => f && f.trim()).join("\n");
  return selected.filter((skill) => mentions(text, skill));
}

/** Every piece of text that can mention a skill for an experience / internship entry. */
export const experienceFields = (x: ExperienceItem): string[] => [
  x.title,
  x.company,
  ...x.responsibilities,
  ...x.technologies,
  ...x.skills,
  ...x.outcomes,
];

/** ...and for a project. */
export const projectFields = (x: ProjectItem): string[] => [x.name, x.organization, x.description, ...x.details, ...x.tech];
