"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProjectView } from "@/lib/portfolio";

/* Presentational pieces shared by the portfolio pages. Colours come from CSS variables set by PortfolioShell. */

/** Fades and lifts its children into view the first time they scroll on screen (off for reduced motion and print). */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={delay ? { transitionDelay: `${delay}ms` } : undefined} className={`pf-reveal ${shown ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Counts up to a whole number the first time it is seen; any other text is shown as it is. */
export function CountUp({ value }: { value: string }) {
  const m = /^(\d{1,4})(\D*)$/.exec(value.trim());
  const target = m ? Number(m[1]) : NaN;
  const [n, setN] = useState(Number.isNaN(target) ? 0 : 0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (Number.isNaN(target)) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (reduce || !el || typeof IntersectionObserver === "undefined") return setN(target);
    let raf = 0;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 900);
        setN(Math.round(target * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);
  if (Number.isNaN(target)) return <>{value}</>;
  return (
    <span ref={ref}>
      {n}
      {m?.[2]}
    </span>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHead({ eyebrow, title, lead, action }: { eyebrow?: string; title: string; lead?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.2em] text-[var(--ink)]">
            <span aria-hidden className="h-[18px] w-1.5 rounded-sm bg-[var(--pf-gold)]" />
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <div aria-hidden className="mt-4 h-0.5 w-40 rounded bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_35%,white)] to-transparent" />
        {lead && <p className="mt-4 text-base leading-relaxed text-slate-600">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

/** Banner at the top of the inner pages (CV, Projects, Contact), in the same style as the home hero. */
export function PageHero({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <section className="pf-hero print:hidden">
      <span aria-hidden className="pf-circle -right-24 -top-40 h-[26rem] w-[26rem]" />
      <span aria-hidden className="pf-circle gold -bottom-24 left-[8%] h-56 w-56" />
      <Container className="relative py-14 sm:py-20">
        <p className="pf-eyebrow-hero flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.22em]">
          <span aria-hidden className="h-[18px] w-1.5 rounded-sm bg-[var(--pf-gold)]" />
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">{title}</h1>
        <p className="pf-sub mt-4 max-w-2xl text-lg">{lead}</p>
      </Container>
    </section>
  );
}

export const btnPrimary =
  "pf-btn-gold inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60";
export const btnOutline =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-[var(--accent)]/40 bg-white px-6 py-3 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--tint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60";

export function TechChip({ children, active, onClick, count }: { children: React.ReactNode; active?: boolean; onClick?: () => void; count?: number }) {
  const cls = `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition ${
    active ? "border-transparent bg-[var(--ink)] text-white shadow-md" : "border-slate-200 bg-white text-slate-700"
  } ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--accent)]" : ""}`;
  if (!onClick) return <span className={cls}>{children}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active} className={cls}>
      {children}
      {count !== undefined && <span className={`text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>{count}</span>}
    </button>
  );
}

export function ProjectCard({ p, index = 0, highlight = [] }: { p: ProjectView; index?: number; highlight?: string[] }) {
  const hl = new Set(highlight.map((x) => x.toLowerCase()));
  const flip = index % 2 === 1;
  return (
    <article className="pf-card group flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.09)]">
      <div className={`relative h-32 overflow-hidden bg-gradient-to-br p-5 text-white ${flip ? "from-[var(--accent2)] to-[var(--accent)]" : "from-[var(--accent)] to-[var(--accent2)]"}`}>
        <span aria-hidden className="absolute -right-8 -top-14 h-40 w-40 rounded-full bg-white/12 transition-transform duration-500 group-hover:scale-110" />
        <span aria-hidden className="absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-black/10" />
        <p className="relative text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pf-gold-soft)]">{p.organization || "Project"}</p>
        <h3 className="relative mt-1.5 line-clamp-2 text-xl font-extrabold leading-tight">{p.name || "Untitled project"}</h3>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {p.date && <p className="text-xs font-bold text-slate-500">{p.date}</p>}
        {p.description && <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{p.description}</p>}
        {p.details.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            {p.details.slice(0, 3).map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--pf-gold)]" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
        {p.tech.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
            {p.tech.map((x) => (
              <li key={x} className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${hl.has(x.toLowerCase()) ? "bg-[var(--ink)] text-white" : "bg-[var(--tint)] text-[var(--ink)]"}`}>
                {x}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-5">
          {p.href ? (
            <a href={p.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--ink)] hover:underline">
              {p.linkLabel} <span aria-hidden>↗</span>
            </a>
          ) : (
            <span className="text-xs text-slate-400">No public link yet</span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Dashed "your next project goes here" card; only shown in the owner's preview, never to visitors. */
export function ProjectPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-[22px] border-2 border-dashed border-[var(--accent)]/30 bg-[var(--tint)]/40 p-8 text-center">
      <div>
        <p aria-hidden className="text-3xl font-light text-[var(--ink)]">+</p>
        <p className="mt-1 text-lg font-extrabold text-slate-800">{title}</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-sm text-slate-500">{body}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{body}</p>
      {cta && (
        <Link href={cta.href} className={`${btnOutline} mt-5`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
