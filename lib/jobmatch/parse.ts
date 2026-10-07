import { MAX_FILE_BYTES, MAX_JOB_CHARS } from "./types";

/* Reads the text out of an uploaded job description (browser only; the file itself is never uploaded anywhere).
   PDF uses pdf.js; Word, PowerPoint and Excel files are zip files of XML, read with JSZip; JSON, HTML and text are read
   directly. Old binary formats (.doc, .ppt, .xls) are not supported: save them as .docx, .pptx or .xlsx first. */

export class ParseError extends Error {}

export const ACCEPT_ATTR = ".pdf,.docx,.json,.html,.htm,.xlsx,.txt,.text,.md,.pptx";
export const FORMAT_LIST = "PDF, DOCX, JSON, HTML, XLSX, TXT, PPTX";

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const tidy = (s: string) =>
  s
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

async function zip(file: File) {
  const { default: JSZip } = await import("jszip");
  try {
    return await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new ParseError("That file could not be opened. It may be damaged, password-protected or in an old format.");
  }
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new ParseError("That PDF could not be read. It may be damaged or password-protected. You can paste the text instead.");
  }
  const parts: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    for (const it of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += it.str ?? "";
      if (it.hasEOL) line += "\n";
      else line += " ";
    }
    parts.push(line);
  }
  const text = tidy(parts.join("\n"));
  if (text.length < 20) throw new ParseError("This PDF has no selectable text (it may be a scan). Paste the job description text instead.");
  return text;
}

async function readDocx(file: File): Promise<string> {
  const z = await zip(file);
  const xml = await z.file("word/document.xml")?.async("string");
  if (!xml) throw new ParseError("That does not look like a Word (.docx) file.");
  return tidy(decode(xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n").replace(/<[^>]+>/g, "")));
}

async function readPptx(file: File): Promise<string> {
  const z = await zip(file);
  const slides = Object.keys(z.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (!slides.length) throw new ParseError("That does not look like a PowerPoint (.pptx) file.");
  const out: string[] = [];
  for (const n of slides.slice(0, 40)) {
    const xml = (await z.file(n)!.async("string")).replace(/<\/a:p>/g, "\n");
    out.push(decode([...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>|\n/g)].map((m) => (m[0] === "\n" ? "\n" : m[1])).join("")));
  }
  return tidy(out.join("\n\n"));
}

async function readXlsx(file: File): Promise<string> {
  const z = await zip(file);
  const sst = await z.file("xl/sharedStrings.xml")?.async("string");
  const shared = sst ? [...sst.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))) : [];
  const sheets = Object.keys(z.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
  if (!sheets.length) throw new ParseError("That does not look like an Excel (.xlsx) file.");
  const out: string[] = [];
  for (const n of sheets.slice(0, 5)) {
    const xml = await z.file(n)!.async("string");
    for (const row of [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].slice(0, 500)) {
      const cells = [...row[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => {
        const attrs = c[1];
        const body = c[2] ?? "";
        if (/t="s"/.test(attrs)) return shared[Number(/<v>(\d+)<\/v>/.exec(body)?.[1])] ?? "";
        if (/t="inlineStr"/.test(attrs)) return decode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
        return decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
      });
      const line = cells.filter((c) => c.trim()).join(" | ");
      if (line) out.push(line);
    }
  }
  return tidy(out.join("\n"));
}

function readJson(text: string): string {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ParseError("That JSON file is not valid JSON.");
  }
  const lines: string[] = [];
  const walk = (v: unknown, key = "") => {
    if (typeof v === "string") lines.push(key ? `${key}: ${v}` : v);
    else if (typeof v === "number" || typeof v === "boolean") lines.push(key ? `${key}: ${v}` : String(v));
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(data);
  return tidy(lines.join("\n"));
}

function readHtml(text: string): string {
  const doc = new DOMParser().parseFromString(text, "text/html");
  doc.querySelectorAll("script,style,noscript,template,svg").forEach((e) => e.remove());
  doc.querySelectorAll("p,div,li,br,h1,h2,h3,h4,h5,h6,tr,section,article,ul,ol,table").forEach((e) => e.append(doc.createTextNode("\n")));
  doc.querySelectorAll("td,th").forEach((e) => e.append(doc.createTextNode(" ")));
  return tidy(doc.body?.textContent ?? "");
}

/** Returns the text of the file (cut to MAX_JOB_CHARS) and whether it had to be cut. */
export async function readJobFile(file: File): Promise<{ text: string; truncated: boolean }> {
  if (file.size > MAX_FILE_BYTES) throw new ParseError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
  const ext = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? "").toLowerCase();
  let text: string;
  switch (ext) {
    case "pdf":
      text = await readPdf(file);
      break;
    case "docx":
      text = await readDocx(file);
      break;
    case "pptx":
      text = await readPptx(file);
      break;
    case "xlsx":
      text = await readXlsx(file);
      break;
    case "json":
      text = readJson(await file.text());
      break;
    case "html":
    case "htm":
      text = readHtml(await file.text());
      break;
    case "txt":
    case "text":
    case "md":
      text = tidy(await file.text());
      break;
    case "doc":
    case "ppt":
    case "xls":
      throw new ParseError(`.${ext} is an old format. Save it as .${ext}x (Word, PowerPoint or Excel: File, Save As) or paste the text.`);
    default:
      throw new ParseError(`That file type is not supported. Use ${FORMAT_LIST}, or paste the text.`);
  }
  if (text.length < 30) throw new ParseError("I could not find any text in that file. Paste the job description instead.");
  return { text: text.slice(0, MAX_JOB_CHARS), truncated: text.length > MAX_JOB_CHARS };
}
