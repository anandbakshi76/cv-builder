import type { ThemeId } from "./types";

/**
 * accent = fills, bars and the banner start colour; accent2 = banner gradient end; tint = light chip/strip background;
 * ink = darker shade for text and buttons on white (keeps contrast at small sizes).
 */
export const THEMES: Record<ThemeId, { label: string; accent: string; accent2: string; tint: string; ink: string }> = {
  navy: { label: "Navy", accent: "#1e3a5f", accent2: "#2c5282", tint: "#eaf0f8", ink: "#1e3a5f" },
  teal: { label: "Teal", accent: "#0f766e", accent2: "#0e7490", tint: "#e6f6f4", ink: "#0f766e" },
  slate: { label: "Slate", accent: "#334155", accent2: "#0f172a", tint: "#f1f5f9", ink: "#334155" },
  forest: { label: "Forest", accent: "#166534", accent2: "#1d7a46", tint: "#ecfdf3", ink: "#166534" },
  burgundy: { label: "Burgundy", accent: "#7f1d1d", accent2: "#9f1239", tint: "#fbeff0", ink: "#7f1d1d" },
  gold: { label: "Gold", accent: "#c4821b", accent2: "#d9a441", tint: "#fdf4e3", ink: "#8f5d0c" },
  indigo: { label: "Indigo", accent: "#4338ca", accent2: "#0e7490", tint: "#eef2ff", ink: "#4338ca" },
  emerald: { label: "Emerald", accent: "#047857", accent2: "#0369a1", tint: "#ecfdf5", ink: "#047857" },
  rose: { label: "Rose", accent: "#be123c", accent2: "#7e22ce", tint: "#fff1f2", ink: "#be123c" },
  amber: { label: "Amber", accent: "#b45309", accent2: "#be123c", tint: "#fffbeb", ink: "#b45309" },
};

export const THEME_GROUPS: { id: string; title: string; note: string; ids: ThemeId[] }[] = [
  {
    id: "conservative",
    title: "Conservative",
    note: "Finance, law, consulting, corporate, public sector",
    ids: ["navy", "teal", "slate", "forest", "burgundy"],
  },
  {
    id: "creative",
    title: "Creative",
    note: "Design, marketing, hospitality, retail, start-ups",
    ids: ["gold", "indigo", "emerald", "rose", "amber"],
  },
];

export const swatch = (id: ThemeId) => `linear-gradient(135deg, ${THEMES[id].accent}, ${THEMES[id].accent2})`;
