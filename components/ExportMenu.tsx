"use client";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { hrefFor } from "@/lib/cv";
import { THEMES, swatch } from "@/lib/themes";
import { toDocxBlob } from "@/lib/export/docx";
import { toHtml } from "@/lib/export/html";
import { toPptxBlob } from "@/lib/export/pptx";
import { downloadBlob, downloadText, fileBase, LINKEDIN_LIMITS, parseImport, toJson, toLinkedIn, toPlainText } from "@/lib/export/formats";
import { buildModel, type ExportOptions } from "@/lib/export/model";
import type { CVData } from "@/lib/types";
import { btnPrimary, btnSecondary, Modal } from "./Modal";

interface Props {
  data: CVData;
  opts: ExportOptions;
  /** Starting choice for the Word dialog: true when the Print options are set to Colour */
  defaultColour: boolean;
  /** Same flow as the Print button: switches to View and opens the print dialog (choose Save as PDF) */
  onPrint: () => void;
  /** Called with the parsed CV from an imported JSON file; the editor decides how to replace the current CV */
  onImport: (cv: CVData, fileName: string) => void;
  notify: (message: string) => void;
  setBusy: (message: string | null) => void;
  /** Called after a successful export, so the matching saved version is marked "Exported" */
  onExported: () => void;
}

type Dialog = null | FileFormat | "linkedin" | "email" | "qr";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Toolbar "Export as" menu: PDF, Word, text, JSON, LinkedIn text, e-mail, QR code, and JSON import. */
export function ExportMenu({ data, opts, defaultColour, onPrint, onImport, notify, setBusy, onExported }: Props) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const name = data.header.name;

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

  const run = (fn: () => void | Promise<void>) => async () => {
    setOpen(false);
    try {
      await fn();
    } catch (e) {
      setBusy(null);
      notify(e instanceof Error ? e.message : "Export failed.");
    }
  };

  const exportText = run(() => {
    downloadText(toPlainText(buildModel(data, { ...opts, photo: false })), `${fileBase(name)}.txt`);
    notify("Text file downloaded.");
    onExported();
  });
  const exportJson = run(() => {
    downloadText(toJson(data), `${fileBase(name)}.json`, "application/json");
    notify("JSON backup downloaded.");
    onExported();
  });
  const exportPdf = run(() => {
    onPrint();
    onExported();
  });

  const item = (icon: string, label: string, note: string, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
    >
      <span aria-hidden className="w-5 pt-0.5 text-center">
        {icon}
      </span>
      <span>
        <span className="block font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{note}</span>
      </span>
    </button>
  );

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="cursor-pointer rounded-full bg-[var(--ink)] px-3.5 py-1 font-medium text-white hover:brightness-110"
      >
        Export As ▾
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Export options"
          className="absolute left-1/2 top-full z-30 mt-1 w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain rounded-xl bg-white p-2 text-sm shadow-xl ring-1 ring-slate-200"
        >
          {item("📄", "PDF", "Print or Save as PDF (choose Save as PDF as the destination)", exportPdf)}
          {item("📋", "Word Document (.docx)", "Editable in Word: choose colour or black & white, and the photo", () => {
            setOpen(false);
            setDialog("word");
          })}
          {item("🌐", "HTML Page (.html)", "One self-contained web page: open in any browser or put it on a website", () => {
            setOpen(false);
            setDialog("html");
          })}
          {item("📊", "One-Page PowerPoint (.pptx)", "Landscape one-pager, three columns, for sharing quickly", () => {
            setOpen(false);
            setDialog("ppt");
          })}
          {item("📝", "Text File (.txt)", "Plain text for ATS forms and copy-paste, no photo", exportText)}
          {item("💾", "JSON (.json)", "Backup of everything; can be imported back", exportJson)}
          {item("💼", "LinkedIn Format", "Headline, About, Experience and Skills ready to paste", () => {
            setOpen(false);
            setDialog("linkedin");
          })}
          {item("✉️", "Send Email", "Open an email draft with your CV text", () => {
            setOpen(false);
            setDialog("email");
          })}
          {item("📱", "QR Code", "For your contact card or a profile link", () => {
            setOpen(false);
            setDialog("qr");
          })}
          <div className="my-1 border-t border-slate-100" />
          {item("📥", "Import JSON…", "Replace the current CV with a saved JSON backup", () => {
            setOpen(false);
            fileInput.current?.click();
          })}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="import-json-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onImport(parseImport(await file.text()), file.name);
          } catch (err) {
            notify(err instanceof Error ? err.message : "Could not read that file.");
          }
        }}
      />
      {(dialog === "word" || dialog === "html" || dialog === "ppt") && (
        <FormatDialog
          format={dialog}
          data={data}
          opts={opts}
          defaultColour={defaultColour}
          onClose={() => setDialog(null)}
          notify={notify}
          setBusy={setBusy}
          onExported={onExported}
        />
      )}
      {dialog === "linkedin" && <LinkedInDialog data={data} opts={opts} onClose={() => setDialog(null)} notify={notify} onExported={onExported} />}
      {dialog === "email" && <EmailDialog data={data} opts={opts} onClose={() => setDialog(null)} notify={notify} onExported={onExported} />}
      {dialog === "qr" && <QrDialog data={data} onClose={() => setDialog(null)} notify={notify} />}
    </div>
  );
}

