"use client";
import { useCallback, useEffect, useState } from "react";
import { loadVersions, persistVersions, sameCv, withNewVersion, type SavedVersion } from "./versions";
import type { CVData } from "./types";

/**
 * Version history: save named snapshots of the CV, load, delete, and mark the one that was exported.
 * `data` is the live CV; `notify` shows short messages (toast).
 */
export function useVersions(data: CVData | null, notify: (message: string) => void) {
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  /** The version the user last saved or loaded in this session (used for the "current version" label) */
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    setVersions(loadVersions());
  }, []);

  const commit = useCallback(
    (list: SavedVersion[]) => {
      const error = persistVersions(list);
      if (error) {
        notify(error);
        return false;
      }
      setVersions(list);
      return true;
    },
    [notify],
  );

  const save = useCallback(
    (name: string): boolean => {
      if (!data) return false;
      const { list, created } = withNewVersion(versions, name, data);
      if (!commit(list)) return false;
      setLoadedId(created.id);
      notify(`Saved version "${created.name}".`);
      return true;
    },
    [data, versions, commit, notify],
  );

  const remove = useCallback(
    (id: string) => {
      const v = versions.find((x) => x.id === id);
      if (!v) return;
      if (commit(versions.filter((x) => x.id !== id))) {
        if (loadedId === id) setLoadedId(null);
        notify(`Deleted "${v.name}".`);
      }
    },
    [versions, commit, loadedId, notify],
  );

  /** Call after any export: the saved version that equals the live CV is marked as exported. */
  const markExported = useCallback(() => {
    if (!data) return;
    const hit = versions.find((v) => sameCv(v.data, data));
    if (hit) commit(versions.map((v) => (v.id === hit.id ? { ...v, exportedAt: new Date().toISOString() } : v)));
  }, [data, versions, commit]);

  const current = data ? versions.find((v) => sameCv(v.data, data)) : undefined;
  const loaded = versions.find((v) => v.id === loadedId);
  const modified = !!loaded && !!data && !sameCv(loaded.data, data);

  return { versions, loadedId, setLoadedId, loaded, current, modified, save, remove, markExported };
}
