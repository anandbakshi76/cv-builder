"use client";
import { SocialIcon } from "@/components/SocialIcon";
import { displayUrl, hrefFor } from "@/lib/cv";
import type { DocModel } from "@/lib/export/model";
import type { CVData } from "@/lib/types";

/** Read-only CV for the portfolio's CV page: built from the same neutral model the exports use, so it follows the same
 *  visibility rules as View mode. Print styles for this page live in `app/portfolio/cv/page.tsx`. */
export default function CVSheet({ m, cv }: { m: DocModel; cv: CVData }) {
  const links = cv.header.links.filter((l) => l.url.trim());
  return (
    <article id="pf-cv-sheet" className="pf-cv-sheet mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white text-[15px] leading-relaxed shadow-xl ring-1 ring-slate-200">
      <header className="pf-cv-band flex flex-col gap-5 bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] px-6 py-7 text-white sm:flex-row sm:items-center sm:px-10">
        {m.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.photo} alt={`Photo of ${m.name}`} className="h-24 w-24 flex-none rounded-full object-cover ring-4 ring-white/40" />
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">{m.name || "Your Name"}</h1>
          {m.headline && <p className="mt-1 text-lg font-light">{m.headline}</p>}
          {m.highlights && <p className="mt-1 text-sm font-semibold">{m.highlights}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/95">
            {m.contact.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </p>
          {links.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {links.map((l) => (
                <a key={l.id} href={hrefFor(l.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
                  <SocialIcon platform={l.platform} size={16} />
                  {displayUrl(l.url)}
                </a>
              ))}
            </p>
          )}
        </div>
      </header>
      {m.facts.length > 0 && (
        <p className="pf-cv-facts flex flex-wrap gap-x-6 gap-y-1 bg-[var(--tint)] px-6 py-2 text-sm font-semibold text-[var(--ink)] sm:px-10">
          {m.facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
      )}
      <div className="space-y-6 px-6 pb-10 pt-6 sm:px-10">
        {m.sections.map((s) => (
          <section key={s.heading} className="pf-cv-section">
            <h2 className="border-b-2 border-[var(--accent)] pb-1 text-[15px] font-bold uppercase tracking-wider text-[var(--ink)]">{s.heading}</h2>
            {s.paragraph && <p className="mt-2 text-slate-700">{s.paragraph}</p>}
            {s.entries?.map((e, i) => (
              <div key={i} className="pf-cv-entry mt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold text-slate-900">{e.title}</p>
                  {e.date && <p className="text-sm text-slate-500">{e.date}</p>}
                </div>
                {e.subtitle && <p className="font-semibold text-[var(--ink)]">{e.subtitle}</p>}
                {e.lines?.map((l, j) => (
                  <p key={j} className="text-slate-700">
                    {l}
                  </p>
                ))}
                {e.bullets && e.bullets.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700 marker:text-[var(--accent)]">
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
                {e.details?.map((d, j) => (
                  <p key={j} className="text-slate-700">
                    <span className="font-semibold">{d.label}: </span>
                    {d.text ?? d.items?.join("; ")}
                  </p>
                ))}
              </div>
            ))}
            {s.lines?.map((l, i) => (
              <p key={i} className="mt-1 text-slate-700">
                {l.label && <span className="font-semibold">{l.label}: </span>}
                {l.value}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
