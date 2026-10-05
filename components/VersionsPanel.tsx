"use client";
import { useState } from "react";
import { approxKb, formatWhen, sameCv, STORAGE_WARN_KB, type SavedVersion } from "@/lib/versions";
import type { CVData } from "@/lib/types";
import { btnPrimary, btnSecondary, Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  data: CVData;
  versions: SavedVersion[];
  loaded?: SavedVersion;
  modified: boolean;
  onSave: (name: string) => boolean;
  onLoad: (v: SavedVersion) => void;
  onDelete: (id: string) => void;
}

/** Collapsible version-history sidebar: save named snapshots, load or delete them. */
export function VersionsPanel({ open, onClose, data, versions, loaded, modified, onSave, onLoad, onDelete }: Props) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<SavedVersion | null>(null);

  if (!open) return null;

  const startSave = () => {
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    setName(`${data.header.name.trim() || "CV"} - ${today}`);
    setNaming(true);
  };

  return (
    <>
      <aside
        aria-label="Version history"
        data-testid="versions-panel"
        className="no-print fixed inset-y-0 right-0 z-40 flex w-[min(22rem,100vw)] flex-col bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Versions</h2>
          <button type="button" onClick={onClose} aria-label="Close version history" className="cursor-pointer rounded-full px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ×
          </button>
        </div>

        <div className="border-b border-slate-100 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Current version</p>
          <p className="font-semibold text-slate-800" data-testid="current-version-label">
            {loaded ? loaded.name : "Working copy (not saved as a version)"}
          </p>
          {loaded && modified && <p className="text-xs text-amber-700">Edited since this version was saved.</p>}
          <button type="button" onClick={startSave} className={`${btnPrimary} mt-3 w-full`}>
            Save Version
          </button>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {versions.length === 0 && <li className="px-1 text-sm text-slate-500">No saved versions yet. Save one before you tailor the CV for a job, so you can come back to it.</li>}
          {versions.map((v) => {
            const isCurrent = sameCv(v.data, data);
            return (
              <li key={v.id} className={`rounded-xl border p-3 text-sm ${isCurrent ? "border-[var(--accent)] bg-[var(--tint)]" : "border-slate-200"}`}>
                <p className="break-words font-semibold text-slate-800">{v.name}</p>
                <p className="text-xs text-slate-500">{formatWhen(v.savedAt)}</p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  {isCurrent && <span className="rounded bg-[var(--ink)] px-1.5 py-0.5 text-white">Current</span>}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">Saved</span>
                  {v.exportedAt && (
                    <span title={`Last exported ${formatWhen(v.exportedAt)}`} className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                      Exported
                    </span>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => onLoad(v)} disabled={isCurrent} className={`${btnSecondary} px-3 py-1 text-xs`}>
                    {isCurrent ? "Loaded" : "Load"}
                  </button>
                  <button type="button" onClick={() => setToDelete(v)} className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                    Delete Version
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <p>
            {versions.length} {versions.length === 1 ? "version" : "versions"}, about {approxKb(versions)} KB, stored in this browser. There is no limit on how many you keep.
          </p>
          {approxKb(versions) > STORAGE_WARN_KB && (
            <p className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-900">
              Browser storage is getting full (about 5 MB in total). Delete versions you no longer need, or save a JSON backup first (Export As → JSON).
            </p>
          )}
        </div>
      </aside>

      {naming && (
        <Modal title="Save version" onClose={() => setNaming(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && onSave(name)) setNaming(false);
            }}
          >
            <label className="block">
              <span className="font-medium text-slate-800">Version name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="e.g. Python Dev - TechStartup"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setNaming(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={!name.trim()} className={btnPrimary}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete version?" onClose={() => setToDelete(null)}>
          <p>
            Delete <strong>{toDelete.name}</strong>? This cannot be undone. Your current CV is not affected.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setToDelete(null)} className={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(toDelete.id);
                setToDelete(null);
              }}
              className="cursor-pointer rounded-full bg-red-700 px-4 py-1.5 font-medium text-white hover:brightness-110"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
