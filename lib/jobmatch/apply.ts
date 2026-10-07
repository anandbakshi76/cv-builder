import { nonBlank } from "../cv";
import type { CVData } from "../types";
import type { Op } from "./types";

/* Applying suggestions. Only the five kinds in `Op` exist, and they are re-orderings or reviewed text: applying them
   can never add a fact that is not already in the CV. Always works on a copy; the caller's CV is not changed. */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** `order` first (in that order), then everything else in its original order. */
export function reorderBy<T>(items: T[], key: (x: T) => string, order: string[]): T[] {
  const rank = new Map(order.map((k, i) => [k, i]));
  const first = items.filter((x) => rank.has(key(x))).sort((a, b) => (rank.get(key(a)) as number) - (rank.get(key(b)) as number));
  return [...first, ...items.filter((x) => !rank.has(key(x)))];
}

function reorderIndexes<T>(items: T[], order: number[]): T[] {
  const seen = new Set<number>();
  const first: T[] = [];
  for (const i of order) if (i >= 0 && i < items.length && !seen.has(i)) (seen.add(i), first.push(items[i]));
  return [...first, ...items.filter((_, i) => !seen.has(i))];
}

export function applyOp(cv: CVData, op: Op): CVData {
  const out = clone(cv);
  switch (op.kind) {
    case "reorder_skills":
      out.skills[op.group] = reorderBy(out.skills[op.group], (s) => s, op.order);
      break;
    case "reorder_items":
      (out[op.section] as { id: string }[]) = reorderBy(out[op.section] as { id: string }[], (x) => x.id, op.order);
      break;
    case "reorder_bullets": {
      const item = (out[op.section] as any[]).find((x) => x.id === op.itemId);
      if (item) {
        const key = op.section === "projects" ? "details" : "responsibilities";
        item[key] = reorderIndexes(item[key] as string[], op.order);
      }
      break;
    }
    case "rewrite_summary":
      out.summary = op.text.trim();
      break;
    case "rewrite_headline":
      out.header.headline = op.text.trim();
      break;
  }
  return out;
}

export const applyOps = (cv: CVData, ops: Op[]): CVData => ops.reduce(applyOp, cv);

const nameOf = (section: string, x: any): string => (section === "projects" ? x.name : section === "awards" ? x.title : section === "extracurricular" ? x.activity : x.title || x.company) || "(untitled)";

/** Human-readable before and after for one change (lists in order, or the old and new text). */
export function previewOp(cv: CVData, op: Op): { title: string; before: string[]; after: string[]; text: boolean } {
  const after = applyOp(cv, op);
  switch (op.kind) {
    case "reorder_skills":
      return { title: `Skills (${op.group})`, before: cv.skills[op.group], after: after.skills[op.group], text: false };
    case "reorder_items":
      return { title: op.section[0].toUpperCase() + op.section.slice(1), before: (cv[op.section] as any[]).map((x) => nameOf(op.section, x)), after: (after[op.section] as any[]).map((x) => nameOf(op.section, x)), text: false };
    case "reorder_bullets": {
      const a = (cv[op.section] as any[]).find((x) => x.id === op.itemId);
      const b = (after[op.section] as any[]).find((x) => x.id === op.itemId);
      const key = op.section === "projects" ? "details" : "responsibilities";
      return { title: `Bullets: ${nameOf(op.section, a)}`, before: nonBlank(a?.[key] ?? []), after: nonBlank(b?.[key] ?? []), text: false };
    }
    case "rewrite_summary":
      return { title: "Professional summary", before: [cv.summary || "(empty)"], after: [op.text], text: true };
    case "rewrite_headline":
      return { title: "Headline", before: [cv.header.headline || "(empty)"], after: [op.text], text: true };
  }
}

/** Everything that differs between two CVs, section by section, for the before/after panel. */
export interface ChangeLine {
  section: string;
  before: string[];
  after: string[];
  text: boolean;
}
export function compareCvs(a: CVData, b: CVData): ChangeLine[] {
  const out: ChangeLine[] = [];
  const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
  if (a.header.headline !== b.header.headline) out.push({ section: "Headline", before: [a.header.headline || "(empty)"], after: [b.header.headline || "(empty)"], text: true });
  if (a.summary !== b.summary) out.push({ section: "Professional summary", before: [a.summary || "(empty)"], after: [b.summary || "(empty)"], text: true });
  for (const g of ["technical", "soft", "languages"] as const) if (!same(a.skills[g], b.skills[g])) out.push({ section: `Skills (${g})`, before: a.skills[g], after: b.skills[g], text: false });
  for (const s of ["projects", "experience", "internships", "awards", "extracurricular"] as const) {
    const an = (a[s] as any[]).map((x) => nameOf(s, x));
    const bn = (b[s] as any[]).map((x) => nameOf(s, x));
    if (!same(an, bn)) out.push({ section: s[0].toUpperCase() + s.slice(1), before: an, after: bn, text: false });
    if (s === "projects" || s === "experience" || s === "internships") {
      const key = s === "projects" ? "details" : "responsibilities";
      (a[s] as any[]).forEach((x) => {
        const y = (b[s] as any[]).find((z) => z.id === x.id);
        if (y && !same(x[key], y[key])) out.push({ section: `Bullets: ${nameOf(s, x)}`, before: nonBlank(x[key]), after: nonBlank(y[key]), text: false });
      });
    }
  }
  return out;
}
