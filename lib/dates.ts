const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06" -> "Jun 2026", "present" -> "Present", anything else -> "" */
export function fmtMonth(v: string): string {
  if (v === "present") return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m ? `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim() : "";
}

/** "Jun 2026 – Present"; one-sided ranges show just the side that exists */
export function fmtRange(from: string, to: string): string {
  return [fmtMonth(from), fmtMonth(to)].filter(Boolean).join(" – ");
}

/** Best-effort conversion of legacy free-text dates ("Jun 2026", "Present") to MonthValue */
export function normDate(s: unknown): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  if (/^\d{4}-\d{2}$/.test(t) || t === "present") return t;
  if (/present|current|ongoing|now/i.test(t)) return "present";
  // V8 parses "" or "1 " as Jan 2001, so only try text that really contains a year
  if (!/\d{4}/.test(t)) return "";
  const d = new Date(`1 ${t}`);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2006-03-12" -> "12 Mar 2006" (UK day-first order) */
export function fmtDay(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}` : "";
}
