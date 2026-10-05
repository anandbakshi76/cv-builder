import type { DocxOptions } from "./docx";
import type { DocModel, Entry, Section } from "./model";

/** Same look choices as the Word export (colour theme or black & white, classic header). */
export type HtmlOptions = DocxOptions;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const looksLikeUrl = (u: string) => /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(u.trim());
const hrefOf = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`);

function entryHtml(e: Entry): string {
  const head = `<div class="row"><h3>${esc(e.title)}</h3>${e.date ? `<span class="date">${esc(e.date)}</span>` : ""}</div>`;
  const sub = e.subtitle ? `<p class="sub">${esc(e.subtitle)}</p>` : "";
  const lines = (e.lines ?? []).map((l) => `<p>${esc(l)}</p>`).join("");
  const bullets = e.bullets?.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  const details = (e.details ?? [])
    .map((d) => {
      if (d.text) return `<p class="detail"><strong>${esc(d.label)}:</strong> ${esc(d.text)}</p>`;
      return d.items?.length ? `<p class="detail"><strong>${esc(d.label)}:</strong></p><ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
    })
    .join("");
  return `<article class="entry">${head}${sub}${lines}${bullets}${details}</article>`;
}

function sectionHtml(s: Section): string {
  const body = [
    s.paragraph ? `<p>${esc(s.paragraph)}</p>` : "",
    (s.entries ?? []).map(entryHtml).join(""),
    (s.lines ?? []).length
      ? `<ul class="plain">${(s.lines ?? []).map((l) => `<li>${l.label ? `<strong>${esc(l.label)}:</strong> ` : ""}${esc(l.value)}</li>`).join("")}</ul>`
      : "",
  ].join("");
  return `<section><h2>${esc(s.heading)}</h2>${body}</section>`;
}

/** One self-contained HTML file: no external files, readable on any screen, prints cleanly on A4. */
export function toHtml(m: DocModel, o: HtmlOptions): string {
  const hex = (c: string) => `#${c.replace("#", "")}`;
  const accent = o.colour ? hex(o.theme.accent) : "#555";
  const accent2 = o.colour ? hex(o.theme.accent2) : "#555";
  const ink = o.colour ? hex(o.theme.ink) : "#000";
  const tint = o.colour ? hex(o.theme.tint) : "#f4f4f4";
  const band = o.colour && !o.classic;
  const title = m.name ? `${m.name} - CV` : "CV";

  const links = m.links
    .map((l) => (looksLikeUrl(l.url) ? `<a href="${esc(hrefOf(l.url))}">${esc(l.label)}: ${esc(l.url)}</a>` : `<span>${esc(l.label)}: ${esc(l.url)}</span>`))
    .join("");
  const contact = m.contact.map((c) => (/^\S+@\S+\.\S+$/.test(c) ? `<a href="mailto:${esc(c)}">${esc(c)}</a>` : `<span>${esc(c)}</span>`)).join("");

  const header = `<header class="top${band ? " band" : ""}">
  ${m.photo ? `<img class="photo" src="${esc(m.photo)}" alt="Photo of ${esc(m.name)}" width="96" height="96">` : ""}
  <div class="id">
    ${m.name ? `<h1>${esc(m.name)}</h1>` : ""}
    ${m.headline ? `<p class="headline">${esc(m.headline)}</p>` : ""}
    ${m.highlights ? `<p class="highlights">${esc(m.highlights)}</p>` : ""}
    ${contact ? `<p class="contact">${contact}</p>` : ""}
    ${links ? `<p class="links">${links}</p>` : ""}
  </div>
</header>${m.facts.length ? `\n<p class="facts">${m.facts.map((f) => `<span>${esc(f)}</span>`).join("")}</p>` : ""}`;

  const css = `
:root{--accent:${accent};--accent2:${accent2};--ink:${ink};--tint:${tint}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#eef1f5;color:#1f2937;font:15px/1.45 Calibri,Carlito,"Segoe UI",Helvetica,Arial,sans-serif}
.cv{max-width:794px;margin:24px auto;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);border-radius:14px;overflow:hidden;padding-bottom:28px}
.top{display:flex;gap:18px;align-items:flex-start;padding:22px 36px;${band ? "background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff" : "border-bottom:4px solid var(--accent)"}}
.photo{border-radius:50%;object-fit:cover;flex:none;${band ? "border:3px solid rgba(255,255,255,.55)" : "border:2px solid #ddd"}}
.id{min-width:0}
h1{margin:0 0 4px;font-size:32px;line-height:1.1;${band ? "" : "color:var(--ink)"}}
.headline{margin:0 0 2px;font-size:17px;font-weight:300;${band ? "color:#f3f4f6" : "color:#555"}}
.highlights{margin:0 0 8px;font-weight:700}
.contact,.links{margin:2px 0;display:flex;flex-wrap:wrap;gap:2px 18px;font-size:14px}
.top a{color:inherit}
.facts{margin:0;padding:8px 36px;background:var(--tint);color:var(--ink);font-weight:700;font-size:14px;display:flex;flex-wrap:wrap;gap:2px 24px}
section{padding:0 36px;margin-top:22px}
h2{margin:0 0 10px;font-size:14pt;text-transform:uppercase;letter-spacing:.04em;color:var(--ink);border-bottom:2px solid var(--accent);padding-bottom:3px}
h3{margin:0;font-size:16px}
.entry{margin:0 0 14px;break-inside:avoid}
.row{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap}
.date{color:#555;font-size:14px;white-space:nowrap}
.sub{margin:0 0 4px;color:var(--ink);font-weight:700}
p{margin:0 0 6px}
ul{margin:2px 0 6px;padding-left:20px}
li::marker{color:var(--accent)}
ul.plain{list-style:none;padding:0;margin:0}
ul.plain li{margin:2px 0}
.detail{margin:4px 0 2px}
a{color:var(--ink)}
@media (max-width:600px){.top{flex-direction:column;padding:18px 18px}section,.facts{padding-left:18px;padding-right:18px}h1{font-size:27px}}
@page{size:A4;margin:12mm}
@media print{
  body{background:#fff;font-size:10.5pt}
  .cv{box-shadow:none;border-radius:0;margin:0;max-width:none;padding-bottom:0}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h2{break-after:avoid}
  .photo{${o.colour ? "" : "filter:grayscale(1)"}}
  a{text-decoration:none}
}`;

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc([m.name, m.headline].filter(Boolean).join(" - "))}">
<style>${css}</style>
</head>
<body>
<main class="cv">
${header}
${m.sections.map(sectionHtml).join("\n")}
</main>
</body>
</html>
`;
}
