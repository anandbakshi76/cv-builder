"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CVSheet from "@/components/portfolio/CVSheet";
import OnePagerView from "@/components/portfolio/OnePagerView";
import { usePortfolio } from "@/components/portfolio/PortfolioShell";
import { Container, PageHero, btnOutline, btnPrimary } from "@/components/portfolio/ui";
import { buildModel } from "@/lib/export/model";
import { downloadBlob, downloadText, fileBase, toPlainText } from "@/lib/export/formats";
import { layoutOnePager } from "@/lib/export/pptx";
import { THEMES } from "@/lib/themes";

/* Two views of the same CV:
   - "One-page profile": the one-page slide (same layout as the downloadable PowerPoint), shown on screen;
   - "Full CV": the complete read-only CV.
   Print/PDF: the browser's own "Save as PDF" gives real, selectable text. Colours are kept; the portfolio frame
   (header, footer, buttons) is hidden by print:hidden; the full CV prints on a named A4 page and the slide on a named
   landscape page of its own size. */
const PRINT_CSS = `
@page pfcv { size: A4; margin: 12mm; }
@page pfslide { size: 1280px 720px; margin: 0; }
@media print {
  body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pf-cv-sheet { page: pfcv; box-shadow: none !important; border-radius: 0 !important; max-width: none !important; margin: 0 !important; --tw-ring-shadow: 0 0 #0000 !important; }
  .pf-cv-section, .pf-cv-entry { break-inside: avoid; }
  .pf-slide-wrap { height: auto !important; width: 1280px !important; overflow: visible !important; padding: 0 !important; }
  .pf-slide-box { width: 1280px !important; height: 720px !important; }
  .pf-slide-stage { page: pfslide; transform: none !important; box-shadow: none !important; border-radius: 0 !important; --tw-ring-shadow: 0 0 #0000 !important; }
}
`;

type View = "slide" | "document";