/* ------------------------------------- Word ------------------------------------- */

type FileFormat = "word" | "html" | "ppt";

const FORMAT_INFO: Record<FileFormat, { title: string; busy: string; button: string; done: string; note: string }> = {
  word: {
    title: "Word document options",
    busy: "Exporting Word document…",
    button: "Download Word file",
    done: "Word document downloaded.",
    note: "A4, Calibri 10.5 pt, 0.6 inch side margins (0.5 inch top and bottom), with a footer showing your name and page numbers. Everything stays editable in Word.",
  },
  html: {
    title: "HTML page options",
    busy: "Exporting HTML page…",
    button: "Download HTML file",
    done: "HTML page downloaded.",
    note: "One self-contained file (no other files needed): open it in any browser, e-mail it, or put it on a website. It prints cleanly on A4.",
  },
  ppt: {
    title: "One-page PowerPoint options",
    busy: "Exporting PowerPoint…",
    button: "Download PowerPoint",
    done: "One-page PowerPoint downloaded.",
    note: "A single landscape slide (13.33 x 7.5 in) in three columns, like a one-page profile, ready to share quickly. All text is editable. The font size is chosen so everything fits; if your CV is long, the least important details are shortened and you are told.",
  },
};

const prefsKey = (f: FileFormat) => `cv-builder:${f}-prefs:v1`;

