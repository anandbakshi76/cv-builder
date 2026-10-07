"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { experienceFields, matchedSkills, projectFields, sameSkill, type FxState, type SkillFilter } from "@/lib/filter";
import { cvHealth } from "@/lib/health";
import { has, hasHeader, expectedGraduation, hrefFor, displayUrl, nonBlank } from "@/lib/cv";
import { fmtMonth, fmtRange } from "@/lib/dates";
import { blankEducation, blankExperience, newId } from "@/lib/defaults";
import { fileBase } from "@/lib/export/formats";
import { THEMES, THEME_GROUPS, swatch } from "@/lib/themes";
import { useCV, type SaveStatus } from "@/lib/useCV";
import { useVersions } from "@/lib/useVersions";
import { sameCv } from "@/lib/versions";
import type { CVData, Display, HeaderStyle, LinkPlatform, ThemeId } from "@/lib/types";
import { BulletList } from "./BulletList";
import { DateField, DatePill, DateRange, FullDateField } from "./DateField";
import { Editable, EditContext, useEditing } from "./Editable";
import { ExportMenu } from "./ExportMenu";
import { btnPrimary, btnSecondary, Modal } from "./Modal";
import { PhotoUpload } from "./PhotoUpload";
import { PrintOptions, usePrintPrefs } from "./PrintOptions";
import { VersionsPanel } from "./VersionsPanel";
import { AddButton, Label, RemoveButton, Section } from "./Section";
import { PLATFORMS, SocialIcon } from "./SocialIcon";
import { TagList } from "./TagList";

type ListKey =
  | "experience"
  | "internships"
  | "projects"
  | "certifications"
  | "trainings"
  | "awards"
  | "extracurricular"
  | "education"
  | "stats";

const STATUS_UI: Record<SaveStatus, { text: string; cls: string }> = {
  saved: { text: "All changes saved", cls: "bg-emerald-500" },
  unsaved: { text: "Unsaved changes…", cls: "bg-amber-500" },
  error: { text: "Could not save (storage full or blocked)", cls: "bg-red-500" },
};

/** Printable height of one A4 page (297mm minus 10mm top and bottom margins), in CSS px */
const PAGE_PX = Math.round(((297 - 20) * 96) / 25.4);

