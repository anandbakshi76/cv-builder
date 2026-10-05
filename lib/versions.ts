import { newId } from "./defaults";
import { migrate } from "./migrate";
import type { CVData } from "./types";

/** Saved versions live in their own localStorage key, so the working CV (`cv-builder:v1`) is untouched. */
export const VERSIONS_KEY = "cv-builder:versions:v1";
/** Browsers allow about 5 MB of localStorage per site, shared with the CV; the sidebar warns before this fills up. */
export const STORAGE_WARN_KB = 3500;

export interface SavedVersion {
  id: string;
  name: string;
  /** ISO timestamp */
  savedAt: string;
  /** ISO timestamp of the last export made while this version was the current CV */
  exportedAt?: string;
  data: CVData;
}

export function loadVersions(): SavedVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Partial<SavedVersion>[];
    if (!Array.isArray(list)) return [];
    return list
      .filter((v) => v && typeof v.id === "string" && typeof v.name === "string" && v.data)
      .map((v) => ({
        id: v.id as string,
        name: v.name as string,
        savedAt: typeof v.savedAt === "string" ? v.savedAt : new Date(0).toISOString(),
        exportedAt: typeof v.exportedAt === "string" ? v.exportedAt : undefined,
        data: migrate(v.data),
      }));
  } catch {
    return [];
  }
}

/** Returns an error message, or null when saved. Photos are large, so a full browser store is a real possibility. */
export function persistVersions(list: SavedVersion[]): string | null {
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(list));
    return null;
  } catch {
    return "The browser's storage is full. Delete a version or two (photos take the most space) and try again.";
  }
}

/** Newest first. There is no limit on how many versions you keep (only the browser's storage). */
export function withNewVersion(list: SavedVersion[], name: string, data: CVData): { list: SavedVersion[]; created: SavedVersion } {
  const created: SavedVersion = { id: newId(), name: name.trim(), savedAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(data)) };
  return { list: [created, ...list], created };
}

export const sameCv = (a: CVData, b: CVData) => JSON.stringify(a) === JSON.stringify(b);

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const approxKb = (list: SavedVersion[]) => Math.round(JSON.stringify(list).length / 1024);
