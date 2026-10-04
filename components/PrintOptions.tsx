"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PrintPrefs {
  /** colour = as on screen; bw = plain black & white, ATS-friendly */
  style: "colour" | "bw";
  /** Include the profile photo in the printout / PDF */
  photo: boolean;
  /** Include the Personal Details block (date of birth, address, nationality) */
  personal: boolean;
}

const KEY = "cv-builder:print-prefs:v1";
// Black & white without a photo is the safest default for ATS and UK applications.
const DEFAULTS: PrintPrefs = { style: "bw", photo: false, personal: true };

/** Print preferences live in their own localStorage key, so the saved CV data is unchanged. */
export function usePrintPrefs(): [PrintPrefs, (p: PrintPrefs) => void] {
  const [prefs, setPrefs] = useState<PrintPrefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<PrintPrefs>;
        setPrefs({ style: p.style === "colour" ? "colour" : "bw", photo: !!p.photo, personal: p.personal !== false });
      }
    } catch {
      /* storage blocked: keep defaults */
    }
  }, []);

  const update = useCallback((p: PrintPrefs) => {
    setPrefs(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  return [prefs, update];
}

/** Toolbar popover: print style and photo. */
export function PrintOptions({ prefs, onChange }: { prefs: PrintPrefs; onChange: (p: PrintPrefs) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choice = (value: PrintPrefs["style"], title: string, note: string) => (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 ${
        prefs.style === value ? "border-slate-700 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <input
        type="radio"
        name="print-style"
        checked={prefs.style === value}
        onChange={() => onChange({ ...prefs, style: value })}
        className="mt-1 cursor-pointer accent-[var(--accent)]"
      />
      <span>
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{note}</span>
      </span>
    </label>
  );

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
      >
        Print options{" "}
        <span className="text-xs text-slate-500">
          ({prefs.style === "bw" ? "B&W" : "Colour"}, {prefs.photo ? "photo" : "no photo"}{prefs.personal ? "" : ", no personal details"})
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Print options"
          className="absolute left-1/2 top-full z-30 mt-1 w-[min(23rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-slate-200"
        >
          <p className="mb-1.5 font-semibold text-slate-800">Print / Save as PDF style</p>
          <div className="space-y-2">
            {choice("bw", "Black & white (ATS-friendly)", "Plain text on white, no backgrounds or icons, 10.5pt body. Best for online applications.")}
            {choice("colour", "Colour (as on screen)", "Keeps your theme colours and header. Good for handing over in person.")}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.photo}
              onChange={(e) => onChange({ ...prefs, photo: e.target.checked })}
              className="cursor-pointer accent-[var(--accent)]"
            />
            <span>
              <span className="font-semibold text-slate-800">Include photo</span>
              <span className="block text-xs text-slate-500">Optional in the UK; usually left out in the US and for ATS uploads.</span>
            </span>
          </label>
          <label className="mt-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.personal}
              onChange={(e) => onChange({ ...prefs, personal: e.target.checked })}
              className="cursor-pointer accent-[var(--accent)]"
            />
            <span>
              <span className="font-semibold text-slate-800">Include personal details</span>
              <span className="block text-xs text-slate-500">Date of birth, address and nationality (the last block). Untick for ATS uploads.</span>
            </span>
          </label>
          <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
            In the print window set Destination to <strong>Save as PDF</strong> (the browser&apos;s own) and untick{" "}
            <strong>Headers and footers</strong>. Margins: <strong>Default</strong> for Colour (None would leave no top margin on pages 2 and 3);
            None or Default for Black &amp; white. These settings apply to Print and Ctrl+P.
          </p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            <strong>Do not use the &quot;Adobe PDF&quot; or &quot;Microsoft Print to PDF&quot; printers.</strong> They turn text into shapes, so
            recruiters&apos; ATS software cannot read the CV and links stop working.
          </p>
        </div>
      )}
    </div>
  );
}
