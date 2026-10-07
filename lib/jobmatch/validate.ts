import { newId } from "../defaults";
import type { CVData } from "../types";
import type { Analysis, MatchingProject, MissingSkill, Op, SkillMatch, Suggestion } from "./types";

/* Turns whatever the AI (or any other source) returned into a safe Analysis: numbers clamped, strings trimmed and
   shortened, lists capped, and every change that claims to be applicable checked against the real CV. Anything that
   does not check out stays as advice only. Nothing from the AI reaches the CV without passing through here. */

const str = (x: unknown, max = 400) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const num = (x: unknown) => {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};
const list = (x: unknown, n: number): any[] => (Array.isArray(x) ? x.slice(0, n) : []);

const SECTIONS = ["projects", "experience", "internships", "awards", "extracurricular"] as const;

/** Extracts the first JSON object from text (models sometimes wrap it in a code fence or a sentence). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The AI did not return JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

function idsOf(cv: CVData, section: (typeof SECTIONS)[number]): string[] {
  return (cv[section] as { id: string }[]).map((x) => x.id);
}

function checkOp(raw: any, cv: CVData): Op | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  switch (raw.kind) {
    case "reorder_skills": {
      const group = raw.group as "technical" | "soft" | "languages";
      if (group !== "technical" && group !== "soft" && group !== "languages") return undefined;
      const have = cv.skills[group];
      const order = list(raw.order, 60).filter((s): s is string => typeof s === "string" && have.includes(s));
      return order.length ? { kind: "reorder_skills", group, order } : undefined;
    }
    case "reorder_items": {
      if (!SECTIONS.includes(raw.section)) return undefined;
      const have = idsOf(cv, raw.section);
      const order = list(raw.order, 60).filter((s): s is string => typeof s === "string" && have.includes(s));
      return order.length ? { kind: "reorder_items", section: raw.section, order } : undefined;
    }
    case "reorder_bullets": {
      if (raw.section !== "projects" && raw.section !== "experience" && raw.section !== "internships") return undefined;
      const item = (cv[raw.section as "projects"] as any[]).find((x) => x.id === raw.itemId);
      if (!item) return undefined;
      const count: number = (raw.section === "projects" ? item.details : item.responsibilities).length;
      const order = list(raw.order, 40).filter((i): i is number => Number.isInteger(i) && i >= 0 && i < count);
      return order.length ? { kind: "reorder_bullets", section: raw.section, itemId: item.id, order } : undefined;
    }
    case "rewrite_summary": {
      const text = str(raw.text, 1200);
      return text ? { kind: "rewrite_summary", text } : undefined;
    }
    case "rewrite_headline": {
      const text = str(raw.text, 200);
      return text ? { kind: "rewrite_headline", text } : undefined;
    }
  }
  return undefined;
}

export function normalizeAnalysis(raw: unknown, cv: CVData, source: string): Analysis {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const score = num(r.matchScore ?? r.matchPercentage);
  const skill = (x: any): SkillMatch => ({ skill: str(x?.skill, 80), match: num(x?.match), evidence: str(x?.evidence) });
  const suggestions: Suggestion[] = list(r.suggestedChanges, 12)
    .map((x): Suggestion | null => {
      const detail = str(x?.detail);
      if (!detail) return null;
      const op = checkOp(x?.op, cv);
      const action = ["reorder", "highlight", "add", "rewrite"].includes(x?.action) ? x.action : op?.kind.startsWith("rewrite") ? "rewrite" : "reorder";
      return { id: newId(), action, section: str(x?.section, 40), detail, op, needsReview: !!op && op.kind.startsWith("rewrite") };
    })
    .filter((x): x is Suggestion => !!x);
  return {
    matchScore: score,
    matchPercentage: `${score}%`,
    strongMatches: list(r.strongMatches, 12).map(skill).filter((s) => s.skill),
    weakMatches: list(r.weakMatches, 12).map(skill).filter((s) => s.skill),
    missingSkills: list(r.missingSkills, 12)
      .map((x): MissingSkill => ({ skill: str(x?.skill, 80), reason: str(x?.reason) }))
      .filter((s) => s.skill),
    suggestedChanges: suggestions,
    matchingProjects: list(r.matchingProjects, 8)
      .map((x): MatchingProject => ({ name: str(x?.name, 120), relevance: str(x?.relevance) }))
      .filter((p) => p.name),
    analysis: str(r.analysis, 1200) || `Your CV is ${score}% aligned with this role.`,
    job: { title: str(r.job?.title, 120), company: str(r.job?.company, 120) },
    source,
  };
}
