"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import CvViewer from "@/components/portfolio/CvViewer";
import { readLive } from "@/lib/portfolio";
import { makeWorkingCopy } from "@/lib/jobmatch/storage";
import { THEMES } from "@/lib/themes";
import { formatWhen, loadVersions, type SavedVersion } from "@/lib/versions";

/* View and export a saved version (for example an AI-tailored CV from the Job Matcher) in every format, without
   touching the CV builder's working CV. /job-matcher/cv?id=<version id> */
export default function VersionViewerPage() {
  const [v, setV] = useState<SavedVersion | null | undefined>(undefined);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    setV(loadVersions().find((x) => x.id === id) ?? null);
  }, []);
  useEffect(() => {
    if (v) document.title = `${v.name} | Job Matcher`;
  }, [v]);

  if (v === undefined) return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-400">Loading…</div>;
  if (v === null)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg font-bold">That saved CV could not be found.</p>
        <p className="mt-2 text-sm text-slate-600">It may have been deleted from the Versions list.</p>
        <Link href="/job-matcher" className="mt-4 inline-block font-semibold text-teal-800 underline">
          Back to the Job Matcher
        </Link>
      </div>
    );

  const t = THEMES[v.data.theme] ?? THEMES.teal;
  const vars = { "--accent": t.accent, "--accent2": t.accent2, "--tint": t.tint, "--ink": t.ink, "--pf-gold": "#f2b84b", "--pf-on-gold": "#0b2f2c" } as React.CSSProperties;
  const openInBuilder = () => {
    if (!window.confirm("This makes this CV your working CV. Your current CV is saved as a version first. Continue?")) return;
    const err = makeWorkingCopy(v.data, readLive());
    if (err) return window.alert(err);
    window.location.href = "/";
  };

  return (
    <div style={vars} className="min-h-screen bg-slate-50 text-slate-800">
      <header className="print:hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink)]">Job Matcher</p>
            <h1 className="text-xl font-extrabold text-slate-900">{v.name}</h1>
            <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Saved {formatWhen(v.savedAt)}</span>
              {v.tailored && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">AI-tailored{v.basedOn ? ` from ${v.basedOn}` : ""}</span>}
              {!v.tailored && v.jobId && <span className="rounded bg-[var(--tint)] px-1.5 py-0.5 font-semibold text-[var(--ink)]">Aligned to a job</span>}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Actions">
            <button type="button" onClick={openInBuilder} className="cursor-pointer rounded-full bg-[var(--ink)] px-4 py-2 font-semibold text-white">
              Open in the CV builder
            </button>
            <Link href="/job-matcher" className="rounded-full border border-slate-300 px-4 py-2 font-semibold">
              ← Job Matcher
            </Link>
          </nav>
        </div>
      </header>
      <CvViewer cv={v.data} palette={{ accent: t.accent, accent2: t.accent2, tint: t.tint, ink: t.ink }} extraFormats builderHref="/" />
    </div>
  );
}
