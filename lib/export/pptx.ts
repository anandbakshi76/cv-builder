import type { DocxOptions } from "./docx";
import type { DocModel, Entry, Section } from "./model";

/** Same look choices as the Word export (colour theme or black & white). */
export type PptxOptions = DocxOptions;

/* ---------------------------------------------------------------------------------------------
   One-page landscape PowerPoint (13.33 x 7.5 in).
   Left sidebar (dark theme colour in colour mode, plain white in black & white): photo, name, headline, key
   positions, availability, Key Highlights tiles, Skills. Middle column: summary, education, work, projects.
   Right column: certifications & training, awards, extracurricular, personal details and a Connect bar.
   Everything is real, editable text and simple shapes (no gradients, no pictures except the photo).
   PowerPoint does not shrink text by itself, so every block is measured here: 10.5 pt is the default, detail is
   shortened step by step to keep it, and only after that does the font get smaller.
   --------------------------------------------------------------------------------------------- */

interface Run {
  text: string;
  bold?: boolean;
  color?: string;
  link?: string;
}
interface Para {
  runs: Run[];
  bullet?: boolean;
  /** space after, in points */
  after?: number;
  /** font size multiplier */
  mul?: number;
  align?: "left" | "center" | "right";
}

type Item =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill?: string; transp?: number; line?: string; lw?: number; round?: number }
  | { k: "ellipse"; x: number; y: number; w: number; h: number; fill?: string; transp?: number; line?: string; lw?: number }
  | { k: "text"; x: number; y: number; w: number; h: number; paras: Para[]; size: number; valign?: "top" | "middle"; charSpacing?: number }
  | { k: "photo"; x: number; y: number; d: number };

const SLIDE = { w: 13.333, h: 7.5 };
const TOP = 0.3;
const BOTTOM = SLIDE.h - 0.22;
const SIDE_W = 3.3;
const LX = 0.24;
const LW = 2.82;
const MID = { x: 3.62, w: 4.9 };
const RIGHT = { x: 8.8, w: 4.1 };
const PHOTO = 1.56;
const GOLD = "F2B84B";
const GOLD_SOFT = "FFE3A6";

/* Text measuring: measured Calibri averages 0.405 em per character for English text (0.415 bold); 0.44 leaves about 8%
   for ragged line ends and safety. PowerPoint's single line spacing for Calibri is about 1.22 x the font size (1.25 used). */
const CHAR_EM = 0.44;
const BOLD_FACTOR = 1.04;
const LINE_H = 1.25;

function lineCount(p: Para, widthIn: number, size: number): number {
  const sz = size * (p.mul ?? 1);
  const indent = p.bullet ? 0.17 : 0;
  const avail = (widthIn - indent) * 72;
  const words: { text: string; bold: boolean }[] = [];
  for (const r of p.runs) for (const w of r.text.split(/(\s+)/)) if (w) words.push({ text: w, bold: !!r.bold });
  let lines = 1;
  let x = 0;
  for (const w of words) {
    const wpx = w.text.length * sz * CHAR_EM * (w.bold ? BOLD_FACTOR : 1);
    if (/^\s+$/.test(w.text)) {
      x += wpx;
      continue;
    }
    if (x + wpx > avail && x > 0) {
      lines++;
      x = wpx;
    } else x += wpx;
  }
  return lines;
}
const paraHeightPt = (p: Para, widthIn: number, size: number) => lineCount(p, widthIn, size) * size * (p.mul ?? 1) * LINE_H + (p.after ?? 0);
const heightIn = (paras: Para[], widthIn: number, size: number) => paras.reduce((n, p) => n + paraHeightPt(p, widthIn, size), 0) / 72;
const textWidthIn = (text: string, sizePt: number, bold = false) => (text.length * sizePt * CHAR_EM * (bold ? BOLD_FACTOR : 1)) / 72;

/* ------------------------------------------- colours ------------------------------------------- */

interface Look {
  colour: boolean;
  text: string;
  muted: string;
  ink: string;
  accent: string;
  rule: string;
  card: string;
  tint: string;
  /** sidebar */
  sideBg: string;
  sideText: string;
  sideSoft: string;
  sideAccent: string;
  sideChipText: string;
  /** date pills */
  pillFill: string;
  pillText: string;
}
const mix = (a: string, b: string, t: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const m = (i: number) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, "0");
  return `${m(0)}${m(2)}${m(4)}`.toUpperCase();
};

