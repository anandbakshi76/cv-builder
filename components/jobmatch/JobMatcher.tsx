"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { newId } from "@/lib/defaults";
import { applyOps, compareCvs, previewOp } from "@/lib/jobmatch/apply";
import { basicAnalysis } from "@/lib/jobmatch/basic";
import { ACCEPT_ATTR, FORMAT_LIST, ParseError, readJobFile } from "@/lib/jobmatch/parse";
import { createAlignedVersion, loadJobs, makeWorkingCopy, saveJobs, upsertJob } from "@/lib/jobmatch/storage";
import { BAND_TEXT, MAX_PASTE_CHARS, bandOf, type Analysis, type Band, type JobRecord, type Op, type Suggestion } from "@/lib/jobmatch/types";
import { readLive } from "@/lib/portfolio";
import { loadVersions, type SavedVersion } from "@/lib/versions";
import TailorPanel from "./TailorPanel";
import { THEMES } from "@/lib/themes";
import type { CVData } from "@/lib/types";

/* The Job Matcher screen: Upload or paste a job -> Analyse -> Review -> Apply -> Save a new version.
   Nothing here changes the working CV until the user chooses "Open in CV builder". */

const CONSENT_KEY = "cv-builder:jobmatch-consent";
const CODE_KEY = "cv-builder:jobmatch-code";
type Status = { available: boolean; provider: string; needsAccessCode: boolean; reason: string };

/** What leaves the browser when the AI is used: the CV content without photos, name and contact details. */
function cvForAi(cv: CVData): CVData {
  return { ...cv, header: { ...cv.header, name: "", email: "", phone: "", address: "", dateOfBirth: "", nationality: "", visaStatus: "", photo: "", photos: [], portfolioPhoto: "", links: [] } };
}

const BAND_STYLE: Record<Band, { bar: string; chip: string }> = {
  strong: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900" },
  good: { bar: "bg-yellow-400", chip: "bg-yellow-100 text-yellow-900" },
  weak: { bar: "bg-orange-500", chip: "bg-orange-100 text-orange-900" },
  major: { bar: "bg-red-500", chip: "bg-red-100 text-red-900" },
};

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const btn = "cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-[var(--ink)] text-white hover:brightness-110`;
const btnOutline = `${btn} border border-slate-300 bg-white text-slate-800 hover:border-[var(--accent)]`;