export default function CVPage() {
  const { cv, palette } = usePortfolio();
  const [view, setView] = useState<View>("slide");
  const [colour, setColour] = useState(true);
  const [photo, setPhoto] = useState(true);
  const [personal, setPersonal] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const m = useMemo(() => buildModel(cv, { photo, personal }), [cv, photo, personal]);
  const theme = THEMES[cv.theme] ?? THEMES.teal;
  const base = fileBase(cv.header.name);
  const slideOpts = useMemo(() => ({ colour, classic: false, theme: palette }), [colour, palette]);
  const slide = useMemo(() => layoutOnePager(m, slideOpts), [m, slideOpts]);

  // ?view=document opens the full CV directly
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "document" || q === "slide") setView(q);
    else if (window.innerWidth < 640) setView("document"); // phones: the full CV reads better than a small slide
  }, []);
  const pick = (v: View) => {
    setView(v);
    const u = new URL(window.location.href);
    u.searchParams.set("view", v);
    window.history.replaceState(null, "", u);
  };

  const title = `CV | ${cv.header.name.trim() || "Portfolio"}`;
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    // Name the saved PDF after the person (the browser uses the page title) while the print dialog is open
    const before = () => {
      document.title = view === "slide" ? fileBase(cv.header.name, "OnePager") : base;
    };
    const after = () => {
      document.title = title;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [base, cv.header.name, title, view]);

  const note = (t: string) => {
    setMsg(t);
    window.setTimeout(() => setMsg(""), 4000);
  };
  const word = async () => {
    setBusy("word");
    try {
      const { toDocxBlob } = await import("@/lib/export/docx");
      downloadBlob(await toDocxBlob(m, { colour: true, classic: cv.headerStyle === "classic", theme }), `${base}.docx`);
      note("Word document downloaded.");
    } catch {
      note("Could not create the Word file.");
    }
    setBusy("");
  };
  const html = async () => {
    const { toHtml } = await import("@/lib/export/html");
    downloadText(toHtml(m, { colour: true, classic: cv.headerStyle === "classic", theme }), `${base}.html`, "text/html");
    note("HTML page downloaded.");
  };
  const text = () => {
    downloadText(toPlainText(buildModel(cv, { photo: false, personal })), `${base}.txt`);
    note("Text file downloaded.");
  };
  const pptx = async () => {
    setBusy("pptx");
    try {
      const { toPptxBlob } = await import("@/lib/export/pptx");
      const r = await toPptxBlob(m, slideOpts);
      downloadBlob(r.blob, `${fileBase(cv.header.name, "OnePager")}.pptx`);
      note(r.fits ? "PowerPoint downloaded." : "PowerPoint downloaded, but it was too long for one slide.");
    } catch {
      note("Could not create the PowerPoint file.");
    }
    setBusy("");
  };

  const tab = (v: View, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => pick(v)}
      className={`cursor-pointer rounded-full px-5 py-2 text-sm font-bold transition ${view === v ? "bg-[var(--ink)] text-white shadow" : "text-slate-600 hover:bg-white"}`}
    >
      {label}
    </button>
  );
  const shortened = slide.trimLevel > 0 || slide.size < 10.5;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHero eyebrow="Curriculum vitae" title="My CV" lead="See my whole CV on one page, or read the full version. Print it, save it as a PDF, or download it as PowerPoint or Word." />

      <section className="bg-slate-50 py-8 print:bg-white print:py-0 sm:py-12">
        <Container className="print:max-w-none print:px-0">
          <div className="print:hidden mx-auto mb-6 max-w-[1280px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="CV view" className="inline-flex gap-1 rounded-full bg-slate-200/70 p-1">
                {tab("slide", "One-page profile")}
                {tab("document", "Full CV")}
              </div>
              <Link href="/" className="text-sm font-bold text-[var(--ink)] hover:underline">
                Open in the CV builder ↗
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={btnPrimary} onClick={() => window.print()}>
                Print / Save as PDF
              </button>
              {view === "slide" ? (
                <button type="button" className={btnOutline} onClick={pptx} disabled={busy === "pptx"}>
                  {busy === "pptx" ? "Preparing…" : "PowerPoint (.pptx)"}
                </button>
              ) : (
                <>
                  <button type="button" className={btnOutline} onClick={word} disabled={busy === "word"}>
                    {busy === "word" ? "Preparing…" : "Word (.docx)"}
                  </button>
                  <button type="button" className={btnOutline} onClick={html}>
                    HTML page
                  </button>
                  <button type="button" className={btnOutline} onClick={text}>
                    Plain text
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              {view === "slide" && (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={colour} onChange={(e) => setColour(e.target.checked)} /> Colour
                </label>
              )}
              <label className={`inline-flex items-center gap-2 ${cv.header.photo ? "" : "opacity-50"}`}>
                <input type="checkbox" checked={photo && !!cv.header.photo} disabled={!cv.header.photo} onChange={(e) => setPhoto(e.target.checked)} /> Include photo
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} /> Include personal details (date of birth, address, nationality)
              </label>
              <span role="status" aria-live="polite" className="font-semibold text-[var(--ink)]">
                {msg}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              For a PDF, choose “Save as PDF” as the printer in the print dialog (not “Adobe PDF”), so the text stays selectable.
              {view === "slide" && shortened && slide.fits && " To fit one page, some detail is shortened here; the Full CV has everything."}
              {view === "slide" && !slide.fits && " This CV is too long for one slide: the end is cut off. Use the Full CV."}
            </p>
          </div>

          {view === "slide" ? (
            <div className="mx-auto max-w-[1280px]" role="tabpanel" aria-label="One-page profile">
              <OnePagerView layout={slide} photo={m.photo} name={m.name} />
            </div>
          ) : (
            <div role="tabpanel" aria-label="Full CV">
              <CVSheet m={m} cv={cv} />
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