/* ------------------------------------ paragraphs for the main columns ------------------------------------ */

/** How much detail to keep: 0 = everything ... 4 = one bullet per entry, no outcomes. */
const LIMITS = [
  { bullets: 99, outcomes: 99, details: true },
  { bullets: 4, outcomes: 2, details: true },
  { bullets: 3, outcomes: 1, details: true },
  { bullets: 2, outcomes: 0, details: true },
  { bullets: 1, outcomes: 0, details: false },
];

const CARD_HEADINGS = ["Certifications", "Certifications & Training", "Training & Courses"];
const RIGHT_HEADINGS = [...CARD_HEADINGS, "Awards & Recognition", "Extracurricular & Volunteering", "Personal Details"];
const LEFT_HEADINGS = ["Key Highlights", "Skills"];

/** Paragraphs for one entry. `datePill` = the date is drawn as a pill, so it is not repeated in the text. */
function entryParas(e: Entry, look: Look, level: number, datePill: boolean, card: boolean): Para[] {
  const lim = LIMITS[level];
  const out: Para[] = [];
  out.push({ runs: [{ text: e.title, bold: true, color: look.text }, ...(!datePill && e.date && !card ? [{ text: `  |  ${e.date}`, color: look.muted }] : [])], after: 1 });
  if (e.subtitle || (card && e.date)) {
    const runs: Run[] = [];
    if (e.subtitle) runs.push({ text: e.subtitle, bold: true, color: look.ink });
    if (card && e.date) runs.push({ text: `${e.subtitle ? "  |  " : ""}${e.date}`, color: look.muted });
    out.push({ runs, after: 1 });
  }
  // at the shortest level, drop tiny filler lines such as "Year 1 of 4" (the date pill already says where he is) and keep two
  const lines = level >= 4 ? (e.lines ?? []).filter((l) => l.length >= 25).slice(0, 2) : (e.lines ?? []).slice(0, 3);
  for (const l of lines) out.push({ runs: [{ text: level >= 4 && l.length > 110 ? `${l.slice(0, 107)}...` : level >= 2 && l.length > 170 ? `${l.slice(0, 167)}...` : l, color: look.text }], after: 1 });
  for (const b of (e.bullets ?? []).slice(0, lim.bullets)) out.push({ runs: [{ text: b }], bullet: true });
  if (lim.details) {
    for (const d of e.details ?? []) {
      if (d.text) out.push({ runs: [{ text: `${d.label}: `, bold: true }, { text: d.text }], after: 0 });
      else if (d.items?.length && lim.outcomes > 0) out.push({ runs: [{ text: `${d.label}: `, bold: true }, { text: d.items.slice(0, lim.outcomes).join("; ") }], after: 0 });
    }
  }
  return out;
}

const labelLine = (l: { label?: string; value: string }, look: Look): Para => ({
  runs: l.label ? [{ text: `${l.label}: `, bold: true, color: look.text }, { text: l.value, color: look.text }] : [{ text: l.value, color: look.text }],
  after: 2,
});

/* ------------------------------------------- main columns ------------------------------------------- */

interface Block {
  items: Item[];
  bottom: number;
}

