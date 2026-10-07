import { STORAGE_KEY } from "../defaults";
import { loadVersions, persistVersions, sameCv, withNewVersion } from "../versions";
import type { CVData } from "../types";
import type { JobRecord } from "./types";

/* Job descriptions, their analyses and the versions made from them live in this browser only (own key, so the CV and
   the saved versions are untouched by it). */

export const JOBS_KEY = "cv-builder:jobs:v1";
export const MAX_JOBS = 20;

export function loadJobs(): JobRecord[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    const list = raw ? (JSON.parse(raw) as JobRecord[]) : [];
    return Array.isArray(list) ? list.filter((j) => j && typeof j.id === "string" && typeof j.text === "string" && j.analysis) : [];
  } catch {
    return [];
  }
}

/** Newest first, at most MAX_JOBS kept. Returns an error message or null. */
export function saveJobs(list: JobRecord[]): string | null {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(list.slice(0, MAX_JOBS)));
    return null;
  } catch {
    return "The browser's storage is full. Delete an old job or a saved version and try again.";
  }
}

export function upsertJob(list: JobRecord[], job: JobRecord): JobRecord[] {
  return [job, ...list.filter((j) => j.id !== job.id)];
}

/** Saves a CV as a new named version linked to the job. `tailored` marks an AI-tailored CV (shown with a label in the
 *  Versions list). Returns the version id, or an error message. */
export function createAlignedVersion(name: string, cv: CVData, jobId: string, extra: { tailored?: boolean; basedOn?: string } = {}): { id: string } | { error: string } {
  const { list, created } = withNewVersion(loadVersions(), name, cv);
  Object.assign(created, { jobId, ...(extra.tailored ? { tailored: true, basedOn: extra.basedOn } : {}) });
  const err = persistVersions(list);
  return err ? { error: err } : { id: created.id };
}

/** Makes the aligned CV the working CV. The current working CV is saved as a version first unless it already is one. */
export function makeWorkingCopy(aligned: CVData, current: CVData | null): string | null {
  try {
    if (current) {
      const versions = loadVersions();
      if (!versions.some((v) => sameCv(v.data, current))) {
        const { list } = withNewVersion(versions, `Auto-saved before aligning - ${new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`, current);
        const err = persistVersions(list);
        if (err) return err;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aligned));
    return null;
  } catch {
    return "The browser's storage is full.";
  }
}
