"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import CVSheet from "@/components/portfolio/CVSheet";
import { buildModel } from "@/lib/export/model";
import { createAlignedVersion } from "@/lib/jobmatch/storage";
import { applyChanges, changesFrom, tailoredName, type TChange, type TailorPlan } from "@/lib/jobmatch/tailor";
import type { CVData } from "@/lib/types";

/* "Generate a completely new tailored CV": the AI drafts, the user reviews every change, and the result is saved as a
   separate version (labelled Tailored) that can be viewed and exported in every format. The source CV is never changed.
   Safety: the AI can only re-word and re-order what exists; anything containing a number, tool or name that is not in the
   CV is flagged and starts switched off (see lib/jobmatch/tailor.ts). */

const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const btn = "cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-[var(--ink)] text-white hover:brightness-110`;
const btnOutline = `${btn} border border-slate-300 bg-white text-slate-800 hover:border-[var(--accent)]`;

export interface TailorProps {
  cv: CVData;
  baseName: string;
  text: string;
  aiAvailable: boolean;
  aiReason: string;
  consent: boolean;
  setConsent: (v: boolean) => void;
  code: string;
  needsCode: boolean;
  setCode: (v: string) => void;
  /** makes sure the job description is stored and returns its record's id and details */
  ensureJob: () => { id: string; title: string; company: string };
  onSaved: (versionId: string, name: string) => void;
}

const lines = (v: string | string[]) => (Array.isArray(v) ? v : [v]);

