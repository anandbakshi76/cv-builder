/* Job Matcher (Phase 6): shared types. The analysis comes either from an LLM (through /api/analyze-job) or from the
   built-in keyword matcher; both produce exactly this shape, so the screens do not care where it came from. */

export interface SkillMatch {
  skill: string;
  /** 0 to 100 */
  match: number;
  evidence: string;
}
export interface MissingSkill {
  skill: string;
  reason: string;
}

/** What a suggestion can do to the CV. Every kind is a pure re-ordering or an explicit text the user reviews;
 *  nothing here can add a skill, job or achievement the CV does not already contain. */
export type Op =
  | { kind: "reorder_skills"; group: "technical" | "soft" | "languages"; order: string[] }
  | { kind: "reorder_items"; section: "projects" | "experience" | "internships" | "awards" | "extracurricular"; order: string[] }
  | { kind: "reorder_bullets"; section: "projects" | "experience" | "internships"; itemId: string; order: number[] }
  | { kind: "rewrite_summary"; text: string }
  | { kind: "rewrite_headline"; text: string };

export interface Suggestion {
  id: string;
  /** reorder | highlight | add | rewrite: the label shown to the user */
  action: "reorder" | "highlight" | "add" | "rewrite";
  section: string;
  detail: string;
  /** machine-applicable change; absent = advice only (shown but cannot be applied with a click) */
  op?: Op;
  /** text changes must be reviewed: they start unticked and are editable */
  needsReview: boolean;
}

export interface MatchingProject {
  name: string;
  relevance: string;
}

export interface Analysis {
  matchScore: number;
  matchPercentage: string;
  strongMatches: SkillMatch[];
  weakMatches: SkillMatch[];
  missingSkills: MissingSkill[];
  suggestedChanges: Suggestion[];
  matchingProjects: MatchingProject[];
  analysis: string;
  job: { title: string; company: string };
  /** who produced this: the AI provider's name, or "basic" for the built-in keyword matcher */
  source: string;
}

export type Band = "strong" | "good" | "weak" | "major";
export const bandOf = (score: number): Band => (score >= 80 ? "strong" : score >= 50 ? "good" : score >= 30 ? "weak" : "major");
export const BAND_TEXT: Record<Band, string> = {
  strong: "Strong match",
  good: "Good match, room to improve",
  weak: "Weak match, needs reordering",
  major: "Major gaps",
};

/** A job description stored in this browser together with its analysis and the version made from it. */
export interface JobRecord {
  id: string;
  savedAt: string;
  title: string;
  company: string;
  fileName?: string;
  text: string;
  analysis: Analysis;
  versionId?: string;
  versionName?: string;
}

export const MAX_PASTE_CHARS = 5000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Text read from a file is cut to this many characters before it is analysed (about 3,000 words). */
export const MAX_JOB_CHARS = 20000;
