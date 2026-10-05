import { THEMES } from "./themes";
import type { ThemeId } from "./types";

/* ---------------------------------------------------------------------------------------------
   Portfolio looks (Phase 5). The portfolio has its OWN colour setting, separate from the CV builder:
   `public/portfolio-theme.json` (optional), for example
     { "look": "teal-gold" }                          // one of the four ready-made looks
     { "look": "light", "base": "navy", "accent": "#ff7a59" }   // ... with your own base colour and accent
   Without the file the default look (teal + gold) is used. The looks have their OWN colours: changing the theme in the CV
   builder does not change them. Only if you set "base": "cv" in the file does the portfolio follow the CV's theme.
   The CV builder, its saved data and its themes are not touched by any of this.
   --------------------------------------------------------------------------------------------- */

export type LookId = "teal-gold" | "teal-coral" | "light" | "navy-gold" | "black-gold" | "slate-gold";
export type HeroStyle = "dark" | "light";

export interface Look {
  id: LookId;
  letter: string;
  label: string;
  /** colour family: a CV theme id, or "cv" = follow the theme chosen in the CV builder */
  base: ThemeId | "cv";
  accent: string;
  hero: HeroStyle;
  /** own palette instead of a CV theme (used by the black look) */
  palette?: { accent: string; accent2: string; tint: string; ink: string };
}

export const LOOKS: Record<LookId, Look> = {
  "teal-gold": { id: "teal-gold", letter: "A", label: "Teal + gold", base: "teal", accent: "#f2b84b", hero: "dark" },
  "teal-coral": { id: "teal-coral", letter: "B", label: "Teal + coral", base: "teal", accent: "#ff7a59", hero: "dark" },
  light: { id: "light", letter: "C", label: "Light hero (teal) + gold", base: "teal", accent: "#f2b84b", hero: "light" },
  "navy-gold": { id: "navy-gold", letter: "D", label: "Deep navy + gold", base: "navy", accent: "#f2b84b", hero: "dark" },
  "black-gold": { id: "black-gold", letter: "E", label: "Black + gold", base: "slate", accent: "#e5b94c", hero: "dark", palette: { accent: "#2b2b30", accent2: "#3a3a42", tint: "#f4efe2", ink: "#1a1a1d" } },
  "slate-gold": { id: "slate-gold", letter: "F", label: "Slate + gold", base: "slate", accent: "#f2b84b", hero: "dark" },
};
export const LOOK_IDS = Object.keys(LOOKS) as LookId[];
export const DEFAULT_LOOK: LookId = "teal-gold";
export const THEME_FILE_URL = "/portfolio-theme.json";
export const LOOK_STORAGE_KEY = "portfolio:look";
export const CARDS_STORAGE_KEY = "portfolio:cards";

export interface ThemeFile {
  look?: LookId;
  base?: ThemeId | "cv";
  accent?: string;
  hero?: HeroStyle;
  /** show the floating highlight cards around the photo (default true) */
  floatingCards?: boolean;
}

export const isLook = (v: unknown): v is LookId => typeof v === "string" && v in LOOKS;
const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim());

export async function readThemeFile(): Promise<ThemeFile | null> {
  try {
    const res = await fetch(THEME_FILE_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    const out: ThemeFile = {};
    if (isLook(raw.look)) out.look = raw.look;
    if (raw.base === "cv" || (typeof raw.base === "string" && raw.base in THEMES)) out.base = raw.base as ThemeFile["base"];
    if (isHex(raw.accent)) out.accent = (raw.accent as string).trim();
    if (raw.hero === "dark" || raw.hero === "light") out.hero = raw.hero;
    if (typeof raw.floatingCards === "boolean") out.floatingCards = raw.floatingCards;
    return out;
  } catch {
    return null;
  }
}

const lum = (hex: string) => {
  const c = (i: number) => {
    const v = parseInt(hex.slice(1 + i, 3 + i), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4);
};

export interface ResolvedLook {
  look: LookId;
  hero: HeroStyle;
  floatingCards: boolean;
  vars: Record<string, string>;
}

/** Turn the chosen look (+ optional file overrides + the CV's own theme) into CSS variables for the portfolio. */
export function resolveLook(lookId: LookId, file: ThemeFile | null, cvTheme: ThemeId, applyFile: boolean): ResolvedLook {
  const preset = LOOKS[lookId];
  const f = applyFile && file ? file : {};
  // a file that names a look but also sets base/accent/hero overrides that look's defaults
  const baseId = f.base ?? preset.base;
  const themeId: ThemeId = baseId === "cv" ? cvTheme : baseId;
  // the black look carries its own palette unless the file names a base colour
  const t = !f.base && preset.palette ? preset.palette : (THEMES[themeId] ?? THEMES.teal);
  const gold = f.accent ?? preset.accent;
  const hero = f.hero ?? preset.hero;
  return {
    look: lookId,
    hero,
    floatingCards: f.floatingCards ?? true,
    vars: {
      "--accent": t.accent,
      "--accent2": t.accent2,
      "--tint": t.tint,
      "--ink": t.ink,
      "--pf-gold": gold,
      "--pf-on-gold": lum(gold) > 0.35 ? "#0b2f2c" : "#ffffff",
    },
  };
}
