import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  SectionType,
  ShadingType,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { DocModel, Entry, Section } from "./model";

export interface DocxOptions {
  /** true = use the theme colours (like the on-screen / colour print look); false = plain black and white */
  colour: boolean;
  /** true = white header with a coloured rule instead of a coloured band (only matters when colour is on) */
  classic: boolean;
  theme: { accent: string; accent2: string; tint: string; ink: string };
}

const FONT = "Calibri";
const BODY = 21; // half-points: 10.5 pt
const PAGE = { width: 11906, height: 16838 }; // A4 in twips
// Margins match the PDF: 0.6 in at the sides, 0.5 in top and bottom (Word's 1 in default left a CV with 10.5 pt text looking like a narrow column)
const MARGIN_X = 864;
const MARGIN_Y = 720;
const FOOTER_DIST = 340; // footer sits inside the bottom margin
const OVER = 200; // how far the edge-to-edge band overhangs each page edge (clipped by Word)
const CONTENT_WIDTH = PAGE.width - 2 * MARGIN_X;

const hex = (c: string) => c.replace("#", "").toUpperCase();

/** Only real-looking web addresses become links ("test twitter URL" stays plain text). */
const looksLikeUrl = (u: string) => /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(u.trim());
const hrefOf = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

function dataUrlToBytes(dataUrl: string): { type: "jpg" | "png" | "gif"; data: Uint8Array } | null {
  const m = /^data:image\/(jpeg|jpg|png|gif);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  const kind = m[1].toLowerCase();
  return { type: kind === "png" ? "png" : kind === "gif" ? "gif" : "jpg", data };
}

