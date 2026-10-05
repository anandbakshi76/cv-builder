import { displayUrl, hrefFor, nonBlank } from "./cv";
import { fmtRange } from "./dates";
import { STORAGE_KEY } from "./defaults";
import { migrate } from "./migrate";
import type { CVData, ProjectItem } from "./types";

/* ---------------------------------------------------------------------------------------------
   Portfolio helpers (Phase 5). Everything here only READS the CV data; nothing writes to the CV builder's
   storage. Where the data comes from:
   1. "live": the CV saved in this browser by the CV builder (`cv-builder:v1`) - what the owner sees while editing;
   2. "published": the snapshot file `public/portfolio-cv.json` (a CV Builder JSON export) - what visitors see on a
      deployed site, because a visitor's browser has no copy of the owner's CV.
   --------------------------------------------------------------------------------------------- */

export const PUBLISHED_URL = "/portfolio-cv.json";

export type PortfolioSource = "live" | "published" | "none";

export function readLive(): CVData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function readPublished(): Promise<CVData | null> {
  try {
    const res = await fetch(PUBLISHED_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const obj = (await res.json()) as { cv?: unknown } | null;
    const candidate = obj && typeof obj === "object" && "cv" in obj ? obj.cv : obj;
    const c = candidate as { header?: unknown } | null;
    if (!c || typeof c !== "object" || !c.header) return null;
    return migrate(c);
  } catch {
    return null;
  }
}

/** A CV counts as "filled in" once it has a name; an untouched default CV should not hide the published snapshot. */
export const hasIdentity = (cv: CVData | null): cv is CVData => !!cv && cv.header.name.trim() !== "";

export interface ProjectView {
  id: string;
  name: string;
  organization: string;
  description: string;
  details: string[];
  tech: string[];
  date: string;
  /** raw link as typed, "" when none */
  link: string;
  href: string;
  linkLabel: string;
  isCode: boolean;
}

const t = (s: string) => s.trim();

export function projectViews(cv: CVData): ProjectView[] {
  return cv.projects
    .filter((p: ProjectItem) => t(p.name) || t(p.description))
    .map((p) => {
      const link = t(p.link);
      const host = displayUrl(link).toLowerCase();
      const isCode = /^(github\.com|gitlab\.com|bitbucket\.org)/.test(host);
      return {
        id: p.id,
        name: t(p.name),
        organization: t(p.organization),
        description: t(p.description),
        details: nonBlank(p.details).map(t),
        tech: nonBlank(p.tech).map(t),
        date: fmtRange(p.from, p.to),
        link,
        href: link ? hrefFor(link) : "",
        linkLabel: link ? (isCode ? "View code" : "Live demo") : "",
        isCode,
      };
    });
}

/** Most recent first (projects with an ongoing end date, then later start dates), at most `n`. */
export function featuredProjects(cv: CVData, n = 4): ProjectView[] {
  const key = (p: ProjectItem) => (p.to === "present" ? "9999-99" : p.to || p.from || "0000-00");
  const order = new Map(cv.projects.map((p) => [p.id, key(p)]));
  return projectViews(cv)
    .sort((a, b) => (order.get(b.id) ?? "").localeCompare(order.get(a.id) ?? ""))
    .slice(0, n);
}

export interface TechItem {
  name: string;
  /** how many projects / roles mention it (0 = listed as a skill only) */
  uses: number;
}

const techKey = (s: string) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/^\[sample\]\s*/i, "").trim();

/** Technical skills plus every technology named in projects and roles, ranked by how often they appear. */
export function techStack(cv: CVData): TechItem[] {
  const map = new Map<string, TechItem>();
  const add = (name: string, uses: number) => {
    const n = t(name);
    if (!n) return;
    const k = techKey(n);
    const cur = map.get(k);
    if (cur) cur.uses += uses;
    else map.set(k, { name: n, uses });
  };
  for (const s of cv.skills.technical) add(s, 0);
  for (const p of cv.projects) for (const x of p.tech) add(x, 1);
  for (const e of [...cv.experience, ...cv.internships]) for (const x of e.technologies) add(x, 1);
  // listed as a skill and used in a project ranks above used in a project only, which ranks above skill only
  const listed = new Set(cv.skills.technical.map((x) => techKey(x)));
  const score = (x: TechItem) => x.uses * 2 + (listed.has(techKey(x.name)) ? 1 : 0);
  return [...map.values()].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** Tech names that appear in projects (used by the Projects page filter). */
export function projectTechCounts(projects: ProjectView[]): TechItem[] {
  const map = new Map<string, TechItem>();
  for (const p of projects)
    for (const x of p.tech) {
      const k = techKey(x);
      const cur = map.get(k);
      if (cur) cur.uses++;
      else map.set(k, { name: x, uses: 1 });
    }
  return [...map.values()].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
}

export const sameTech = (a: string, b: string) => techKey(a) === techKey(b);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "CV";