export default function TailorPanel({ cv, baseName, text, aiAvailable, aiReason, consent, setConsent, code, needsCode, setCode, ensureJob, onSaved }: TailorProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<TailorPlan | null>(null);
  const [source, setSource] = useState("");
  const [changes, setChanges] = useState<TChange[]>([]);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string | string[]>>({});
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const [showCv, setShowCv] = useState(false);

  const tailored = useMemo(() => applyChanges(cv, changes, on, edits), [cv, changes, on, edits]);
  const model = useMemo(() => buildModel(tailored, { photo: true, personal: false }), [tailored]);

  const generate = async () => {
    setError("");
    if (text.trim().length < 30) return setError("Add a job description first: upload a file or paste at least a few sentences.");
    if (!consent) return setError("Please tick the box above to confirm your CV content may be sent to the AI service.");
    setBusy(true);
    setSaved(null);
    try {
      const withoutPrivate: CVData = { ...cv, header: { ...cv.header, name: "", email: "", phone: "", address: "", dateOfBirth: "", nationality: "", visaStatus: "", photo: "", photos: [], portfolioPhoto: "", links: [] } };
      const res = await fetch("/api/tailor-cv", { method: "POST", headers: { "content-type": "application/json", ...(code ? { "x-access-code": code } : {}) }, body: JSON.stringify({ cv: withoutPrivate, jobText: text }) });
      const data = (await res.json().catch(() => ({}))) as { plan?: TailorPlan; source?: string; message?: string };
      if (!res.ok || !data.plan) {
        setError(data.message ?? "The AI could not draft a CV. Please try again.");
      } else {
        const c = changesFrom(data.plan, cv);
        setPlan(data.plan);
        setSource(data.source ?? "");
        setChanges(c);
        setOn(new Set(c.filter((x) => x.defaultOn).map((x) => x.key)));
        setEdits({});
        const job = ensureJob();
        setName(tailoredName(job, baseName));
        if (c.length === 0) setError("The AI had no changes to suggest for this CV and job.");
      }
    } catch {
      setError("Could not reach the server. Check that the app is running, then try again.");
    }
    setBusy(false);
  };

  const toggle = (k: string) =>
    setOn((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const save = () => {
    if (!name.trim()) return setError("Give the new CV a name.");
    const job = ensureJob();
    const r = createAlignedVersion(name, tailored, job.id, { tailored: true, basedOn: baseName });
    if ("error" in r) return setError(r.error);
    setSaved({ id: r.id, name: name.trim() });
    setError("");
    onSaved(r.id, name.trim());
  };

  const flagged = changes.filter((c) => c.flags.length > 0).length;

  return (
    <section className={card} aria-labelledby="jm-tailor">
      <h2 id="jm-tailor" className="text-lg font-bold">
        Create a completely new tailored CV (AI)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        The AI drafts a new version of <b>{baseName}</b> for this job: it re-words your summary and bullets to stress what matters, re-orders skills and projects, and leaves out what is irrelevant. It can only use facts already in the CV. You review every change, and the result is saved as a separate CV marked <b>Tailored</b>, so <b>{baseName}</b> is not changed.
      </p>
      {aiAvailable && (
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>I understand that my CV content (without photo, name, e-mail, phone, address, date of birth and links) and the job text are sent to the AI service.</span>
          </label>
          {needsCode && (
            <label className="block">
              <span className="font-semibold">Access code</span>
              <input type="password" value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2" />
            </label>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} onClick={generate} disabled={busy || !aiAvailable}>
          {busy ? "Generating with AI…" : plan ? "Generate again" : "Generate tailored CV"}
        </button>
        {!aiAvailable && <span className="text-sm text-red-700">Needs the AI: {aiReason} Use the suggestions below for a free, basic aligned version instead.</span>}
      </div>
      <div role="alert" aria-live="assertive" className="mt-3">
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      </div>

      {plan && changes.length > 0 && (
        <div className="mt-5 space-y-4">
          {plan.notes && (
            <p className="rounded-xl bg-[var(--tint)] p-3 text-sm text-slate-700">
              <b>AI notes:</b> {plan.notes} <span className="text-xs text-slate-500">({source})</span>
            </p>
          )}
          <p className="text-sm text-slate-600">
            {changes.length} proposed change{changes.length === 1 ? "" : "s"}. Tick the ones to keep; you can edit any wording.
            {flagged > 0 && <b className="ml-1 text-amber-800">{flagged} contain things that are not in your CV and start switched off: keep them only if they are true.</b>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnOutline} onClick={() => setOn(new Set(changes.filter((c) => c.flags.length === 0).map((c) => c.key)))}>
              Switch on all checked changes
            </button>
            <button type="button" className={btnOutline} onClick={() => setOn(new Set())}>
              Switch all off
            </button>
          </div>
          <ul className="space-y-3">
            {changes.map((c) => {
              const editable = c.kind === "headline" || c.kind === "summary" || c.kind === "text" || (c.kind === "list" && c.field !== "tech" && c.field !== "technologies" && c.field !== "skills");
              const cur = edits[c.key] ?? c.after;
              return (
                <li key={c.key} className={`rounded-xl border p-3 ${c.flags.length ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
                  <label className="flex items-start gap-2.5 text-sm font-semibold">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={on.has(c.key)} onChange={() => toggle(c.key)} aria-label={`Keep change: ${c.label}`} />
                    <span>{c.label}</span>
                  </label>
                  {c.flags.length > 0 && (
                    <p className="mt-1 text-xs font-semibold text-amber-800">Not found in your CV: {c.flags.join(", ")}. Check this is true before keeping it.</p>
                  )}
                  <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-slate-500">Before</p>
                      <div className="rounded-lg bg-slate-50 p-2">
                        {lines(c.before).map((b, i) => (
                          <p key={i}>{b || "(empty)"}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase text-slate-500">After {editable && <span className="font-normal normal-case">(you can edit)</span>}</p>
                      {editable ? (
                        <textarea
                          aria-label={`New wording: ${c.label}`}
                          rows={Array.isArray(c.after) ? Math.min(8, c.after.length + 1) : c.kind === "summary" ? 5 : 2}
                          value={Array.isArray(cur) ? cur.join("\n") : cur}
                          onChange={(e) => setEdits((x) => ({ ...x, [c.key]: Array.isArray(c.after) ? e.target.value.split("\n") : e.target.value }))}
                          className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm"
                        />
                      ) : (
                        <div className="rounded-lg bg-emerald-50 p-2">
                          {lines(c.after).map((b, i) => (
                            <p key={i}>{c.kind === "skills" || c.field ? `${i + 1}. ${b}` : b}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <details open={showCv} onToggle={(e) => setShowCv((e.target as HTMLDetailsElement).open)} className="rounded-xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-bold">Preview the new CV</summary>
            <div className="mt-3 overflow-x-auto">
              <CVSheet m={model} cv={tailored} />
            </div>
          </details>

          {saved ? (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">Saved as a new CV: “{saved.name}”</p>
              <p className="mt-1">It is in your Versions list (labelled Tailored) and linked to this job. {baseName} and your working CV are unchanged.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/job-matcher/cv?id=${saved.id}`} className={`${btnPrimary} inline-block`}>
                  View and export (PDF, Word, HTML, PowerPoint, text, JSON, LinkedIn)
                </Link>
                <button type="button" className={btnOutline} onClick={() => setSaved(null)}>
                  Change selection and save another
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="jm-tailor-name" className="text-sm font-semibold">
                Name of the new CV
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input id="jm-tailor-name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" className={btnPrimary} onClick={save}>
                  Save as new CV
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Saved in this browser as a separate version, together with the job description.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