/** Editable Word document: Calibri 10.5 pt, A4, 0.6 in side and 0.5 in top/bottom margins, real headings, bullet lists, footer with page numbers. */
export async function toDocxBlob(m: DocModel, o: DocxOptions): Promise<Blob> {
  const col = {
    text: o.colour ? "1F2937" : "000000",
    muted: "595959",
    ink: o.colour ? hex(o.theme.ink) : "000000",
    accent: o.colour ? hex(o.theme.accent) : "808080",
    tint: hex(o.theme.tint),
  };
  const band = o.colour && !o.classic; // coloured header band with white text
  const onBand = (light: string, dark: string) => (band ? light : dark);

  const run = (text: string, r: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
    new TextRun({ text, font: FONT, size: r.size ?? BODY, bold: r.bold, color: r.color ?? col.text, italics: r.italics });

  const bullet = (text: string) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 30 }, children: [run(text)] });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 300, after: 120 },
      keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: o.colour ? 12 : 6, color: col.accent, space: 1 } },
      children: [run(text.toUpperCase(), { bold: true, size: 28, color: col.ink })], // 14 pt
    });

  /** Title line, then a subtitle line carrying the date at the right edge; without a subtitle the date sits on the title line. */
  function entryParagraphs(e: Entry): Paragraph[] {
    const out: Paragraph[] = [];
    const tabs = [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }];
    const dateRuns = e.date ? [new TextRun({ text: "\t", font: FONT, size: BODY }), run(e.date, { color: col.muted })] : [];
    if (e.subtitle) {
      out.push(new Paragraph({ spacing: { before: 160, after: 0 }, keepNext: true, children: [run(e.title, { bold: true, size: 24 })] }));
      out.push(new Paragraph({ spacing: { after: 40 }, keepNext: true, tabStops: tabs, children: [run(e.subtitle, { color: col.ink, bold: o.colour }), ...dateRuns] }));
    } else {
      out.push(new Paragraph({ spacing: { before: 160, after: 40 }, keepNext: true, tabStops: tabs, children: [run(e.title, { bold: true, size: 24 }), ...dateRuns] }));
    }
    for (const l of e.lines ?? []) out.push(new Paragraph({ spacing: { after: 40 }, children: [run(l)] }));
    for (const b of e.bullets ?? []) out.push(bullet(b));
    for (const d of e.details ?? []) {
      if (d.text) out.push(new Paragraph({ spacing: { before: 50, after: 20 }, children: [run(`${d.label}: `, { bold: true }), run(d.text)] }));
      if (d.items?.length) {
        out.push(new Paragraph({ spacing: { before: 50, after: 20 }, keepNext: true, children: [run(`${d.label}:`, { bold: true })] }));
        d.items.forEach((i) => out.push(bullet(i)));
      }
    }
    return out;
  }

  function sectionParagraphs(s: Section): Paragraph[] {
    const out: Paragraph[] = [heading(s.heading)];
    if (s.paragraph) out.push(new Paragraph({ spacing: { after: 80 }, children: [run(s.paragraph)] }));
    (s.entries ?? []).forEach((e) => out.push(...entryParagraphs(e)));
    for (const l of s.lines ?? []) {
      out.push(
        new Paragraph({
          spacing: { before: 30, after: 30 },
          children: l.label ? [run(`${l.label}: `, { bold: true }), run(l.value)] : [run(l.value)],
        }),
      );
    }
    return out;
  }

  /* ---------------- header ---------------- */
  const photo = m.photo ? dataUrlToBytes(m.photo) : null;
  const nameColor = onBand("FFFFFF", col.ink);
  const identity: Paragraph[] = [];
  if (m.name) identity.push(new Paragraph({ spacing: { after: 40 }, children: [run(m.name, { bold: true, size: 48, color: nameColor })] })); // 24 pt
  if (m.headline) identity.push(new Paragraph({ spacing: { after: 20 }, children: [run(m.headline, { size: 24, color: onBand("F3F4F6", col.muted) })] }));
  if (m.highlights) identity.push(new Paragraph({ spacing: { after: 60 }, children: [run(m.highlights, { bold: true, color: onBand("FFFFFF", col.text) })] }));
  if (m.contact.length) identity.push(new Paragraph({ spacing: { after: 20 }, children: [run(m.contact.join("  |  "), { color: onBand("FFFFFF", col.text) })] }));
  if (m.links.length) {
    const kids: (TextRun | ExternalHyperlink)[] = [];
    m.links.forEach((l, i) => {
      if (i > 0) kids.push(run("   ", { color: onBand("FFFFFF", col.text) }));
      const label = `${l.label}: ${l.url}`;
      const linkColor = onBand("FFFFFF", col.ink);
      kids.push(
        looksLikeUrl(l.url)
          ? new ExternalHyperlink({ link: hrefOf(l.url), children: [new TextRun({ text: label, font: FONT, size: BODY, color: linkColor, underline: {} })] })
          : run(label, { color: onBand("FFFFFF", col.text) }),
      );
    });
    identity.push(new Paragraph({ spacing: { after: 20 }, children: kids }));
  }
  // Availability / right to work / visa: inside the band for plain headers, as a tinted strip below a coloured band
  const factsText = m.facts.join("  |  ");
  if (factsText && !band) identity.push(new Paragraph({ spacing: { before: 40, after: 20 }, children: [run(factsText, { color: col.muted })] }));

  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const PHOTO_COL = 1700;
  const BAND_PHOTO_COL = 1450; // photo (1350) + a small gap; with the 200 cell margin the text starts where Word placed it before the layout was fixed
  const PHOTO_NUDGE = 150; // lines the photo's top edge up with the top of the capital letters of the name
  type Margins = { top: number; bottom: number; left: number; right: number };
  const cell = (width: number, children: Paragraph[], fill?: string, margins?: Margins, span?: number) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: noBorders,
      verticalAlign: VerticalAlign.TOP,
      shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
      margins,
      columnSpan: span,
      children,
    });
  const bandFill = hex(o.theme.accent);
  const photoPara = photo
    ? new Paragraph({ spacing: { before: PHOTO_NUDGE }, children: [new ImageRun({ type: photo.type, data: photo.data, transformation: { width: 90, height: 90 } })] })
    : null;

  const header: (Paragraph | Table)[] = [];
  if (band) {
    // Edge-to-edge band: the table is wider than the text area (negative indent, plus a small overhang that
    // Word clips at the page edge) so the colour reaches both sides of the page whatever the Word version's
    // table-indent rules; the cell margins put the text back in line with the body text.
    const side = MARGIN_X + OVER;
    const FULL = PAGE.width + 2 * OVER;
    // the band is its own first section with a zero top margin, so it needs only a modest top padding
    const pad = { top: 420, bottom: 220 };
    const rows = [
      new TableRow({
        children: photoPara
          ? [
              cell(side + BAND_PHOTO_COL, [photoPara], bandFill, { ...pad, left: side, right: 0 }),
              cell(FULL - side - BAND_PHOTO_COL, identity, bandFill, { ...pad, left: 200, right: side }),
            ]
          : [cell(FULL, identity, bandFill, { ...pad, left: side, right: side })],
      }),
      // Availability strip: a second row of the SAME table, so it has exactly the band's width
      ...(factsText
        ? [
            new TableRow({
              children: [cell(FULL, [new Paragraph({ children: [run(factsText, { color: col.ink, bold: true })] })], col.tint, { top: 90, bottom: 90, left: side, right: side }, photoPara ? 2 : 1)],
            }),
          ]
        : []),
    ];
    header.push(
      new Table({
        width: { size: FULL, type: WidthType.DXA },
        indent: { size: -side, type: WidthType.DXA },
        layout: TableLayoutType.FIXED, // keep the column widths exactly as set, so the strip text stays level with the name
        columnWidths: photoPara ? [side + BAND_PHOTO_COL, FULL - side - BAND_PHOTO_COL] : [FULL],
        borders: TableBorders.NONE,
        rows,
      }),
    );
  } else if (photoPara) {
    header.push(
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [PHOTO_COL, CONTENT_WIDTH - PHOTO_COL],
        borders: TableBorders.NONE,
        rows: [new TableRow({ children: [cell(PHOTO_COL, [photoPara]), cell(CONTENT_WIDTH - PHOTO_COL, identity)] })],
      }),
    );
  } else {
    header.push(...identity);
  }
  if (o.colour && o.classic) {
    header.push(new Paragraph({ spacing: { before: 60, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: col.accent, space: 1 } }, children: [] }));
  }

  /* ---------------- footer ---------------- */
  const small = { size: 18, color: col.muted };
  const makeFooter = () =>
    new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
        children: [
          run(m.name ? `${m.name} - CV` : "CV", small),
          new TextRun({ text: "\t", font: FONT, size: 18 }),
          new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: col.muted }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: m.name || "CV Builder",
    title: m.name ? `${m.name} - CV` : "CV",
    // UK English proofing in Word (otherwise Word may flag British spellings)
    styles: { default: { document: { run: { font: FONT, size: BODY, language: { value: "en-GB" } } } } },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { run: { color: col.accent }, paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: band
      ? [
          // Section 1 = the band, with a ZERO top margin so the colour reaches the top edge of the page (real page
          // geometry: no picture, no header content). Section 2 continues on the same page with the normal margin,
          // which Word applies from page 2 onward.
          {
            properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: 0, right: MARGIN_X, bottom: MARGIN_Y, left: MARGIN_X, footer: FOOTER_DIST } } },
            footers: { default: makeFooter() },
            children: header,
          },
          {
            properties: { type: SectionType.CONTINUOUS, page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: MARGIN_Y, right: MARGIN_X, bottom: MARGIN_Y, left: MARGIN_X, footer: FOOTER_DIST } } },
            footers: { default: makeFooter() },
            children: m.sections.flatMap(sectionParagraphs),
          },
        ]
      : [
          {
            properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: MARGIN_Y, right: MARGIN_X, bottom: MARGIN_Y, left: MARGIN_X, footer: FOOTER_DIST } } },
            footers: { default: makeFooter() },
            children: [...header, ...m.sections.flatMap(sectionParagraphs)],
          },
        ],
  });
  return Packer.toBlob(doc);
}