function layoutColumn(col: { x: number; w: number }, sections: Section[], size: number, level: number, look: Look, startY: number): Block {
  const items: Item[] = [];
  let y = startY;
  const lineH = (sz: number) => (sz * LINE_H) / 72;

  for (const s of sections) {
    // heading: gold marker, theme-coloured capitals and a thin rule to the column edge
    const hs = size * 0.95;
    const hText = s.heading.toUpperCase();
    const hW = (hText.length * (hs * 0.62 + 1)) / 72;
    items.push({ k: "rect", x: col.x, y: y + 0.01, w: 0.06, h: lineH(hs) - 0.02, fill: look.colour ? GOLD : look.ink, round: 0.02 });
    items.push({ k: "text", x: col.x + 0.16, y, w: hW + 0.1, h: lineH(hs), paras: [{ runs: [{ text: hText, bold: true, color: look.ink }] }], size: hs, charSpacing: 1 });
    items.push({ k: "rect", x: col.x + 0.16 + hW + 0.12, y: y + lineH(hs) / 2, w: Math.max(0.1, col.w - 0.16 - hW - 0.12), h: 0.016, fill: look.rule });
    y += lineH(hs) + 0.08;

    if (s.paragraph) {
      const pad = 0.1;
      const paras: Para[] = [{ runs: [{ text: s.paragraph, color: look.text }] }];
      const h = heightIn(paras, col.w - 2 * pad - 0.05, size) + 2 * pad - 0.02;
      items.push({ k: "rect", x: col.x, y, w: col.w, h, fill: look.tint, round: 0.06 });
      items.push({ k: "rect", x: col.x, y, w: 0.05, h, fill: look.accent });
      items.push({ k: "text", x: col.x + 0.05 + pad, y: y + pad - 0.01, w: col.w - 2 * pad - 0.05, h: h - pad, paras, size });
      y += h + 0.08;
    }

    const entries = s.entries ?? [];
    const card = CARD_HEADINGS.includes(s.heading);
    entries.forEach((e, idx) => {
      const last = idx === entries.length - 1;
      const inset = card ? 0.14 : 0.2;
      const boxW = col.w - inset - (card ? 0.08 : 0);
      // date as a pill on the title line when it fits there, otherwise as muted text
      const pillSz = size * 0.82;
      const pillW = e.date && !card ? textWidthIn(e.date, pillSz, true) + 0.18 : 0;
      const datePill = !!pillW && textWidthIn(e.title, size, true) + pillW + 0.12 <= boxW;
      const paras = entryParas(e, look, level, datePill, card);
      const h = heightIn(paras, boxW, size);
      if (card) {
        const pad = 0.06;
        items.push({ k: "rect", x: col.x, y, w: col.w, h: h + 2 * pad, fill: look.card, round: 0.05 });
        items.push({ k: "rect", x: col.x, y, w: 0.04, h: h + 2 * pad, fill: look.accent });
        items.push({ k: "text", x: col.x + inset, y: y + pad, w: boxW, h, paras, size });
        y += h + 2 * pad + 0.05;
        return;
      }
      items.push({ k: "ellipse", x: col.x, y: y + lineH(size) / 2 - 0.045, w: 0.09, h: 0.09, fill: look.accent });
      if (!last) items.push({ k: "rect", x: col.x + 0.037, y: y + lineH(size) / 2 + 0.06, w: 0.016, h: h + 0.1, fill: look.rule });
      items.push({ k: "text", x: col.x + inset, y, w: boxW, h, paras, size });
      if (datePill) {
        const ph = lineH(size) - 0.02;
        items.push({ k: "rect", x: col.x + col.w - pillW, y: y + 0.01, w: pillW, h: ph, fill: look.pillFill === "none" ? undefined : look.pillFill, line: look.pillFill === "none" ? look.ink : undefined, lw: 0.75, round: ph / 2 });
        items.push({ k: "text", x: col.x + col.w - pillW, y: y + 0.01, w: pillW, h: ph, paras: [{ runs: [{ text: e.date as string, bold: true, color: look.pillText }], align: "center" }], size: pillSz, valign: "middle" });
      }
      y += h + 0.07;
    });

    if (s.lines?.length) {
      const paras = s.lines.map((l) => labelLine(l, look));
      const h = heightIn(paras, col.w, size * 0.95);
      items.push({ k: "text", x: col.x, y, w: col.w, h, paras, size: size * 0.95 });
      y += h + 0.04;
    }
    y += 0.09;
  }
  return { items, bottom: y - 0.09 };
}

/* --------------------------------------------- sidebar --------------------------------------------- */