const ICONS: Record<string, string> = {
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  badge: "M4 5h16v14H4zM8 10h8M8 14h5",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  home: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function CVEditor() {
  const { data, status, update, reset } = useCV();
  const [editing, setEditing] = useState(true);
  const [showHealth, setShowHealth] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [docHeight, setDocHeight] = useState(0);
  const [printPrefs, setPrintPrefs] = usePrintPrefs();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ cv: CVData; label: string; loadId?: string } | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((cur) => (cur === message ? "" : cur)), 3800);
  }, []);
  const versions = useVersions(data, notify);

  // Hidden, fixed-width (A4 width) preview copy: its height gives the real printed length.
  const measureRef = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setDocHeight(h);
    });
    ro.observe(el);
  }, []);

  const personName = data?.header.name.trim();
  useEffect(() => {
    const title = personName ? `${personName} – CV` : "CV Builder";
    const printTitle = fileBase(personName ?? ""); // e.g. Deekshan_Bakshi_CV: the PDF's default file name
    let printing = false;
    const apply = () => {
      if (!printing && document.title !== title) document.title = title;
    };
    apply();
    // The framework re-writes its own <title> after hydration, so keep ours in place. While the print dialog is
    // open the title is the file-style name, because the PDF's title and default file name come from document.title.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const before = () => {
      printing = true;
      document.title = printTitle;
    };
    const after = () => {
      printing = false;
      apply();
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [personName]);

  if (!data) return <div className="p-10 text-center text-slate-500">Loading…</div>;

  const filter: SkillFilter = {
    selected: selectedSkills,
    onlyMatches,
    toggle: (skill) =>
      setSelectedSkills((cur) => (cur.some((x) => sameSkill(x, skill)) ? cur.filter((x) => !sameSkill(x, skill)) : [...cur, skill])),
  };
  const matchCount = (items: { fields: string[] }[]) => items.filter((i) => matchedSkills(selectedSkills, i.fields).length > 0).length;
  const expMatches = matchCount([...data.experience, ...data.internships].map((x) => ({ fields: experienceFields(x) })));
  const projMatches = matchCount(data.projects.map((x) => ({ fields: projectFields(x) })));
  const showFilterBar = !editing && selectedSkills.length > 0;
  const theme = THEMES[data.theme] ?? THEMES.indigo;
  const pages = Math.max(1, Math.ceil((docHeight - 4) / PAGE_PX));
  const health = cvHealth(data, pages);

  const print = () => {
    // Always print the clean View, not the editing controls.
    const was = editing;
    setEditing(false);
    setTimeout(() => {
      window.print();
      setEditing(was);
    }, 200);
  };

  const exportOpts = { photo: printPrefs.photo, personal: printPrefs.personal };

  /** Replace the working CV (version load / JSON import). Offers to save the current CV first if it is not saved anywhere. */
  const doReplace = (cv: CVData, label: string, loadId?: string) => {
    update(() => JSON.parse(JSON.stringify(cv)) as CVData);
    versions.setLoadedId(loadId ?? null);
    setSelectedSkills([]);
    notify(`Loaded "${label}".`);
  };
  const requestReplace = (cv: CVData, label: string, loadId?: string) => {
    if (versions.current || sameCv(cv, data)) doReplace(cv, label, loadId);
    else setPending({ cv, label, loadId });
  };

  return (
    <EditContext.Provider value={editing}>
      <div
        id="cv-root"
        data-print={printPrefs.style}
        data-photo={printPrefs.photo ? "show" : "hide"}
        data-personal={printPrefs.personal ? "show" : "hide"}
        style={{ "--accent": theme.accent, "--accent2": theme.accent2, "--tint": theme.tint, "--ink": theme.ink } as React.CSSProperties}
        className="min-h-screen"
      >
        <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[794px] flex-wrap items-center justify-between gap-2 px-4 py-2">
            <div role="status" data-testid="save-status" className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_UI[status].cls}`} />
              {STATUS_UI[status].text}
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span data-testid="version-label" className="max-w-[14rem] truncate text-slate-500" title="Current version">
                Version: <strong className="text-slate-700">{versions.loaded ? versions.loaded.name : "Working copy"}</strong>
                {versions.modified && " (edited)"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <ThemePicker
                theme={data.theme}
                headerStyle={data.headerStyle}
                onTheme={(id) => update((d) => ({ ...d, theme: id }))}
                onHeaderStyle={(headerStyle) => update((d) => ({ ...d, headerStyle }))}
              />
              <div className="inline-flex overflow-hidden rounded-full border border-slate-300">
                {[
                  [true, "Edit"],
                  [false, "View"],
                ].map(([v, label]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => {
                      setEditing(v as boolean);
                      if (v) setSelectedSkills([]); // filters only exist in View mode
                    }}
                    aria-pressed={editing === v}
                    className={`cursor-pointer px-3.5 py-1 ${editing === v ? "bg-[var(--ink)] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              <span
                title="A4 pages when printed. UK CVs: 2 pages maximum (1 page is ideal for students)."
                className={`rounded-full px-3 py-1 font-medium ${pages > 2 ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                data-testid="page-count"
              >
                {pages} {pages === 1 ? "page" : "pages"} · UK max 2
              </span>
              <button
                type="button"
                onClick={() => setShowHealth((v) => !v)}
                aria-expanded={showHealth}
                className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
              >
                CV strength: <strong style={{ color: health.score >= 80 ? "#047857" : health.score >= 50 ? "#b45309" : "#be123c" }}>{health.score}%</strong>
              </button>
              <PrintOptions prefs={printPrefs} onChange={setPrintPrefs} />
              <button type="button" onClick={print} className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">
                Print
              </button>
              <ExportMenu
                data={data}
                opts={exportOpts}
                defaultColour={printPrefs.style === "colour"}
                onPrint={print}
                onImport={(cv, fileName) => requestReplace(cv, fileName)}
                notify={notify}
                setBusy={setBusy}
                onExported={versions.markExported}
              />
              <button
                type="button"
                onClick={() => setVersionsOpen((v) => !v)}
                aria-expanded={versionsOpen}
                className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
              >
                Versions <span className="text-xs text-slate-500">({versions.versions.length})</span>
              </button>
              {/* plain link (full page load) so the editor saves any pending change first */}
              <a href="/job-matcher" className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">
                Job Matcher
              </a>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear everything and restore the defaults?")) reset();
                }}
                className="cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-slate-600 hover:bg-red-50 hover:text-red-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {showHealth && (
          <div className="no-print mx-3 mt-4 max-w-[794px] rounded-xl min-[920px]:mx-auto bg-white p-4 shadow ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${health.score}%` }} />
              </div>
              <span className="text-sm font-semibold text-slate-700">{health.score}% interview-ready</span>
            </div>
            {health.advisories.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                {health.advisories.map((a) => (
                  <li key={a}>⚠ {a}</li>
                ))}
              </ul>
            )}
            {health.checks.some((c) => !c.ok) ? (
              <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
                {health.checks
                  .filter((c) => !c.ok)
                  .map((c) => (
                    <li key={c.label}>
                      <strong className="text-slate-800">{c.label}:</strong> {c.tip}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-emerald-700">Everything on the checklist is covered. Then print or save as PDF.</p>
            )}
          </div>
        )}

        {showFilterBar && (
          <div
            role="status"
            data-testid="filter-bar"
            className="no-print fixed bottom-3 left-1/2 z-20 flex w-[min(52rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white px-4 py-2.5 text-sm shadow-xl ring-1 ring-slate-300"
          >
            <span className="font-semibold text-slate-800">Filtering by:</span>
            <span className="flex flex-wrap gap-1.5">
              {selectedSkills.map((sk) => (
                <button
                  key={sk}
                  type="button"
                  onClick={() => filter.toggle(sk)}
                  aria-label={`Remove ${sk} from the filter`}
                  className="cursor-pointer rounded-full bg-[var(--ink)] px-2.5 py-0.5 text-white hover:brightness-110"
                >
                  {sk} ×
                </button>
              ))}
            </span>
            <span className="text-slate-600">
              {expMatches} experience {expMatches === 1 ? "entry" : "entries"}, {projMatches} {projMatches === 1 ? "project" : "projects"} match
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-700">
              <input type="checkbox" checked={onlyMatches} onChange={(e) => setOnlyMatches(e.target.checked)} className="cursor-pointer accent-[var(--accent)]" />
              Show only matches
            </label>
            <button
              type="button"
              onClick={() => setSelectedSkills([])}
              className="ml-auto cursor-pointer rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        )}
        <VersionsPanel
          open={versionsOpen}
          onClose={() => setVersionsOpen(false)}
          data={data}
          versions={versions.versions}
          loaded={versions.loaded}
          modified={versions.modified}
          onSave={versions.save}
          onLoad={(v) => requestReplace(v.data, v.name, v.id)}
          onDelete={versions.remove}
        />
        {pending && (
          <Modal title="Replace your current CV?" onClose={() => setPending(null)}>
            <p>
              Loading <strong>{pending.label}</strong> replaces the CV you are working on, and your current CV is not saved as a version yet.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setPending(null)} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  doReplace(pending.cv, pending.label, pending.loadId);
                  setPending(null);
                }}
                className={btnSecondary}
              >
                Replace without saving
              </button>
              <button
                type="button"
                onClick={() => {
                  if (versions.save(`Auto-saved before loading ${pending.label}`.slice(0, 60))) {
                    doReplace(pending.cv, pending.label, pending.loadId);
                    setPending(null);
                  }
                }}
                className={btnPrimary}
              >
                Save current first
              </button>
            </div>
          </Modal>
        )}
        {(busy || toast) && (
          <div
            role="status"
            data-testid="toast"
            className="no-print fixed bottom-16 left-1/2 z-[60] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-xl"
          >
            {busy ? `⏳ ${busy}` : toast}
          </div>
        )}
        <CVDocument data={data} update={update} editing={editing} guides={editing ? 0 : docHeight} filter={filter} />
        <div aria-hidden inert className="no-print pointer-events-none absolute left-[-99999px] top-0 invisible">
          <EditContext.Provider value={false}>
            <CVDocument data={data} update={() => {}} editing={false} innerRef={measureRef} measure />
          </EditContext.Provider>
        </div>
      </div>
    </EditContext.Provider>
  );
}

