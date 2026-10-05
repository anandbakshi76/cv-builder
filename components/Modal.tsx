"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Simple accessible dialog. It renders into #cv-root (not document.body) so the theme colour variables
 * (--accent, --ink, ...) still apply, and it is hidden when printing.
 */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHost(document.getElementById("cv-root") ?? document.body);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    box.current?.querySelector<HTMLElement>("input, textarea, button:not([data-close])")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!host) return null;
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-5 text-sm text-slate-700 shadow-2xl ring-1 ring-slate-200 ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close" className="cursor-pointer rounded-full px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    host,
  );
}

export const btnPrimary =
  "cursor-pointer rounded-full bg-[var(--ink)] px-4 py-1.5 font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary = "cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 font-medium text-slate-700 hover:bg-slate-50";
