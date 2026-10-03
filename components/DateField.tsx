"use client";
import { fmtDay, fmtMonth, fmtRange } from "@/lib/dates";
import { useEditing } from "./Editable";

const inputCls =
  "cursor-pointer rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-sm text-slate-700 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30";

const openPicker = (el: HTMLInputElement) => {
  try {
    el.showPicker?.();
  } catch {
    /* some browsers only allow it from a trusted gesture; the native control still works */
  }
};

/** Month picker. Edit: native calendar (click opens it). Preview: "Jun 2026" text. */
export function DateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const editing = useEditing();
  if (!editing) return value ? <span>{fmtMonth(value)}</span> : null;
  return (
    <input
      type="month"
      aria-label={label}
      title={label}
      value={/^\d{4}-\d{2}$/.test(value) ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => openPicker(e.currentTarget)}
      className={inputCls}
    />
  );
}

/** White pill used for dates in preview, like the template's date badge. */
export function DatePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
      {children}
    </span>
  );
}

/** From / To pickers with an "Ongoing" checkbox that stores "present". */
export function DateRange({
  from,
  to,
  onChange,
  label = "",
}: {
  from: string;
  to: string;
  onChange: (p: { from?: string; to?: string }) => void;
  label?: string;
}) {
  const editing = useEditing();
  if (!editing) {
    const text = fmtRange(from, to);
    return text ? <DatePill>{text}</DatePill> : null;
  }
  const ongoing = to === "present";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
      <DateField value={from} onChange={(v) => onChange({ from: v })} label={`${label} from date`.trim()} />
      <span>–</span>
      {ongoing ? (
        <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-300">Present</span>
      ) : (
        <DateField value={to} onChange={(v) => onChange({ to: v })} label={`${label} to date`.trim()} />
      )}
      <label className="flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          checked={ongoing}
          onChange={(e) => onChange({ to: e.target.checked ? "present" : "" })}
          className="cursor-pointer accent-[var(--accent)]"
        />
        Ongoing
      </label>
    </div>
  );
}

/** Full-date calendar picker (day precision), e.g. for date of birth. */
export function FullDateField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const editing = useEditing();
  if (!editing) return value ? <span>{fmtDay(value)}</span> : null;
  return (
    <input
      type="date"
      aria-label={label}
      title={label}
      value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => openPicker(e.currentTarget)}
      className={inputCls}
    />
  );
}