function Bar({ value, band }: { value: number; band: Band }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`Match ${value} percent`} className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all duration-700 ${BAND_STYLE[band].bar}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function SkillRow({ s, kind }: { s: { skill: string; match?: number; evidence?: string; reason?: string }; kind: "strong" | "weak" | "missing" }) {
  const label = kind === "strong" ? "Strong" : kind === "weak" ? "Partial" : "Missing";
  const chip = kind === "strong" ? "bg-emerald-100 text-emerald-900" : kind === "weak" ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-900";
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${chip}`}>{label}</span>
        <span className="font-semibold text-slate-900">
          {s.skill}
          {kind !== "missing" && s.match !== undefined && <span className="ml-1.5 font-normal text-slate-500">({s.match}% match)</span>}
          {kind === "missing" && <span className="ml-1.5 font-normal text-slate-500">(not in your CV)</span>}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">{s.evidence ?? s.reason}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        {kind === "strong" && "Action: keep it near the top."}
        {kind === "weak" && "Action: move it up and add detail where you honestly can."}
        {kind === "missing" && "Not critical, but learning it would strengthen the application. Do not add it to the CV unless it is true."}
      </p>
    </li>
  );
}

export default function JobMatcher() {
  const [workingCv, setWorkingCv] = useState<CVData | null>(null);
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [sourceId, setSourceId] = useState("working");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<"ai" | "basic">("ai");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [pasted, setPasted] = useState("");
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [active, setActive] = useState<"paste" | "file">("paste");
  const [busy, setBusy] = useState<"" | "reading" | "analysing">("");
  const [error, setError] = useState("");
  const [canFallback, setCanFallback] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobText, setJobText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [vname, setVname] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [msg, setMsg] = useState("");
  const results = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkingCv(readLive());
    setVersions(loadVersions());
    setLoaded(true);
    setJobs(loadJobs());
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "yes");
      setCode(sessionStorage.getItem(CODE_KEY) ?? "");
    } catch {}
    fetch("/api/analyze-job", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        if (!s.available) setMode("basic");
      })
      .catch(() => {
        setStatus({ available: false, provider: "", needsAccessCode: false, reason: "offline" });
        setMode("basic");
      });
  }, []);

  /** the CV everything is based on: the working CV, or any saved version (a master profile, an older tailored one...) */
  const sourceVersion = versions.find((v) => v.id === sourceId);
  const cv: CVData | null = sourceVersion ? sourceVersion.data : workingCv;
  const baseName = sourceVersion ? sourceVersion.name : "your working CV";
  const theme = THEMES[cv?.theme ?? "teal"] ?? THEMES.teal;
  const vars = { "--accent": theme.accent, "--accent2": theme.accent2, "--tint": theme.tint, "--ink": theme.ink } as React.CSSProperties;
  const text = (active === "file" ? fileText : pasted).trim();

  const ops = useMemo(() => {
    if (!analysis) return [];
    return analysis.suggestedChanges
      .filter((s) => s.op && selected.has(s.id))
      .map((s): Op => {
        const op = s.op as Op;
        const t = edits[s.id];
        return (op.kind === "rewrite_summary" || op.kind === "rewrite_headline") && t !== undefined ? { ...op, text: t } : op;
      });
  }, [analysis, selected, edits]);
  const aligned = useMemo(() => (cv ? applyOps(cv, ops) : null), [cv, ops]);
  const changes = useMemo(() => (cv && aligned ? compareCvs(cv, aligned) : []), [cv, aligned]);

  const showAnalysis = useCallback((a: Analysis) => {
    setAnalysis(a);
    setSelected(new Set(a.suggestedChanges.filter((s) => s.op && !s.needsReview).map((s) => s.id)));
    setEdits(Object.fromEntries(a.suggestedChanges.filter((s) => s.op && (s.op.kind === "rewrite_summary" || s.op.kind === "rewrite_headline")).map((s) => [s.id, (s.op as { text: string }).text])));
    setOpen(new Set());
    setSaved(null);
    setVname(`${a.job.title || "Aligned CV"} - ${a.job.company || "Job"} Job`);
    window.setTimeout(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  const pickFile = async (f: File) => {
    setError("");
    setBusy("reading");
    try {
      const r = await readJobFile(f);
      setFileText(r.text);
      setFileName(f.name);
      setFileNote(r.truncated ? "The file was long, so only the first part (about 3,000 words) is used." : "");
      setActive("file");
    } catch (e) {
      setError(e instanceof ParseError ? e.message : "That file could not be read. Paste the job description instead.");
    }
    setBusy("");
  };

  const analyse = async (forceBasic = false) => {
    setError("");
    setCanFallback(false);
    if (!cv) return;
    if (text.length < 30) return setError("Add a job description first: upload a file or paste at least a few sentences.");
    const useAi = mode === "ai" && !forceBasic;
    if (useAi && !consent) return setError("Please tick the box to confirm you are happy for your CV content to be sent to the AI service.");
    setBusy("analysing");
    let result: Analysis | null = null;
    if (useAi) {
      try {
        const res = await fetch("/api/analyze-job", { method: "POST", headers: { "content-type": "application/json", ...(code ? { "x-access-code": code } : {}) }, body: JSON.stringify({ cv: cvForAi(cv), jobText: text }) });
        const data = (await res.json().catch(() => ({}))) as { analysis?: Analysis; message?: string };
        if (!res.ok || !data.analysis) {
          setError(data.message ?? "The AI analysis failed. Please try again.");
          setCanFallback(true);
        } else result = data.analysis;
      } catch {
        setError("Could not reach the server. Check that the app is running, then try again.");
        setCanFallback(true);
      }
    } else result = basicAnalysis(cv, text);
    setBusy("");
    if (!result) return;
    const id = newId();
    setJobId(id);
    setJobText(text);
    showAnalysis(result);
    const rec: JobRecord = { id, savedAt: new Date().toISOString(), title: result.job.title, company: result.job.company, fileName: active === "file" ? fileName : undefined, text, analysis: result };
    const err = mutateJobs((l) => upsertJob(l, rec));
    if (err) setMsg(err);
  };

  /** Reads the stored job list fresh (never a stale copy), changes it, saves it and refreshes the screen. */
  const mutateJobs = (fn: (list: JobRecord[]) => JobRecord[]) => {
    const list = fn(loadJobs());
    setJobs(list);
    return saveJobs(list);
  };
  const updateConsent = (v: boolean) => {
    setConsent(v);
    try {
      localStorage.setItem(CONSENT_KEY, v ? "yes" : "no");
    } catch {}
  };
  const updateCode = (v: string) => {
    setCode(v);
    try {
      sessionStorage.setItem(CODE_KEY, v);
    } catch {}
  };
  /** Makes sure the current job text is stored as a job record (using the free basic analysis if there is none yet). */
  const ensureJob = (): { id: string; title: string; company: string } => {
    const existing = jobId && jobText === text ? loadJobs().find((j) => j.id === jobId) : undefined;
    if (existing) return { id: existing.id, title: existing.title, company: existing.company };
    const a = basicAnalysis(cv as CVData, text);
    const id = newId();
    const rec: JobRecord = { id, savedAt: new Date().toISOString(), title: a.job.title, company: a.job.company, fileName: active === "file" ? fileName : undefined, text, analysis: a };
    mutateJobs((l) => upsertJob(l, rec));
    setJobId(id);
    setJobText(text);
    return { id, title: a.job.title, company: a.job.company };
  };
  const onTailoredSaved = (id: string, name: string) => {
    setVersions(loadVersions());
    const key = jobId;
    mutateJobs((l) => l.map((j) => (j.id === key ? { ...j, versionId: id, versionName: name } : j)));
    setMsg(`Saved the tailored CV "${name}".`);
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const createVersion = () => {
    if (!cv || !aligned || !analysis) return;
    if (!vname.trim()) return setMsg("Give the version a name.");
    const r = createAlignedVersion(vname, aligned, jobId);
    if ("error" in r) return setMsg(r.error);
    setSaved({ id: r.id, name: vname.trim() });
    setVersions(loadVersions());
    mutateJobs((l) => l.map((j) => (j.id === jobId ? { ...j, versionId: r.id, versionName: vname.trim() } : j)));
    setMsg(`Saved version "${vname.trim()}". Open the Versions list in the CV builder to load it, or use the button below.`);
  };

  const openInBuilder = () => {
    if (!aligned) return;
    if (!window.confirm("This makes the aligned CV your working CV. Your current CV is saved as a version first. Continue?")) return;
    const err = makeWorkingCopy(aligned, workingCv);
    if (err) return setMsg(err);
    window.location.href = "/";
  };

  const reopen = (j: JobRecord) => {
    setJobId(j.id);
    setJobText(j.text);
    setPasted(j.text.slice(0, MAX_PASTE_CHARS));
    setActive("paste");
    showAnalysis(j.analysis);
    if (j.versionId) setSaved({ id: j.versionId, name: j.versionName ?? "" });
  };
  const removeJob = (id: string) => {
    const list = jobs.filter((j) => j.id !== id);
    setJobs(list);
    saveJobs(list);
  };

  if (!loaded) return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-400">Loading…</div>;
  const band = analysis ? bandOf(analysis.matchScore) : "major";
  const aiUnavailable = status && !status.available;
  const reasonText = status?.reason === "off" ? "The AI is switched off on this website." : status?.reason === "no_key" ? "No AI key is set up yet." : "The AI service is not available.";

  return (
    <div style={vars} className="min-h-screen bg-slate-50 pb-16 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink)]">CV Builder</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Job Matcher</h1>
          </div>
          <nav className="flex gap-2 text-sm" aria-label="Job Matcher">
            <Link href="/" className={btnOutline}>
              ← Back to the CV builder
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-5xl space-y-6 px-4">
        <p role="status" aria-live="polite" className={`min-h-6 text-sm font-medium text-[var(--ink)] ${msg ? "" : "sr-only"}`}>
          {msg}
        </p>

        {!cv || (cv.projects.length === 0 && cv.skills.technical.length === 0 && cv.experience.length === 0) ? (
          <div className={card}>
            <p className="font-semibold">There is no CV to match yet.</p>
            <p className="mt-1 text-sm text-slate-600">Fill in your CV in the builder first (at least skills or projects), then come back.</p>
          </div>
        ) : null}

        {/* 1. INPUT */}
        <section className={card} aria-labelledby="jm-input">
          <h2 id="jm-input" className="text-lg font-bold">
            1. Add the job description
          </h2>
          <p className="mt-1 text-sm text-slate-600">Upload a file or paste the text. Files are read in your browser and never uploaded as files.</p>

          <div className="mt-4">
            <label htmlFor="jm-source" className="text-sm font-semibold">
              Which CV should I use?
            </label>
            <select id="jm-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="mt-1 block w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="working">My working CV (what is open in the CV builder)</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Saved version: {v.name}
                  {v.tailored ? " (tailored)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Pick your master profile or any saved version. It is only read: it is never changed.</p>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="jm-file" className="text-sm font-semibold">
                Upload a file <span className="font-normal text-slate-500">({FORMAT_LIST}; up to 5 MB)</span>
              </label>
              <input
                id="jm-file"
                type="file"
                accept={ACCEPT_ATTR}
                data-testid="job-file"
                className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void pickFile(f);
                }}
              />
              {busy === "reading" && <p className="mt-2 text-sm text-slate-500">Reading the file…</p>}
              {fileName && (
                <div className="mt-3 rounded-xl bg-[var(--tint)] p-3 text-sm">
                  <p className="font-semibold text-[var(--ink)]">
                    {fileName} <span className="font-normal text-slate-600">({fileText.length.toLocaleString()} characters read)</span>
                  </p>
                  {fileNote && <p className="mt-1 text-slate-600">{fileNote}</p>}
                  <p className="mt-1 line-clamp-3 text-slate-600">{fileText}</p>
                  <label className="mt-2 inline-flex items-center gap-2">
                    <input type="radio" name="jm-source" checked={active === "file"} onChange={() => setActive("file")} /> Analyse this file
                  </label>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="jm-paste" className="text-sm font-semibold">
                Or paste the job description
              </label>
              <textarea
                id="jm-paste"
                rows={7}
                maxLength={MAX_PASTE_CHARS}
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  setActive("paste");
                }}
                placeholder="Paste the job description here…"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--tint)]"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className={`inline-flex items-center gap-2 ${fileName ? "" : "invisible"}`}>
                  <input type="radio" name="jm-source" checked={active === "paste"} onChange={() => setActive("paste")} /> Analyse the pasted text
                </label>
                <span>
                  {pasted.length}/{MAX_PASTE_CHARS}
                </span>
              </div>
            </div>
          </div>

          <fieldset className="mt-5 rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold">How to analyse</legend>
            <div className="flex flex-col gap-3 text-sm">
              <label className={`flex items-start gap-2 ${aiUnavailable ? "opacity-60" : ""}`}>
                <input type="radio" name="jm-mode" checked={mode === "ai"} disabled={!!aiUnavailable} onChange={() => setMode("ai")} className="mt-1" />
                <span>
                  <b>AI analysis</b> (reads the job carefully, about 1 to 10 pence per analysis).
                  {aiUnavailable && <span className="ml-1 text-red-700">Not available: {reasonText}</span>}
                  {status?.available && <span className="ml-1 text-slate-500">Provider: {status.provider}.</span>}
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="jm-mode" checked={mode === "basic"} onChange={() => setMode("basic")} className="mt-1" />
                <span>
                  <b>Basic keyword check</b> (free, no AI, nothing leaves this computer; simpler results).
                </span>
              </label>
            </div>
            {mode === "ai" && !aiUnavailable && (
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      try {
                        localStorage.setItem(CONSENT_KEY, e.target.checked ? "yes" : "no");
                      } catch {}
                    }}
                    className="mt-1"
                  />
                  <span>I understand that my CV content (without photo, name, e-mail, phone, address, date of birth and links) and the job text are sent to the AI service for this analysis.</span>
                </label>
                {status?.needsAccessCode && (
                  <label className="block">
                    <span className="font-semibold">Access code</span>
                    <input
                      type="password"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        try {
                          sessionStorage.setItem(CODE_KEY, e.target.value);
                        } catch {}
                      }}
                      className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                )}
              </div>
            )}
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} onClick={() => analyse()} disabled={busy !== "" || !cv}>
              {busy === "analysing" ? (mode === "ai" ? "Analyzing with AI…" : "Analyzing job…") : "Analyse job"}
            </button>
            <span className="text-sm text-slate-500">{text ? `Using ${active === "file" ? `the file "${fileName}"` : "the pasted text"} (${text.length.toLocaleString()} characters).` : "Nothing added yet."}</span>
          </div>
          <div role="alert" aria-live="assertive" className="mt-3">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <p className="font-semibold">{error}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canFallback && (
                    <>
                      <button type="button" className={btnOutline} onClick={() => analyse()}>
                        Try again
                      </button>
                      <button type="button" className={btnOutline} onClick={() => analyse(true)}>
                        Use the basic check instead
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {cv && (
          <TailorPanel
            cv={cv}
            baseName={baseName}
            text={text}
            aiAvailable={!!status?.available}
            aiReason={reasonText}
            consent={consent}
            setConsent={updateConsent}
            code={code}
            needsCode={!!status?.needsAccessCode}
            setCode={updateCode}
            ensureJob={ensureJob}
            onSaved={onTailoredSaved}
          />
        )}

        {/* 2. RESULTS */}
        {analysis && cv && (
          <div ref={results} className="space-y-6" aria-live="polite">
            <section className={card} aria-labelledby="jm-score">
              <h2 id="jm-score" className="text-lg font-bold">
                2. Match analysis{analysis.job.title && <span className="font-normal text-slate-600">: {analysis.job.title}{analysis.job.company && ` at ${analysis.job.company}`}</span>}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <p className="text-4xl font-extrabold text-slate-900">{analysis.matchScore}% Match</p>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${BAND_STYLE[band].chip}`}>{BAND_TEXT[band]}</span>
              </div>
              <div className="mt-3">
                <Bar value={analysis.matchScore} band={band} />
              </div>
              <p className="mt-3 text-slate-700">{analysis.analysis}</p>
              <p className="mt-2 text-xs text-slate-500">Analysed by: {analysis.source === "basic" ? "basic keyword check (no AI)" : analysis.source}. A score is a guide, not a promise: read the details below.</p>
            </section>

            {(analysis.strongMatches.length > 0 || analysis.weakMatches.length > 0 || analysis.missingSkills.length > 0) && (
              <section className={card} aria-labelledby="jm-skills">
                <h2 id="jm-skills" className="text-lg font-bold">
                  Skills breakdown
                </h2>
                <div className="mt-3 grid gap-5 lg:grid-cols-3">
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-emerald-800">Strong matches ({analysis.strongMatches.length})</h3>
                    <ul className="space-y-2">
                      {analysis.strongMatches.map((s) => (
                        <SkillRow key={s.skill} s={s} kind="strong" />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-yellow-800">Weak or partial ({analysis.weakMatches.length})</h3>
                    <ul className="space-y-2">
                      {analysis.weakMatches.map((s) => (
                        <SkillRow key={s.skill} s={s} kind="weak" />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-red-800">Missing ({analysis.missingSkills.length})</h3>
                    <ul className="space-y-2">
                      {analysis.missingSkills.map((s) => (
                        <SkillRow key={s.skill} s={s} kind="missing" />
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {analysis.matchingProjects.length > 0 && (
              <section className={card} aria-labelledby="jm-projects">
                <h2 id="jm-projects" className="text-lg font-bold">
                  Projects that fit this job
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {analysis.matchingProjects.map((p) => (
                    <li key={p.name}>
                      <b>{p.name}</b>: {p.relevance} <span aria-hidden>✓</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">Highlight these first in your CV for this job.</p>
              </section>
            )}

            <section className={card} aria-labelledby="jm-suggest">
              <h2 id="jm-suggest" className="text-lg font-bold">
                3. Suggestions
              </h2>
              <p className="mt-1 text-sm text-slate-600">Tick the ones you want. Re-orderings only move things you already have. Text changes start unticked: read them, edit them, and keep only what is true.</p>
              {analysis.suggestedChanges.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No changes suggested.</p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btnOutline} onClick={() => setSelected(new Set(analysis.suggestedChanges.filter((s) => s.op && !s.needsReview).map((s) => s.id)))}>
                      Select all re-orderings
                    </button>
                    <button type="button" className={btnOutline} onClick={() => setSelected(new Set())}>
                      Clear
                    </button>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {analysis.suggestedChanges.map((s: Suggestion) => {
                      const pv = s.op ? previewOp(cv, s.op.kind === "rewrite_summary" || s.op.kind === "rewrite_headline" ? { ...s.op, text: edits[s.id] ?? s.op.text } : s.op) : null;
                      return (
                        <li key={s.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex flex-wrap items-start gap-3">
                            <label className="flex flex-1 items-start gap-2.5 text-sm">
                              <input type="checkbox" checked={selected.has(s.id)} disabled={!s.op} onChange={() => toggle(s.id)} className="mt-1 h-4 w-4" aria-label={`Apply: ${s.detail}`} />
                              <span>
                                <span className="mr-2 rounded-full bg-[var(--tint)] px-2 py-0.5 text-xs font-bold uppercase text-[var(--ink)]">{s.action}</span>
                                <b className="capitalize">{s.section}</b>: {s.detail}
                                {!s.op && <span className="ml-2 text-xs text-slate-500">(advice only: cannot be applied with a click)</span>}
                                {s.needsReview && <span className="ml-2 text-xs font-semibold text-amber-700">Review &amp; edit before applying</span>}
                              </span>
                            </label>
                            {pv && (
                              <button type="button" className="cursor-pointer text-sm font-semibold text-[var(--ink)] underline" aria-expanded={open.has(s.id)} onClick={() => setOpen((o) => (o.has(s.id) ? new Set([...o].filter((x) => x !== s.id)) : new Set([...o, s.id])))}>
                                {open.has(s.id) ? "Hide preview" : "Preview"}
                              </button>
                            )}
                          </div>
                          {s.op && (s.op.kind === "rewrite_summary" || s.op.kind === "rewrite_headline") && (
                            <div className="mt-2">
                              <label className="text-xs font-semibold text-slate-600" htmlFor={`edit-${s.id}`}>
                                New {s.op.kind === "rewrite_summary" ? "summary" : "headline"} (edit it)
                              </label>
                              <textarea id={`edit-${s.id}`} rows={s.op.kind === "rewrite_summary" ? 4 : 2} value={edits[s.id] ?? s.op.text} onChange={(e) => setEdits((x) => ({ ...x, [s.id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
                            </div>
                          )}
                          {pv && open.has(s.id) && (
                            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-bold uppercase text-slate-500">Before</p>
                                <ol className={`space-y-0.5 rounded-lg bg-slate-50 p-2 ${pv.text ? "" : "list-decimal pl-6"}`}>
                                  {pv.before.map((b, i) => (
                                    <li key={i} className={pv.text ? "list-none" : ""}>
                                      {b}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-bold uppercase text-slate-500">After</p>
                                <ol className={`space-y-0.5 rounded-lg bg-emerald-50 p-2 ${pv.text ? "" : "list-decimal pl-6"}`}>
                                  {pv.after.map((b, i) => (
                                    <li key={i} className={pv.text ? "list-none" : ""}>
                                      {b}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            <section className={card} aria-labelledby="jm-compare">
              <h2 id="jm-compare" className="text-lg font-bold">
                4. Before and after
              </h2>
              {changes.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No changes selected yet. Tick suggestions above to see exactly what would change. Untick a suggestion at any time to undo it.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {changes.map((c, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <p className="font-bold capitalize">
                        {c.section} <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{c.text ? "reworded" : "re-ordered"}</span>
                      </p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="mb-1 text-xs font-bold uppercase text-slate-500">Original</p>
                          {c.before.map((b, j) => (
                            <p key={j} className={!c.text && c.after[j] !== b ? "" : ""}>
                              {c.text ? b : `${j + 1}. ${b}`}
                            </p>
                          ))}
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2">
                          <p className="mb-1 text-xs font-bold uppercase text-slate-500">Aligned</p>
                          {c.after.map((b, j) => (
                            <p key={j} className={!c.text && c.before[j] !== b ? "font-semibold text-emerald-900" : ""}>
                              {c.text ? b : `${j + 1}. ${b}`}
                              {!c.text && c.before[j] !== b && <span className="ml-1 text-xs font-normal text-emerald-800">(moved)</span>}
                            </p>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card} aria-labelledby="jm-save">
              <h2 id="jm-save" className="text-lg font-bold">
                5. Save an aligned version
              </h2>
              {saved ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-bold">Saved: “{saved.name}”</p>
                  <p className="mt-1">It is in your Versions list and linked to this job. Your working CV has not changed.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btnPrimary} onClick={openInBuilder}>
                      Open it in the CV builder
                    </button>
                    <button type="button" className={btnOutline} onClick={() => setSaved(null)}>
                      Change selection and save another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <label htmlFor="jm-name" className="text-sm font-semibold">
                    Version name
                  </label>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <input id="jm-name" value={vname} onChange={(e) => setVname(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <button type="button" className={btnPrimary} onClick={createVersion} disabled={changes.length === 0}>
                      Create aligned version
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{changes.length === 0 ? "Select at least one suggestion first." : `${changes.length} section${changes.length === 1 ? "" : "s"} will change. The job description is stored with the version, in this browser only.`}</p>
                </div>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">The job description used ({jobText.length.toLocaleString()} characters)</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{jobText}</pre>
              </details>
            </section>
          </div>
        )}

        {/* 3. HISTORY */}
        <section className={card} aria-labelledby="jm-history">
          <h2 id="jm-history" className="text-lg font-bold">
            Your analysed jobs
          </h2>
          {jobs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Jobs you analyse are kept here, in this browser only, so you can open them again later.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BAND_STYLE[bandOf(j.analysis.matchScore)].chip}`}>{j.analysis.matchScore}%</span>
                  <span className="min-w-0 flex-1">
                    <b>{j.title || j.fileName || "Job description"}</b>
                    {j.company && <span> at {j.company}</span>}
                    <span className="block text-xs text-slate-500">
                      {new Date(j.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {j.versionName && ` · Version: ${j.versionName}`}
                    </span>
                  </span>
                  <button type="button" className="cursor-pointer font-semibold text-[var(--ink)] underline" onClick={() => reopen(j)}>
                    Open
                  </button>
                  <button type="button" className="cursor-pointer text-red-700 underline" onClick={() => removeJob(j.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