function layoutSidebar(m: DocModel, size: number, look: Look): Block {
  const items: Item[] = [];
  const cx = SIDE_W / 2;
  let y = 0.34;
  if (m.photo) {
    if (look.colour) items.push({ k: "ellipse", x: cx - 0.92, y: 0.25, w: 1.84, h: 1.84, line: "FFFFFF", lw: 1, transp: 65 });
    items.push({ k: "ellipse", x: cx - 0.83, y: 0.34, w: 1.66, h: 1.66, line: look.colour ? GOLD : "999999", lw: look.colour ? 4 : 1 });
    items.push({ k: "photo", x: cx - PHOTO / 2, y: 0.34 + (1.66 - PHOTO) / 2, d: PHOTO });
    y = 2.2;
  } else y = 0.6;

  // name + headline, centred
  const idParas: Para[] = [{ runs: [{ text: m.name || "Your Name", bold: true, color: look.sideText }], mul: 20 / size, after: 3, align: "center" }];
  if (m.headline) idParas.push({ runs: [{ text: m.headline, color: look.sideSoft }], align: "center" });
  const idH = heightIn(idParas, LW, size) + 0.04;
  items.push({ k: "text", x: LX, y, w: LW, h: idH, paras: idParas, size });
  y += idH + 0.14;

  // key positions as outlined chips, wrapped and centred
  const parts = m.highlights.split("|").map((x) => x.trim()).filter(Boolean);
  if (parts.length) {
    const cs = size * 0.93;
    const ch = (cs * LINE_H) / 72 + 0.07;
    const rows: { t: string; w: number }[][] = [[]];
    let rowW = 0;
    for (const t of parts) {
      const w = textWidthIn(t, cs, true) + 0.24;
      if (rowW + w > LW && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push({ t, w });
      rowW += w + 0.07;
    }
    for (const row of rows) {
      const total = row.reduce((n, c) => n + c.w, 0) + 0.07 * (row.length - 1);
      let x = LX + (LW - total) / 2;
      for (const c of row) {
        items.push({ k: "rect", x, y, w: c.w, h: ch, line: look.sideAccent, lw: 1.25, round: ch / 2 });
        items.push({ k: "text", x, y, w: c.w, h: ch, paras: [{ runs: [{ text: c.t, bold: true, color: look.sideChipText }], align: "center" }], size: cs, valign: "middle" });
        x += c.w + 0.07;
      }
      y += ch + 0.06;
    }
    y += 0.08;
  }

  // availability and right to work, with dots
  for (const f of m.facts) {
    const paras: Para[] = [{ runs: [{ text: f, color: look.sideText }] }];
    const fs = size * 0.93;
    const h = heightIn(paras, LW - 0.2, fs);
    items.push({ k: "ellipse", x: LX + 0.02, y: y + (fs * LINE_H) / 72 / 2 - 0.045, w: 0.09, h: 0.09, fill: look.sideAccent });
    items.push({ k: "text", x: LX + 0.2, y, w: LW - 0.2, h, paras, size: fs });
    y += h + 0.05;
  }
  if (m.facts.length) y += 0.08;

  const sideHeading = (text: string) => {
    items.push({ k: "text", x: LX, y, w: LW, h: (size * LINE_H) / 72, paras: [{ runs: [{ text: text.toUpperCase(), bold: true, color: look.sideAccent }] }], size: size * 0.92, charSpacing: 1 });
    items.push({ k: "rect", x: LX, y: y + (size * 0.92 * LINE_H) / 72 + 0.01, w: 0.34, h: 0.03, fill: look.sideAccent });
    y += (size * LINE_H) / 72 + 0.08;
  };

  const kh = m.sections.find((s) => s.heading === "Key Highlights");
  if (kh?.lines?.length) {
    sideHeading("Key Highlights");
    const tw = (LW - 0.08) / 2;
    const tiles = kh.lines.map((l) => {
      const i = l.value.indexOf(" - ");
      return i > 0 ? { v: l.value.slice(0, i), l: l.value.slice(i + 3) } : { v: l.value, l: "" };
    });
    for (let i = 0; i < tiles.length; i += 2) {
      const pair = tiles.slice(i, i + 2);
      const hs = pair.map((t) => {
        const paras: Para[] = [{ runs: [{ text: t.v, bold: true, color: look.sideAccent }], mul: 13 / size }];
        if (t.l) paras.push({ runs: [{ text: t.l, color: look.sideSoft }], mul: 8 / size });
        return { paras, h: Math.max(0.5, heightIn(paras, tw - 0.18, size) + 0.12) };
      });
      const rowH = Math.max(...hs.map((x) => x.h));
      pair.forEach((_, j) => {
        const x = LX + j * (tw + 0.08);
        items.push({ k: "rect", x, y, w: tw, h: rowH, fill: look.colour ? "FFFFFF" : undefined, transp: look.colour ? 88 : undefined, line: look.colour ? undefined : "999999", lw: 0.75, round: 0.06 });
        items.push({ k: "text", x: x + 0.09, y: y + 0.06, w: tw - 0.18, h: rowH - 0.1, paras: hs[j].paras, size });
      });
      y += rowH + 0.07;
    }
    y += 0.06;
  }

  const sk = m.sections.find((s) => s.heading === "Skills");
  if (sk?.lines?.length) {
    sideHeading("Skills");
    const ss = size * 0.9;
    const paras: Para[] = sk.lines.map((l) => ({
      runs: l.label ? [{ text: `${l.label}: `, bold: true, color: look.sideAccent }, { text: l.value, color: look.sideText }] : [{ text: l.value, color: look.sideText }],
      after: 3,
    }));
    const h = heightIn(paras, LW, ss);
    items.push({ k: "text", x: LX, y, w: LW, h, paras, size: ss });
    y += h;
  }
  return { items, bottom: y };
}

/* ------------------------------------------- Connect bar ------------------------------------------- */

function connectParas(m: DocModel, look: Look): Para[] {
  const out: Para[] = [{ runs: [{ text: "CONNECT", bold: true, color: look.sideAccent }], after: 2 }];
  if (m.contact.length) out.push({ runs: [{ text: m.contact.join("  |  "), color: look.sideText }], after: 2 });
  for (const l of m.links) {
    const isUrl = /^[^\s/]+\.[^\s/]{2,}(\/\S*)?$/.test(l.url);
    out.push({ runs: [{ text: `${l.label}: `, bold: true, color: look.sideAccent }, { text: l.url, color: look.colour ? GOLD_SOFT : look.ink, link: isUrl ? `https://${l.url}` : undefined }], after: 1 });
  }
  return out.length > 1 ? out : [];
}

/* ------------------------------------------- choosing a layout ------------------------------------------- */

interface Layout {
  size: number;
  trimLevel: number;
  items: Item[];
  fits: boolean;
}

function chooseLayout(m: DocModel, look: Look): Layout {
  const midSections = m.sections.filter((s) => !LEFT_HEADINGS.includes(s.heading) && !RIGHT_HEADINGS.includes(s.heading));
  const rightSections = m.sections.filter((s) => RIGHT_HEADINGS.includes(s.heading));
  const conn = connectParas(m, look);
  const SIZES = [10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7];

  // The sidebar is secondary text: it takes the largest size (up to 10.5 pt) at which it fits, independently of the columns.
  const side = (() => {
    let b = layoutSidebar(m, SIZES[SIZES.length - 1], look);
    for (const sz of SIZES) {
      const t = layoutSidebar(m, sz, look);
      if (t.bottom <= BOTTOM + 0.1) return t;
      b = t;
    }
    return b;
  })();

  // 10.5 pt is the default for the columns: keep the font as large as possible, and shorten detail step by step
  // (levels 0-4) before going to a smaller font.
  let last: Layout | null = null;
  for (const size of SIZES) {
    for (let level = 0; level <= 4; level++) {
      const mid = layoutColumn(MID, midSections, size, level, look, TOP);
      // Connect bar sits at the bottom of the right column
      const connH = conn.length ? heightIn(conn, RIGHT.w - 0.3, Math.min(size, 10.5) * 0.95) + 0.22 : 0;
      const right = layoutColumn(RIGHT, rightSections, size, level, look, TOP);
      const rightLimit = BOTTOM - (connH ? connH + 0.1 : 0);
      const items: Item[] = [...side.items, ...mid.items, ...right.items];
      if (connH) {
        const y = BOTTOM - connH;
        items.push({ k: "rect", x: RIGHT.x, y, w: RIGHT.w, h: connH, fill: look.colour ? look.sideBg : undefined, line: look.colour ? undefined : look.ink, lw: 1, round: 0.1 });
        items.push({ k: "text", x: RIGHT.x + 0.15, y: y + 0.11, w: RIGHT.w - 0.3, h: connH - 0.18, paras: conn, size: Math.min(size, 10.5) * 0.95 });
      }
      const fits = side.bottom <= BOTTOM + 0.1 && mid.bottom <= BOTTOM && right.bottom <= rightLimit;
      last = { size, trimLevel: level, items, fits };
      if (fits) return last;
    }
  }
  return last as Layout;
}

/* ------------------------------------------- rendering ------------------------------------------- */

export interface PptxResult {
  blob: Blob;
  /** font size used, in points */
  fontSize: number;
  /** 0 = nothing shortened; higher = more detail left out to fit the page */
  trimLevel: number;
  /** false if even the smallest setting could not hold everything (content was cut off at the slide edge) */
  fits: boolean;
}

export async function toPptxBlob(m: DocModel, o: PptxOptions): Promise<PptxResult> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const hex = (c: string) => c.replace("#", "").toUpperCase();
  const accent = hex(o.theme.accent);
  const look: Look = o.colour
    ? {
        colour: true,
        text: "1F2937",
        muted: "5B6472",
        ink: hex(o.theme.ink),
        accent,
        rule: mix(accent, "FFFFFF", 0.75),
        card: "F6F8F9",
        tint: hex(o.theme.tint),
        sideBg: mix(accent, "000000", 0.34),
        sideText: "FFFFFF",
        sideSoft: mix(accent, "FFFFFF", 0.85),
        sideAccent: GOLD,
        sideChipText: GOLD_SOFT,
        pillFill: accent,
        pillText: "FFFFFF",
      }
    : {
        colour: false,
        text: "000000",
        muted: "444444",
        ink: "000000",
        accent: "444444",
        rule: "BBBBBB",
        card: "F2F2F2",
        tint: "F2F2F2",
        sideBg: "FFFFFF",
        sideText: "000000",
        sideSoft: "444444",
        sideAccent: "000000",
        sideChipText: "000000",
        pillFill: "none",
        pillText: "000000",
      };

  const layout = chooseLayout(m, look);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = m.name || "CV Builder";
  pptx.title = m.name ? `${m.name} - one page profile` : "One page profile";
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  if (o.colour) {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SIDE_W, h: SLIDE.h, fill: { color: look.sideBg }, line: { type: "none" } });
    // soft circles, fully inside the sidebar and the slide (nothing sticks out in PowerPoint's editing view)
    const light = mix(accent, "000000", 0.12);
    const dark = mix(accent, "000000", 0.42);
    slide.addShape(pptx.ShapeType.ellipse, { x: 0.1, y: 6.0, w: 1.3, h: 1.3, fill: { color: light, transparency: 65 }, line: { type: "none" } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 1.85, y: 5.95, w: 1.35, h: 1.35, fill: { color: dark }, line: { type: "none" } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 2.2, y: 0.12, w: 0.95, h: 0.95, fill: { color: light, transparency: 55 }, line: { type: "none" } });
  } else {
    slide.addShape(pptx.ShapeType.rect, { x: SIDE_W, y: TOP, w: 0.012, h: SLIDE.h - 2 * TOP, fill: { color: "999999" }, line: { type: "none" } });
  }

  const toText = (paras: Para[], size: number) =>
    paras.flatMap((p) =>
      p.runs.map((r, i) => ({
        text: r.text,
        options: {
          bold: r.bold,
          color: r.color ?? look.text,
          fontSize: size * (p.mul ?? 1),
          hyperlink: r.link ? { url: r.link } : undefined,
          breakLine: i === p.runs.length - 1,
          ...(i === 0 ? { bullet: p.bullet ? { indent: 11 } : undefined, paraSpaceAfter: p.after ?? 0, align: p.align } : {}),
        },
      })),
    );

  for (const it of layout.items) {
    if (it.k === "rect") {
      slide.addShape(it.round ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        fill: it.fill ? { color: it.fill, transparency: it.transp ?? 0 } : { color: "FFFFFF", transparency: 100 },
        line: it.line ? { color: it.line, width: it.lw ?? 1 } : { type: "none" },
        ...(it.round ? { rectRadius: it.round } : {}),
      });
    } else if (it.k === "ellipse") {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        fill: it.fill ? { color: it.fill, transparency: it.transp ?? 0 } : { color: "FFFFFF", transparency: 100 },
        line: it.line ? { color: it.line, width: it.lw ?? 1, transparency: it.transp ?? 0 } : { type: "none" },
      });
    } else if (it.k === "photo") {
      slide.addImage({ data: m.photo.replace(/^data:/, ""), x: it.x, y: it.y, w: it.d, h: it.d, rounding: true, altText: `Photo of ${m.name}` });
    } else {
      slide.addText(toText(it.paras, it.size), {
        x: it.x,
        y: it.y,
        w: it.w,
        h: Math.max(it.h, 0.05),
        fontFace: "Calibri",
        valign: it.valign ?? "top",
        margin: 0,
        fit: "none",
        lang: "en-GB",
        ...(it.charSpacing ? { charSpacing: it.charSpacing } : {}),
      });
    }
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return { blob, fontSize: layout.size, trimLevel: layout.trimLevel, fits: layout.fits };
}
