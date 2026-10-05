"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SocialIcon } from "@/components/SocialIcon";
import { displayUrl, hrefFor } from "@/lib/cv";
import { defaultCV } from "@/lib/defaults";
import { hasIdentity, initials, readLive, readPublished, type PortfolioSource } from "@/lib/portfolio";
import { CARDS_STORAGE_KEY, DEFAULT_LOOK, isLook, LOOKS, LOOK_IDS, LOOK_STORAGE_KEY, readThemeFile, resolveLook, type LookId, type ThemeFile } from "@/lib/portfolioTheme";
import type { CVData } from "@/lib/types";

/* The portfolio's shared frame: header with the same navigation on every page, a mobile menu, footer, the look
   (colours) and the CV data itself (read-only). */

interface Ctx {
  cv: CVData;
  source: PortfolioSource;
  loading: boolean;
}
/** The colours of the look in use, so other parts (the one-page slide) can match the site. */
export interface Palette {
  accent: string;
  accent2: string;
  tint: string;
  ink: string;
}
const DEFAULT_PALETTE: Palette = { accent: "#0f766e", accent2: "#0e7490", tint: "#e6f6f4", ink: "#0f766e" };
const PortfolioCtx = createContext<Ctx & { palette: Palette }>({ cv: defaultCV, source: "none", loading: true, palette: DEFAULT_PALETTE });
export const usePortfolio = () => useContext(PortfolioCtx);

export const NAV = [
  { href: "/portfolio", label: "Home" },
  { href: "/portfolio/cv", label: "CV" },
  { href: "/portfolio/projects", label: "Projects" },
  { href: "/portfolio/contact", label: "Contact" },
];