function CVDocument({
  data,
  update,
  editing,
  innerRef,
  measure,
  guides,
  filter,
}: {
  data: CVData;
  update: (fn: (d: CVData) => CVData) => void;
  editing: boolean;
  innerRef?: React.Ref<HTMLElement>;
  /** Hidden fixed-width copy used only to measure page length */
  measure?: boolean;
  /** Content height in px, when page-break guides should be drawn */
  guides?: number;
  /** View-mode skill filter (never passed to the hidden measuring copy, and ignored when printing) */
  filter?: SkillFilter;
}) {
  const setHeader = (p: Partial<CVData["header"]>) => update((d) => ({ ...d, header: { ...d.header, ...p } }));
  const setSkills = (p: Partial<CVData["skills"]>) => update((d) => ({ ...d, skills: { ...d.skills, ...p } }));

  const add = (key: ListKey, item: object) =>
    update((d) => ({ ...d, [key]: [...(d[key] as object[]), { id: newId(), ...item }] }));
  const patch = (key: ListKey, id: string, p: object) =>
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const remove = (key: ListKey, id: string) =>
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((i) => i.id !== id) }));
  const patchLink = (id: string, p: object) =>
    setHeader({ links: data.header.links.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const { header: h, skills: s } = data;
  const show = (visible: boolean) => editing || visible;
  const anyContent = hasHeader(data) || Object.values(has).some((f) => f(data));

  // ---- Skill filter (View mode only): highlight / dim / hide experience and projects by mentioned skills ----
  const filterOn = !editing && !!filter && filter.selected.length > 0;
  const hitsOf = (fields: string[]) => (filterOn && filter ? matchedSkills(filter.selected, fields) : []);
  const fxOf = (fields: string[]): FxState | undefined =>
    !filterOn ? undefined : hitsOf(fields).length ? "hit" : filter?.onlyMatches ? "hide" : "dim";
  const badgeOf = (fields: string[]) => {
    const hits = hitsOf(fields);
    return hits.length ? <p className="fx-badge no-print">Matches: {hits.join(", ")}</p> : null;
  };
  const noMatchNote = (all: string[][]) =>
    filterOn && filter?.onlyMatches && all.length > 0 && all.every((f) => hitsOf(f).length === 0) ? (
      <p className="fx-badge no-print">No entries here mention the selected skills.</p>
    ) : null;

  const experienceSection = (key: "experience" | "internships", title: string, addLabel: string, noun: string) => (
    <Section title={title} visible={show(has[key](data))}>
      <div className="space-y-4">
        {data[key].map((x) => (
          <Card key={x.id} onRemove={() => remove(key, x.id)} label={`Remove ${noun}`} fx={fxOf(experienceFields(x))}>
          {badgeOf(experienceFields(x))}
            <CardHead
              title={<Editable value={x.title} onChange={(title) => patch(key, x.id, { title })} placeholder="Add your job title" />}
              subtitle={<Editable value={x.company} onChange={(company) => patch(key, x.id, { company })} placeholder="Add company / organisation" />}
              right={<DateRange from={x.from} to={x.to} onChange={(p) => patch(key, x.id, p)} label={noun} />}
            />
            {(editing || nonBlank(x.responsibilities).length > 0) && (
              <div className="mt-3 text-slate-600">
                {editing && <SubLabel>Key tasks, activities &amp; responsibilities (Enter = new bullet)</SubLabel>}
                <BulletList
                  items={x.responsibilities}
                  onChange={(responsibilities) => patch(key, x.id, { responsibilities })}
                  placeholder="Add a key task or responsibility"
                />
              </div>
            )}
            <TagsRow
              label="Key Technologies:"
              tags={x.technologies}
              onChange={(technologies) => patch(key, x.id, { technologies })}
              placeholder="Add technologies used, comma-separated: Python, React, AWS"
            />
            <TagsRow
              label="Skills:"
              tags={x.skills}
              onChange={(skills) => patch(key, x.id, { skills })}
              placeholder="Add skills used or gained, comma-separated"
            />
            {(editing || nonBlank(x.outcomes).length > 0) && (
              <div className="mt-3 text-slate-600">
                <p className="mb-1 text-[0.95rem] font-bold text-slate-600">Outcomes &amp; Accomplishments:</p>
                <BulletList
                  items={x.outcomes}
                  onChange={(outcomes) => patch(key, x.id, { outcomes })}
                  placeholder="Add a measurable result or achievement"
                />
              </div>
            )}
          </Card>
        ))}
      </div>
      {noMatchNote(data[key].map(experienceFields))}
      <AddButton label={addLabel} onClick={() => add(key, blankExperience())} />
    </Section>
  );


  /* ---- Certifications & trainings: compact rows, optional "Other ..." line ---- */
  const addCert = () =>
    add("certifications", { name: "", issuer: "", validFrom: "", validTill: "", lifetime: false, display: "row" });
  const addTraining = () => add("trainings", { name: "", provider: "", completed: "", description: "", display: "row" });

  const folded = (name: string, meta: string[]) => {
    const m = meta.filter(Boolean).join(", ");
    return m ? `${name} (${m})` : name;
  };
  const certFolded = data.certifications
    .filter((x) => x.display === "line" && x.name.trim())
    .map((x) => folded(x.name.trim(), [x.issuer.trim(), fmtMonth(x.validFrom)]));
  const trainFolded = data.trainings
    .filter((x) => x.display === "line" && x.name.trim())
    .map((x) => folded(x.name.trim(), [x.provider.trim(), fmtMonth(x.completed)]));
  const foldedLine = (label: string, items: string[]) =>
    !editing && items.length > 0 ? (
      <p className="folded-line mt-1.5 text-[0.95rem] text-slate-600">
        <strong className="text-slate-700">{label}</strong> {items.join(", ")}
      </p>
    ) : null;

  const mergeToggle = () =>
    editing ? (
      <label className="no-print mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-500">
        <input
          type="checkbox"
          checked={data.mergeCertTraining}
          onChange={(e) => update((d) => ({ ...d, mergeCertTraining: e.target.checked }))}
          className="cursor-pointer accent-[var(--accent)]"
        />
        Combine Certifications and Trainings into one section (each entry keeps a type tag)
      </label>
    ) : null;

  const typeTag = (text: string) => (
    <span className="type-tag mr-2 rounded bg-white px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-[var(--ink)] ring-1 ring-[var(--accent)]/30">
      {text}
    </span>
  );

  const displayPicker = (value: Display, onChange: (v: Display) => void, lineLabel: string) =>
    editing ? (
      <label className="flex items-center gap-2 text-sm text-slate-500">
        On CV
        <select
          aria-label="How this entry appears on the CV"
          value={value}
          onChange={(e) => onChange(e.target.value as Display)}
          className="cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700"
        >
          <option value="row">Own row</option>
          <option value="line">{lineLabel}</option>
          <option value="hide">Hidden (kept, not shown)</option>
        </select>
      </label>
    ) : null;

  const certRow = (x: CVData["certifications"][number], tag: boolean) => {
    if (!editing && x.display !== "row") return null;
    return (
      <Card key={x.id} onRemove={() => remove("certifications", x.id)} label="Remove certification" dense muted={editing && x.display === "hide"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="min-w-0">
            {tag && typeTag("Certification")}
            <span className="font-semibold text-slate-800">
              <Editable value={x.name} onChange={(name) => patch("certifications", x.id, { name })} placeholder="Add certification name" />
            </span>
            {(editing || (x.name.trim() && x.issuer.trim())) && <span className="text-slate-400"> · </span>}
            <span className="font-medium text-[var(--ink)]">
              <Editable value={x.issuer} onChange={(issuer) => patch("certifications", x.id, { issuer })} placeholder="Add issuing body" />
            </span>
          </p>
          {!editing && (x.validFrom || x.validTill || x.lifetime) && (
            <span className="whitespace-nowrap text-sm text-slate-500">
              {x.lifetime
                ? `${x.validFrom ? `${fmtMonth(x.validFrom)} – ` : ""}Lifetime validity`
                : `Valid ${fmtRange(x.validFrom, x.validTill)}`}
            </span>
          )}
        </div>
        {editing && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <label className="flex items-center gap-2">
              Valid from
              <DateField value={x.validFrom} onChange={(validFrom) => patch("certifications", x.id, { validFrom })} label="Valid from" />
            </label>
            {!x.lifetime && (
              <label className="flex items-center gap-2">
                Valid till
                <DateField value={x.validTill} onChange={(validTill) => patch("certifications", x.id, { validTill })} label="Valid till" />
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={x.lifetime}
                onChange={(e) => patch("certifications", x.id, { lifetime: e.target.checked, validTill: "" })}
                className="cursor-pointer accent-[var(--accent)]"
              />
              Lifetime validity (no expiry)
            </label>
            {displayPicker(x.display, (display) => patch("certifications", x.id, { display }), 'In "Other certifications" line')}
          </div>
        )}
      </Card>
    );
  };

  const trainingRow = (x: CVData["trainings"][number], tag: boolean) => {
    if (!editing && x.display !== "row") return null;
    return (
      <Card key={x.id} onRemove={() => remove("trainings", x.id)} label="Remove training" dense muted={editing && x.display === "hide"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="min-w-0">
            {tag && typeTag("Training")}
            <span className="font-semibold text-slate-800">
              <Editable value={x.name} onChange={(name) => patch("trainings", x.id, { name })} placeholder="Add training / course name" />
            </span>
            {(editing || (x.name.trim() && x.provider.trim())) && <span className="text-slate-400"> · </span>}
            <span className="font-medium text-[var(--ink)]">
              <Editable value={x.provider} onChange={(provider) => patch("trainings", x.id, { provider })} placeholder="Add provider (e.g. Coursera)" />
            </span>
          </p>
          {editing ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label className="flex items-center gap-2 text-sm text-slate-500">
                Completed
                <DateField value={x.completed} onChange={(completed) => patch("trainings", x.id, { completed })} label="Completion date" />
              </label>
              {displayPicker(x.display, (display) => patch("trainings", x.id, { display }), 'In "Other trainings" line')}
            </div>
          ) : (
            x.completed && <span className="whitespace-nowrap text-sm text-slate-500">{fmtMonth(x.completed)}</span>
          )}
        </div>
        {(editing || x.description.trim()) && (
          <p className="mt-0.5 text-sm text-slate-600">
            <Editable multiline value={x.description} onChange={(description) => patch("trainings", x.id, { description })} placeholder="Add what you learned (optional, keep it to one line)" />
          </p>
        )}
      </Card>
    );
  };

  return (
  <main ref={innerRef} className={`cv-card relative overflow-hidden rounded-2xl bg-white text-[15px] shadow-xl ring-1 ring-slate-200 ${measure ? "w-[794px]" : "mx-3 my-6 max-w-[794px] min-[818px]:mx-auto"}`}>
    {!!guides && !measure && <PageGuides height={guides} />}
    {/* HEADER BANNER: left aligned, photo top-aligned with the name */}
    <header className={`relative overflow-hidden px-5 py-3.5 text-left sm:px-10 ${data.headerStyle === "classic" ? "header-classic" : "on-dark bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"}`}>
      <div aria-hidden className="deco pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
      <div aria-hidden className="deco pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-black/10" />
      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <PhotoUpload photo={h.photo} photos={h.photos} portfolioPhoto={h.portfolioPhoto} onChange={(photo) => setHeader({ photo })} onPatch={setHeader} />
        <div className="min-w-0 flex-1">
          {/* identity (left) + contact details (right) */}
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <h1 className="name-trim text-[1.6rem] font-bold leading-none tracking-tight sm:text-[1.9rem]">
                <Editable value={h.name} onChange={(name) => setHeader({ name })} placeholder="Add your full name" />
              </h1>
              <p className="mt-1.5 text-[0.95rem] font-light text-white/95 sm:text-base">
                <Editable
                  value={h.headline}
                  onChange={(headline) => setHeader({ headline })}
                  placeholder="Add your aim, e.g. Seeking Part-Time Software Development Role"
                />
              </p>
              {(editing || h.highlights.trim()) && (
                <p className="hl mt-0.5 text-sm font-semibold tracking-wide text-white">
                  <Editable
                    value={h.highlights}
                    onChange={(highlights) => setHeader({ highlights })}
                    placeholder="Add Key Positions & high-impact words: Software Developer | AI Enthusiast | Fast Learner"
                  />
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 text-[13px] text-white/95 sm:max-w-[16rem]">
              <Contact icon="mail" value={h.email} onChange={(email) => setHeader({ email })} placeholder="Add your email" />
              <Contact icon="phone" value={h.phone} onChange={(phone) => setHeader({ phone })} placeholder="Add your phone" />
              <Contact icon="pin" value={h.location} onChange={(location) => setHeader({ location })} placeholder="Add your location" />
            </div>
          </div>
          {(editing || h.links.some((l) => l.url.trim())) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
              {h.links.filter((l) => editing || l.url.trim()).map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5">
                  <SocialIcon platform={l.platform} size={18} />
                  {editing ? (
                    <>
                      <select
                        aria-label="Link platform"
                        value={l.platform}
                        onChange={(ev) => patchLink(l.id, { platform: ev.target.value as LinkPlatform })}
                        className="cursor-pointer rounded bg-white/15 px-1 font-medium [&>option]:text-slate-900"
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      <Editable value={l.url} onChange={(url) => patchLink(l.id, { url })} placeholder="paste profile URL" />
                      <button
                        type="button"
                        aria-label="Remove link"
                        onClick={() => setHeader({ links: h.links.filter((x) => x.id !== l.id) })}
                        className="cursor-pointer rounded-full px-1.5 leading-none text-white/70 hover:bg-white/20 hover:text-white"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    l.url.trim() && (
                      <a href={hrefFor(l.url)} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        {displayUrl(l.url)}
                      </a>
                    )
                  )}
                </span>
              ))}
              {editing && (
                <button
                  type="button"
                  onClick={() => setHeader({ links: [...h.links, { id: newId(), platform: "LinkedIn", url: "" }] })}
                  className="cursor-pointer rounded-full border border-dashed border-white/60 px-2.5 py-0.5 hover:bg-white/15"
                >
                  + Add link (LinkedIn, GitHub, Website…)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {/* QUICK FACTS STRIP: availability + work eligibility, right under the banner */}
    {(editing || h.availability.trim() || h.workEligibility.trim() || h.visaStatus.trim()) && (
      <div className={`flex flex-wrap gap-x-8 gap-y-1 border-b border-[var(--accent)]/15 bg-[var(--tint)] px-5 py-2 text-sm font-medium text-slate-700 sm:px-10 [&_svg]:text-[var(--ink)]`}>
        <Contact icon="clock" value={h.availability} onChange={(availability) => setHeader({ availability })} placeholder="Add availability, e.g. Weekends & evenings, up to 20 hrs/week" />
        <Contact icon="check" value={h.workEligibility} onChange={(workEligibility) => setHeader({ workEligibility })} placeholder="Add work eligibility, e.g. Right to work in the UK" />
        <Contact icon="badge" label="Visa / work status:" value={h.visaStatus} onChange={(visaStatus) => setHeader({ visaStatus })} placeholder="Add visa / work status (optional), e.g. Student visa, up to 20 hrs/week in term" />
      </div>
    )}

    <div className="px-5 pb-10 pt-2 sm:px-10">
      {!editing && !anyContent && (
        <p className="py-10 text-center text-slate-500">Nothing to show yet. Switch to Edit and fill something in.</p>
      )}

      {/* AT A GLANCE: headline numbers, optional */}
      <Section title="Key Highlights" visible={show(has.stats(data))} compact hideTitle={!editing}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.stats
            .filter((x) => editing || x.value.trim() || x.label.trim())
            .map((x) => (
              <div key={x.id} className="relative rounded-lg bg-[var(--tint)] px-2 py-2 text-center ring-1 ring-[var(--accent)]/15">
                <div className="text-xl font-extrabold leading-tight text-[var(--ink)]">
                  <Editable value={x.value} onChange={(value) => patch("stats", x.id, { value })} placeholder="100+" />
                </div>
                <div className="text-xs font-medium text-slate-600">
                  <Editable value={x.label} onChange={(label) => patch("stats", x.id, { label })} placeholder="What it measures" />
                </div>
                {editing && (
                  <div className="absolute right-1 top-1">
                    <RemoveButton label="Remove stat" onClick={() => remove("stats", x.id)} />
                  </div>
                )}
              </div>
            ))}
        </div>
        {data.stats.length < 4 && <AddButton label="Add Highlight Number" onClick={() => add("stats", { value: "", label: "" })} />}
      </Section>

      {/* 1. CAREER SNAPSHOT */}
      <Section title="Professional Summary" visible={show(has.summary(data))}>
        <p className="leading-relaxed text-slate-700">
          <Editable
            multiline
            value={data.summary}
            onChange={(summary) => update((d) => ({ ...d, summary }))}
            placeholder="Add 2–3 punchy sentences: who you are, what you bring, and the role you want"
          />
        </p>
      </Section>

      {/* 2. EDUCATION: degree first, institution below, date pill right */}
      <Section title="Education" visible={show(has.education(data))}>
        <div className="space-y-4">
          {data.education.map((x) => (
            <Card key={x.id} onRemove={() => remove("education", x.id)} label="Remove education">
              <CardHead
                title={<Editable value={x.degree} onChange={(degree) => patch("education", x.id, { degree })} placeholder="Add degree / qualification, e.g. BSc Computer Science" />}
                subtitle={<Editable value={x.institution} onChange={(institution) => patch("education", x.id, { institution })} placeholder="Add university / school" />}
                right={
                  editing ? null : x.current ? (
                    <DatePill>Expected graduation: {expectedGraduation(x.yearOfStudy, x.courseLength)}</DatePill>
                  ) : x.end ? (
                    <DatePill>{fmtMonth(x.end)}</DatePill>
                  ) : null
                }
              />
              {editing && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <select
                    aria-label="Study status"
                    value={x.current ? "current" : "done"}
                    onChange={(ev) => patch("education", x.id, { current: ev.target.value === "current" })}
                    className="cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700"
                  >
                    <option value="current">Currently studying</option>
                    <option value="done">Completed</option>
                  </select>
                  {x.current ? (
                    <>
                      <select
                        aria-label="Year of study"
                        value={x.yearOfStudy}
                        onChange={(ev) => patch("education", x.id, { yearOfStudy: Number(ev.target.value) })}
                        className="cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700"
                      >
                        {Array.from({ length: x.courseLength }, (_, i) => i + 1).map((y) => (
                          <option key={y} value={y}>
                            Year {y}
                          </option>
                        ))}
                      </select>
                      <span>of</span>
                      <select
                        aria-label="Course length in years"
                        value={x.courseLength}
                        onChange={(ev) => {
                          const courseLength = Number(ev.target.value);
                          patch("education", x.id, { courseLength, yearOfStudy: Math.min(x.yearOfStudy, courseLength) });
                        }}
                        className="cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-slate-700"
                      >
                        {[1, 2, 3, 4, 5, 6].map((y) => (
                          <option key={y} value={y}>
                            {y} yrs
                          </option>
                        ))}
                      </select>
                      <span>
                        Expected graduation: <strong data-testid="grad">{expectedGraduation(x.yearOfStudy, x.courseLength)}</strong>
                      </span>
                    </>
                  ) : (
                    <label className="flex items-center gap-2">
                      Completed on
                      <DateField value={x.end} onChange={(end) => patch("education", x.id, { end })} label="Completion date" />
                    </label>
                  )}
                </div>
              )}
              {(editing || x.current || x.grades.trim() || x.coursework.trim() || x.notes.trim()) && (
              <div className="mt-3 space-y-0.5 text-slate-600">
                {!editing && x.current && <p className="text-sm">Year {x.yearOfStudy} of {x.courseLength}</p>}
                <FieldLine label="Grades:" show={!!x.grades.trim()}>
                  <Editable value={x.grades} onChange={(grades) => patch("education", x.id, { grades })} placeholder="Add grades / GPA (optional)" />
                </FieldLine>
                <FieldLine label="Relevant coursework:" show={!!x.coursework.trim()}>
                  <Editable value={x.coursework} onChange={(coursework) => patch("education", x.id, { coursework })} placeholder="Add modules, e.g. Data Structures, Machine Learning" />
                </FieldLine>
                <FieldLine label="" show={!!x.notes.trim()}>
                  <Editable multiline value={x.notes} onChange={(notes) => patch("education", x.id, { notes })} placeholder="Add honours, dissertation or other achievements (optional)" />
                </FieldLine>
              </div>
            )}
            </Card>
          ))}
        </div>
        <AddButton label="Add Education" onClick={() => add("education", blankEducation())} />
      </Section>

      {/* 3 + 4. EXPERIENCE */}
      {experienceSection("experience", "Work Experience", "Add Experience", "experience")}
      {experienceSection("internships", "Internships", "Add Internship", "internship")}

      {/* 5. PROJECTS */}
      <Section title="Projects" visible={show(has.projects(data))}>
        <div className="space-y-4">
          {data.projects.map((x) => (
            <Card key={x.id} onRemove={() => remove("projects", x.id)} label="Remove project" fx={fxOf(projectFields(x))}>
              {badgeOf(projectFields(x))}
              <CardHead
                title={<Editable value={x.name} onChange={(name) => patch("projects", x.id, { name })} placeholder="Add project name" />}
                subtitle={<Editable value={x.organization} onChange={(organization) => patch("projects", x.id, { organization })} placeholder="Add school / organisation / company where this was done" />}
                right={<DateRange from={x.from} to={x.to} onChange={(p) => patch("projects", x.id, p)} label="Project" />}
              />
              {(editing || x.description.trim()) && (
                <p className="mt-2 text-slate-600">
                  <Editable multiline value={x.description} onChange={(description) => patch("projects", x.id, { description })} placeholder="Add a short project summary: what it does and why it matters" />
                </p>
              )}
              {(editing || nonBlank(x.details).length > 0) && (
                <div className="mt-2 text-slate-600">
                  {editing && <SubLabel>Project details: your role, what you built, results (Enter = new bullet)</SubLabel>}
                  <BulletList items={x.details} onChange={(details) => patch("projects", x.id, { details })} placeholder="Add a project detail" />
                </div>
              )}
              <TagsRow label="Tech Used:" tags={x.tech} onChange={(tech) => patch("projects", x.id, { tech })} placeholder="Add tech used, comma-separated" />
              {(editing || x.link) && (
                <p className="mt-2 text-sm">
                  {editing ? (
                    <>
                      <Label>Link: </Label>
                      <Editable value={x.link} onChange={(link) => patch("projects", x.id, { link })} placeholder="Add GitHub / demo link" />
                    </>
                  ) : (
                    <a href={hrefFor(x.link)} target="_blank" rel="noreferrer" className="font-medium text-[var(--ink)] underline">
                      {x.link}
                    </a>
                  )}
                </p>
              )}
            </Card>
          ))}
        </div>
        {noMatchNote(data.projects.map(projectFields))}
        <AddButton label="Add Project" onClick={() => add("projects", { name: "", organization: "", description: "", details: [""], tech: [], link: "", from: "", to: "" })} />
      </Section>

      {/* 6. SKILLS */}
      <Section title="Skills" visible={show(has.skills(data))}>
        {!editing && filter && filter.selected.length === 0 && (
          <p className="fx-badge no-print mb-2 !font-normal !text-slate-400">Click a skill to highlight the experience and projects that mention it.</p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <SkillRow label="Technical" show={s.technical.length > 0}>
            <TagList selected={!editing ? filter?.selected : undefined} onToggle={!editing ? filter?.toggle : undefined} tags={s.technical} onChange={(technical) => setSkills({ technical })} placeholder="Add skills, comma-separated: Python, React, Git" />
          </SkillRow>
          <SkillRow label="Languages" show={s.languages.length > 0}>
            <TagList selected={!editing ? filter?.selected : undefined} onToggle={!editing ? filter?.toggle : undefined} tags={s.languages} onChange={(languages) => setSkills({ languages })} placeholder="Add languages: English, Hindi" />
          </SkillRow>
          <SkillRow label="Soft skills" show={s.soft.length > 0}>
            <TagList selected={!editing ? filter?.selected : undefined} onToggle={!editing ? filter?.toggle : undefined} tags={s.soft} onChange={(soft) => setSkills({ soft })} placeholder="Add soft skills: Teamwork, Communication" />
          </SkillRow>
        </div>
      </Section>

      {/* 7 + 8. CERTIFICATIONS and TRAININGS: separate sections, or one merged section with type tags */}
      {data.mergeCertTraining ? (
        <Section title="Certifications & Training" visible={show(has.certifications(data) || has.trainings(data))}>
          {mergeToggle()}
          <div className={editing ? "space-y-3" : "space-y-1.5"}>
            {data.certifications.map((x) => certRow(x, true))}
            {data.trainings.map((x) => trainingRow(x, true))}
          </div>
          {foldedLine("Other certifications:", certFolded)}
          {foldedLine("Other Trainings:", trainFolded)}
          <div className="flex flex-wrap gap-2">
            <AddButton label="Add Certification" onClick={addCert} />
            <AddButton label="Add Training / Course" onClick={addTraining} />
          </div>
        </Section>
      ) : (
        <>
          <Section title="Certifications" visible={show(has.certifications(data))}>
            {mergeToggle()}
            <div className={editing ? "space-y-3" : "space-y-1.5"}>{data.certifications.map((x) => certRow(x, false))}</div>
            {foldedLine("Other certifications:", certFolded)}
            <AddButton label="Add Certification" onClick={addCert} />
          </Section>
          <Section title="Training & Courses" visible={show(has.trainings(data))}>
            <div className={editing ? "space-y-3" : "space-y-1.5"}>{data.trainings.map((x) => trainingRow(x, false))}</div>
            {foldedLine("Other Trainings:", trainFolded)}
            <AddButton label="Add Training / Course" onClick={addTraining} />
          </Section>
        </>
      )}

      {/* 9. AWARDS: template style, title + "date - details" */}
      <Section title="Awards & Recognition" visible={show(has.awards(data))}>
        <div className="space-y-3">
          {data.awards.map((x) => (
            <Card key={x.id} onRemove={() => remove("awards", x.id)} label="Remove award" thin>
              <p className="font-semibold text-slate-800">
                <Editable value={x.title} onChange={(title) => patch("awards", x.id, { title })} placeholder="Add award / recognition name" />
              </p>
              {editing ? (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                  <DateField value={x.date} onChange={(date) => patch("awards", x.id, { date })} label="Award date" />
                  <span>–</span>
                  <Editable value={x.issuer} onChange={(issuer) => patch("awards", x.id, { issuer })} placeholder="Awarding body" />
                  <span>–</span>
                  <Editable value={x.description} onChange={(description) => patch("awards", x.id, { description })} placeholder="Brief description of the achievement" />
                </div>
              ) : (
                <p className="text-[0.9rem] text-slate-500">
                  {[fmtMonth(x.date), x.issuer.trim(), x.description.trim()].filter(Boolean).join(" - ")}
                </p>
              )}
            </Card>
          ))}
        </div>
        <AddButton label="Add Achievement" onClick={() => add("awards", { title: "", issuer: "", date: "", description: "" })} />
      </Section>

      {/* 10. EXTRACURRICULAR */}
      <Section title="Extracurricular & Volunteering" visible={show(has.extracurricular(data))}>
        <div className="space-y-3">
          {data.extracurricular.map((x) => (
            <Card key={x.id} onRemove={() => remove("extracurricular", x.id)} label="Remove activity" thin>
              <CardHead
                title={<Editable value={x.activity} onChange={(activity) => patch("extracurricular", x.id, { activity })} placeholder="Add activity (sport, hobby, volunteering)" />}
                right={<DateRange from={x.from} to={x.to} onChange={(p) => patch("extracurricular", x.id, p)} label="Activity" />}
              />
              {(editing || x.description.trim()) && (
                <p className="mt-1 text-slate-600">
                  <Editable multiline value={x.description} onChange={(description) => patch("extracurricular", x.id, { description })} placeholder="Add a short description" />
                </p>
              )}
            </Card>
          ))}
        </div>
        <AddButton label="Add Activity" onClick={() => add("extracurricular", { activity: "", description: "", from: "", to: "" })} />
      </Section>

      {/* 11. PERSONAL DETAILS: optional, last; can be left out of a printout from Print options */}
      <div className="cv-personal">
        <Section title="Personal Details" visible={show(Boolean(h.dateOfBirth || h.address.trim() || h.nationality.trim()))}>
          <div className="flex flex-wrap gap-x-8 gap-y-1.5 text-slate-700">
            {(editing || h.dateOfBirth) && (
              <span>
                <Label>Date of birth: </Label>
                <FullDateField value={h.dateOfBirth} onChange={(dateOfBirth) => setHeader({ dateOfBirth })} label="Date of birth" />
              </span>
            )}
            {(editing || h.nationality.trim()) && (
              <span>
                <Label>Nationality: </Label>
                <Editable value={h.nationality} onChange={(nationality) => setHeader({ nationality })} placeholder="Add nationality (optional)" />
              </span>
            )}
            {(editing || h.address.trim()) && (
              <span>
                <Label>Address: </Label>
                <Editable value={h.address} onChange={(address) => setHeader({ address })} placeholder="Add home address (optional)" />
              </span>
            )}
          </div>
          {editing && (
            <p className="no-print mt-2 text-xs italic text-slate-400">
              Optional. UK and US employers usually don&apos;t need these, and never a passport number. Untick &quot;Include personal details&quot; in Print options to leave this block out of a PDF.
            </p>
          )}
        </Section>
      </div>

      {editing && <AddMissing data={data} />}
    </div>
  </main>
  );
}

/** Dashed A4 page-break markers, positioned from the top of the card. */
function PageGuides({ height }: { height: number }) {
  const breaks = [];
  for (let n = 1; n * PAGE_PX < height; n++) breaks.push(n);
  return (
    <>
      {breaks.map((n) => (
        <div
          key={n}
          aria-hidden
          className="no-print pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-dashed border-rose-400"
          style={{ top: n * PAGE_PX }}
        >
          <span className="absolute right-3 top-0 -translate-y-full rounded-t bg-rose-400 px-2 py-0.5 text-[11px] font-medium text-white">
            Page {n} ends{n === 2 ? " · UK 2-page limit" : ""}
          </span>
        </div>
      ))}
    </>
  );
}

/** Toolbar popover: colour theme (grouped by sector) and header style. */
function ThemePicker({
  theme,
  headerStyle,
  onTheme,
  onHeaderStyle,
}: {
  theme: ThemeId;
  headerStyle: HeaderStyle;
  onTheme: (id: ThemeId) => void;
  onHeaderStyle: (s: HeaderStyle) => void;
}) {
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

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
      >
        <span className="h-4 w-4 rounded-full" style={{ background: swatch(theme) }} />
        {THEMES[theme].label}
        <span aria-hidden className="text-xs text-slate-400">▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Theme and header style" className="absolute left-1/2 top-full z-30 mt-1 w-[min(23rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-slate-200">
          {THEME_GROUPS.map((g) => (
            <div key={g.id} className="mb-3">
              <p className="font-semibold text-slate-800">{g.title}</p>
              <p className="mb-1.5 text-xs text-slate-500">{g.note}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.ids.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={theme === id}
                    onClick={() => onTheme(id)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                      theme === id ? "border-slate-700 bg-slate-50 font-semibold" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: swatch(id) }} />
                    {THEMES[id].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3">
            <p className="font-semibold text-slate-800">Header style</p>
            <p className="mb-1.5 text-xs text-slate-500">Classic suits law, finance and black-and-white printing</p>
            <div className="inline-flex overflow-hidden rounded-full border border-slate-300">
              {(["banner", "classic"] as HeaderStyle[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={headerStyle === h}
                  onClick={() => onHeaderStyle(h)}
                  className={`cursor-pointer px-3.5 py-1 ${headerStyle === h ? "bg-[var(--ink)] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {h === "banner" ? "Colour banner" : "Classic (white)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Contact({ icon, value, onChange, placeholder, label }: { icon: string; value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
  const editing = useEditing();
  if (!editing && !value.trim()) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name={icon} />
      {label && <span className="text-slate-500">{label}</span>}
      <Editable value={value} onChange={onChange} placeholder={placeholder} />
    </span>
  );
}

/** Edit mode only: a hint that empty sections will not appear in Preview. */
function AddMissing({ data }: { data: CVData }) {
  const empty = [
    !data.experience.length && "Work Experience",
    !data.internships.length && "Internships",
    !data.projects.length && "Projects",
    !data.certifications.length && "Certifications",
    !data.trainings.length && "Trainings",
    !data.awards.length && "Awards",
    !data.extracurricular.length && "Extracurricular",
  ].filter(Boolean);
  if (!empty.length) return null;
  return (
    <p className="no-print mt-10 text-center text-xs text-slate-400">
      Empty sections ({empty.join(", ")}) are hidden in View mode until you add content.
    </p>
  );
}

/** Template-style item: light grey card, thick accent bar on the left. */
function Card({ children, onRemove, label, thin, dense, muted, fx }: { children: React.ReactNode; onRemove: () => void; label: string; thin?: boolean; dense?: boolean; muted?: boolean; fx?: FxState }) {
  const editing = useEditing();
  return (
    <div
      className={`relative break-inside-avoid ${fx ? `fx-${fx}` : ""} ${!thin && !dense ? "card-split" : ""} ${muted ? "opacity-50" : ""} rounded-md bg-slate-50 border-[var(--accent)] ${dense ? (editing ? "border-l-[3px] p-3" : "border-l-[3px] px-3 py-1.5") : thin ? "border-l-[3px] p-3" : "border-l-4 p-4"} ${editing ? "pr-10" : ""}`}
    >
      {children}
      {editing && (
        <div className="absolute right-1.5 top-1.5">
          <RemoveButton label={label} onClick={onRemove} />
        </div>
      )}
    </div>
  );
}

/** Title (bold) + subtitle (accent colour) on the left, date/pill on the right. */
function CardHead({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card-head flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <div className="text-[1.1rem] font-semibold leading-snug text-slate-800">{title}</div>
        {subtitle && <div className="font-medium text-[var(--ink)]">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{children}</p>;
}

/** "Key Technologies: a, b, c" in preview (like the template); tag input in edit mode. */
function TagsRow({ label, tags, onChange, placeholder }: { label: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const editing = useEditing();
  if (!editing && tags.length === 0) return null;
  return (
    <div className="mt-3 text-[0.95rem] text-slate-600">
      {editing ? (
        <div className="flex flex-wrap items-start gap-2">
          <strong className="pt-0.5">{label}</strong>
          <div className="min-w-0 flex-1">
            <TagList tags={tags} onChange={onChange} placeholder={placeholder} />
          </div>
        </div>
      ) : (
        <p>
          <strong>{label}</strong> {tags.join(", ")}
        </p>
      )}
    </div>
  );
}

function FieldLine({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  const editing = useEditing();
  if (!editing && !show) return null;
  return (
    <p className="text-[0.95rem]">
      {label && <Label>{label} </Label>}
      {children}
    </p>
  );
}

function SkillRow({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  const editing = useEditing();
  if (!editing && !show) return null;
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      {children}
    </div>
  );
}