/** Options before exporting a Word, HTML or PowerPoint file: colour theme or black & white, photo, personal details. */
function FormatDialog({
  format,
  data,
  opts,
  defaultColour,
  onClose,
  notify,
  setBusy,
  onExported,
}: {
  format: FileFormat;
  data: CVData;
  opts: ExportOptions;
  defaultColour: boolean;
  onClose: () => void;
  notify: (m: string) => void;
  setBusy: (m: string | null) => void;
  onExported: () => void;
}) {
  const info = FORMAT_INFO[format];
  const hasPhoto = !!data.header.photo;
  const [colour, setColour] = useState(defaultColour);
  const [photo, setPhoto] = useState(opts.photo && hasPhoto);
  const [personal, setPersonal] = useState(opts.personal);

  // Remember the last choices for next time (the Print options are only the first starting point)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey(format));
      if (raw) {
        const p = JSON.parse(raw) as { colour?: boolean; photo?: boolean; personal?: boolean };
        if (typeof p.colour === "boolean") setColour(p.colour);
        if (typeof p.photo === "boolean") setPhoto(p.photo && hasPhoto);
        if (typeof p.personal === "boolean") setPersonal(p.personal);
      }
    } catch {
      /* ignore */
    }
  }, [hasPhoto, format]);

  const theme = THEMES[data.theme] ?? THEMES.teal;
  const go = async () => {
    try {
      localStorage.setItem(prefsKey(format), JSON.stringify({ colour, photo, personal }));
    } catch {
      /* ignore */
    }
    onClose();
    setBusy(info.busy);
    try {
      const model = buildModel(data, { photo, personal });
      const look = { colour, classic: data.headerStyle === "classic", theme };
      const base = fileBase(data.header.name);
      let extra = "";
      if (format === "word") downloadBlob(await toDocxBlob(model, look), `${base}.docx`);
      else if (format === "html") downloadText(toHtml(model, look), `${base}.html`, "text/html");
      else {
        const res = await toPptxBlob(model, look);
        downloadBlob(res.blob, `${base}_OnePager.pptx`);
        if (!res.fits) extra = " It was too long for one slide, so the end of the content is cut off: shorten the CV or use the Word file.";
        else if (res.trimLevel > 0) extra = " Some details were shortened to fit on one page.";
      }
      notify(info.done + extra);
      onExported();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const radio = (value: boolean, title: string, note: string, swatchStyle?: string) => (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 ${colour === value ? "border-slate-700 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}>
      <input type="radio" name="file-style" checked={colour === value} onChange={() => setColour(value)} className="mt-1 cursor-pointer accent-[var(--accent)]" />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          {swatchStyle && <span className="h-3.5 w-3.5 rounded-full" style={{ background: swatchStyle }} />}
          {title}
        </span>
        <span className="block text-xs text-slate-500">{note}</span>
      </span>
    </label>
  );

  return (
    <Modal title={info.title} onClose={onClose}>
      <div className="space-y-2">
        {radio(true, `Colour (${theme.label} theme)`, "Your theme colours, like the screen and the colour print.", swatch(data.theme))}
        {radio(false, "Black & white", "Plain and printer-friendly.")}
      </div>
      <label className={`mt-3 flex items-start gap-2 ${hasPhoto ? "cursor-pointer" : "opacity-60"}`}>
        <input type="checkbox" disabled={!hasPhoto} checked={photo} onChange={(e) => setPhoto(e.target.checked)} className="mt-1 cursor-pointer accent-[var(--accent)]" />
        <span>
          <span className="font-semibold text-slate-800">Include photo</span>
          <span className="block text-xs text-slate-500">
            {hasPhoto ? "Shown at the top of the header (top left of the slide for PowerPoint)." : "No photo yet: in Edit mode, click Upload Photo in the header first."}
          </span>
        </span>
      </label>
      <label className="mt-2 flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} className="mt-1 cursor-pointer accent-[var(--accent)]" />
        <span>
          <span className="font-semibold text-slate-800">Include personal details</span>
          <span className="block text-xs text-slate-500">Date of birth, address and nationality.</span>
        </span>
      </label>
      <p className="mt-3 text-xs text-slate-500">{info.note}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={go} className={btnPrimary}>
          {info.button}
        </button>
      </div>
    </Modal>
  );
}

/* ----------------------------------- LinkedIn ----------------------------------- */

function LinkedInDialog({ data, opts, onClose, notify, onExported }: { data: CVData; opts: ExportOptions; onClose: () => void; notify: (m: string) => void; onExported: () => void }) {
  const li = useMemo(() => toLinkedIn(buildModel(data, { ...opts, photo: false }), data), [data, opts]);
  const copy = async (text: string, what: string) => notify((await copyText(text)) ? `${what} copied to clipboard.` : "Could not copy. Select the text and copy it manually.");
  return (
    <Modal title="LinkedIn format" onClose={onClose} wide>
      <p className="mb-2 rounded-lg bg-slate-50 p-2 text-slate-700">
        <strong>Copy text below → Paste into LinkedIn profile.</strong> Each block matches a LinkedIn field. LinkedIn does not allow importing a profile from text, so
        this is a ready-to-paste layout.
      </p>
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => copy(li.headline, "Headline")} className={btnSecondary}>
          Copy headline ({li.headline.length}/{LINKEDIN_LIMITS.headline})
        </button>
        <button type="button" onClick={() => copy(li.about, "About text")} className={btnSecondary}>
          Copy About ({li.about.length}/{LINKEDIN_LIMITS.about})
        </button>
      </div>
      <textarea readOnly value={li.text} rows={14} aria-label="LinkedIn text" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 font-mono text-xs" />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => copy(li.text, "LinkedIn text")} className={btnPrimary}>
          Copy all
        </button>
        <button
          type="button"
          onClick={() => {
            downloadText(li.text, `${fileBase(data.header.name, "LinkedIn")}.txt`);
            notify("LinkedIn text file downloaded.");
            onExported();
          }}
          className={btnSecondary}
        >
          Download .txt
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------- Email ------------------------------------- */

const MAIL_BODY_LIMIT = 1800; // many mail apps cut longer mailto links

function EmailDialog({ data, opts, onClose, notify, onExported }: { data: CVData; opts: ExportOptions; onClose: () => void; notify: (m: string) => void; onExported: () => void }) {
  const fullText = useMemo(() => toPlainText(buildModel(data, { ...opts, photo: false })), [data, opts]);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`My CV - ${data.header.name.trim() || "CV"}`);
  const [body, setBody] = useState(() => {
    const intro = "Hello,\n\nPlease find my CV below. I have also attached it as a PDF.\n\n";
    const clipped = fullText.length > MAIL_BODY_LIMIT ? `${fullText.slice(0, MAIL_BODY_LIMIT).replace(/\n[^\n]*$/, "")}\n...\n(see the attached PDF for the full CV)` : fullText;
    return intro + clipped;
  });
  const valid = to === "" || /^\S+@\S+\.\S+$/.test(to.trim());
  const href = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Modal title="Send via email" onClose={onClose} wide>
      <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
        A web page cannot attach files to an email. This opens a draft in your email app with your CV text. To attach the PDF, first use <strong>Export As → PDF</strong>{" "}
        (Save as PDF), then attach that file to the draft.
      </p>
      <label className="mb-2 block">
        <span className="font-medium text-slate-800">To (optional)</span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recruiter@company.com"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
        />
        {!valid && <span className="text-xs text-red-700">That does not look like an email address.</span>}
      </label>
      <label className="mb-2 block">
        <span className="font-medium text-slate-800">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30" />
      </label>
      <label className="block">
        <span className="font-medium text-slate-800">Message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-xs outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30" />
      </label>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={async () => notify((await copyText(fullText)) ? "CV text copied to clipboard." : "Could not copy.")}
          className={btnSecondary}
        >
          Copy full CV text
        </button>
        <a
          href={valid ? href : undefined}
          aria-disabled={!valid}
          onClick={() => {
            if (valid) {
              notify("Opening your email app…");
              onExported();
            }
          }}
          className={`${btnPrimary} inline-block ${valid ? "" : "pointer-events-none opacity-50"}`}
        >
          Open email draft
        </a>
      </div>
    </Modal>
  );
}

/* -------------------------------------- QR code -------------------------------------- */

const vcardEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function buildVCard(data: CVData): string {
  const h = data.header;
  const parts = h.name.trim().split(/\s+/).filter(Boolean);
  const first = parts.slice(0, -1).join(" ") || parts[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vcardEscape(h.name.trim())}`, `N:${vcardEscape(last)};${vcardEscape(first)};;;`];
  if (h.headline.trim()) lines.push(`TITLE:${vcardEscape(h.headline.trim())}`);
  if (h.email.trim()) lines.push(`EMAIL:${h.email.trim()}`);
  if (h.phone.trim()) lines.push(`TEL:${h.phone.trim()}`);
  for (const l of h.links) if (l.url.trim()) lines.push(`URL:${hrefFor(l.url)}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function QrDialog({ data, onClose, notify }: { data: CVData; onClose: () => void; notify: (m: string) => void }) {
  const choices = useMemo(() => {
    const list: { id: string; label: string; value: string }[] = [];
    if (data.header.name.trim() || data.header.email.trim()) list.push({ id: "vcard", label: "Contact card (name, email, phone, links)", value: buildVCard(data) });
    data.header.links.filter((l) => l.url.trim()).forEach((l) => list.push({ id: l.id, label: `${l.platform} link`, value: hrefFor(l.url) }));
    list.push({ id: "custom", label: "Any text or web address…", value: "" });
    return list;
  }, [data]);
  const [choiceId, setChoiceId] = useState(choices[0].id);
  const [custom, setCustom] = useState("");
  const [png, setPng] = useState("");
  const [error, setError] = useState("");

  const value = choiceId === "custom" ? custom.trim() : (choices.find((c) => c.id === choiceId)?.value ?? "");

  useEffect(() => {
    let live = true;
    if (!value) {
      setPng("");
      setError(choiceId === "custom" ? "" : "Nothing to encode yet.");
      return;
    }
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((url) => {
        if (live) {
          setPng(url);
          setError("");
        }
      })
      .catch(() => {
        if (live) {
          setPng("");
          setError("That is too much text for one QR code. Choose a shorter item.");
        }
      });
    return () => {
      live = false;
    };
  }, [value, choiceId]);

  const base = fileBase(data.header.name, "QR");
  const printIt = () => {
    const w = window.open("", "_blank", "width=480,height=560");
    if (!w) {
      notify("Your browser blocked the print window. Allow pop-ups, or download the PNG and print that.");
      return;
    }
    w.document.write(`<!doctype html><title>${base}</title><body style="margin:0;display:grid;place-items:center;height:100vh"><img src="${png}" style="width:80mm;height:80mm" onload="setTimeout(()=>{print();close()},150)">`);
    w.document.close();
  };

  return (
    <Modal title="QR code" onClose={onClose}>
      <p className="mb-2 text-xs text-slate-500">Good for job fairs, networking events and business cards: people scan it with their phone camera.</p>
      <label className="block">
        <span className="font-medium text-slate-800">What should it open?</span>
        <select
          value={choiceId}
          onChange={(e) => setChoiceId(e.target.value)}
          className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {choiceId === "custom" && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="https://… or any text"
          aria-label="Text or web address for the QR code"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      )}
      <div className="my-3 flex min-h-[200px] items-center justify-center rounded-xl bg-slate-50 p-3">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={png} alt="QR code" data-testid="qr-image" width={240} height={240} />
        ) : (
          <p className="text-xs text-slate-500">{error || "Enter something to encode."}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={!png} onClick={printIt} className={btnSecondary}>
          Print
        </button>
        <a
          href={png || undefined}
          download={`${base}.png`}
          aria-disabled={!png}
          onClick={() => png && notify("QR code PNG downloaded.")}
          className={`${btnPrimary} inline-block ${png ? "" : "pointer-events-none opacity-50"}`}
        >
          Download PNG
        </a>
      </div>
    </Modal>
  );
}