export default function PortfolioShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<Ctx>({ cv: defaultCV, source: "none", loading: true });
  const [themeFile, setThemeFile] = useState<ThemeFile | null>(null);
  const [picked, setPicked] = useState<LookId | null>(null);
  const [cardsPick, setCardsPick] = useState<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [banner, setBanner] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const file = await readThemeFile();
      const live = readLive();
      if (!alive) return;
      setThemeFile(file);
      // a look chosen with ?look=X or in the owner's preview switcher beats the theme file
      const q = new URLSearchParams(window.location.search).get("look");
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(LOOK_STORAGE_KEY);
      } catch {}
      if (hasIdentity(live)) {
        try {
          const c = localStorage.getItem(CARDS_STORAGE_KEY);
          if (c === "on" || c === "off") setCardsPick(c === "on");
        } catch {}
      }
      if (isLook(q)) setPicked(q);
      else if (hasIdentity(live) && isLook(stored)) setPicked(stored);
      if (hasIdentity(live)) return setState({ cv: live, source: "live", loading: false });
      const pub = await readPublished();
      if (!alive) return;
      if (hasIdentity(pub)) setState({ cv: pub, source: "published", loading: false });
      else setState({ cv: live ?? pub ?? defaultCV, source: "none", loading: false });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [menu]);

  const lookId: LookId = picked ?? themeFile?.look ?? DEFAULT_LOOK;
  const resolved = useMemo(() => resolveLook(lookId, themeFile, state.cv.theme, !picked), [lookId, themeFile, state.cv.theme, picked]);
  const pickLook = useCallback((id: LookId) => {
    setPicked(id);
    try {
      localStorage.setItem(LOOK_STORAGE_KEY, id);
    } catch {}
  }, []);

  const showCards = cardsPick ?? resolved.floatingCards;
  const toggleCards = useCallback(() => {
    setCardsPick(!showCards);
    try {
      localStorage.setItem(CARDS_STORAGE_KEY, showCards ? "off" : "on");
    } catch {}
  }, [showCards]);

  const h = state.cv.header;
  const name = h.name.trim() || "Your Name";
  const v = resolved.vars;
  // the portfolio can use a different photo from the CV (chosen in the builder's photo manager)
  const portfolioCv = useMemo(() => (state.cv.header.portfolioPhoto ? { ...state.cv, header: { ...state.cv.header, photo: state.cv.header.portfolioPhoto } } : state.cv), [state.cv]);
  const value = useMemo(() => ({ ...state, cv: portfolioCv, palette: { accent: v["--accent"], accent2: v["--accent2"], tint: v["--tint"], ink: v["--ink"] } }), [state, portfolioCv, v]);
  const isActive = (href: string) => (href === "/portfolio" ? path === href : path.startsWith(href));
  const links = h.links.filter((l) => l.url.trim());

  return (
    <PortfolioCtx.Provider value={value}>
      <div id="pf-root" data-hero={resolved.hero} data-look={resolved.look} data-cards={showCards ? "on" : "off"} style={resolved.vars as React.CSSProperties} className="pf-root min-h-screen bg-white text-slate-800 antialiased">
        <div aria-hidden className="pf-progress print:hidden" style={{ width: "100%", transform: `scaleX(${progress})` }} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow-lg">
          Skip to content
        </a>

        {state.source === "live" && banner && (
          <div className="print:hidden flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-slate-950 px-4 py-1.5 text-center text-xs text-slate-300">
            <span>
              Preview: this is the CV saved in this browser. Visitors see <code className="rounded bg-white/10 px-1">public/portfolio-cv.json</code>.
            </span>
            <span className="inline-flex items-center gap-1" role="group" aria-label="Preview a look">
              Look:
              {LOOK_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => pickLook(id)}
                  title={LOOKS[id].label}
                  aria-pressed={lookId === id}
                  className={`h-5 w-5 cursor-pointer rounded-full text-[11px] font-bold ${lookId === id ? "bg-[var(--pf-gold)] text-[var(--pf-on-gold)]" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
                >
                  {LOOKS[id].letter}
                </button>
              ))}
            </span>
            <button type="button" onClick={toggleCards} aria-pressed={showCards} title="Show or hide the floating cards around the photo" className="cursor-pointer rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 hover:bg-white/20">
              Photo cards: {showCards ? "on" : "off"}
            </button>
            <button type="button" onClick={() => setBanner(false)} className="cursor-pointer rounded px-1.5 text-slate-300 hover:bg-white/10" aria-label="Dismiss notice">
              ×
            </button>
          </div>
        )}

        <header className="pf-header print:hidden sticky top-0 z-40">
          <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/portfolio" className="flex items-center gap-2.5 font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--pf-gold)] text-sm font-extrabold text-[var(--pf-on-gold)] shadow-sm">{initials(name)}</span>
              <span className="hidden sm:block">{name}</span>
            </Link>

            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className="pf-navlink rounded-full px-4 py-2 text-sm font-semibold transition">
                  {n.label}
                </Link>
              ))}
              <Link href="/portfolio/contact" className="pf-btn-gold ml-2 rounded-full px-5 py-2 text-sm font-extrabold">
                Hire me
              </Link>
              <Link href="/" className="pf-navlink ml-1 rounded-full border border-current/30 px-4 py-2 text-sm font-semibold">
                CV Builder ↗
              </Link>
            </nav>

            <button
              type="button"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-current/30 md:hidden"
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              aria-controls="pf-mobile-menu"
              onClick={() => setMenu((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
          {menu && (
            <nav id="pf-mobile-menu" aria-label="Mobile" className="pf-mobile-menu px-4 pb-4 pt-2 md:hidden">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className="pf-navlink block rounded-lg px-3 py-3 text-base font-semibold">
                  {n.label}
                </Link>
              ))}
              <Link href="/" className="pf-navlink mt-1 block rounded-lg border border-current/30 px-3 py-3 text-base font-semibold">
                Open the CV Builder ↗
              </Link>
            </nav>
          )}
        </header>

        <main id="main">{state.loading ? <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">Loading…</div> : children}</main>

        <footer className="pf-footer print:hidden">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="text-lg font-bold text-white">{name}</p>
              {h.headline.trim() && <p className="mt-1 max-w-sm text-sm opacity-90">{h.headline}</p>}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {links.map((l) => (
                  <a key={l.id} href={hrefFor(l.url)} target="_blank" rel="noreferrer" aria-label={`${l.platform}: ${displayUrl(l.url)}`} title={`${l.platform}: ${displayUrl(l.url)}`} className="transition hover:scale-110">
                    <SocialIcon platform={l.platform} size={30} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--pf-gold)]">Explore</p>
              <ul className="mt-3 space-y-2 text-sm">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-white">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--pf-gold)]">Elsewhere</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-white">
                    CV Builder (edit my CV)
                  </Link>
                </li>
                {h.email.trim() && (
                  <li>
                    <a href={`mailto:${h.email.trim()}`} className="hover:text-white">
                      {h.email.trim()}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 py-4 text-center text-xs opacity-80">
            © {new Date().getFullYear()} {name}. Built with the CV Builder: everything on this site comes from one CV.
          </div>
        </footer>
      </div>
    </PortfolioCtx.Provider>
  );
}
