"use client";
import { useEditing } from "./Editable";

export function Section({
  title,
  visible,
  children,
  compact,
  hideTitle,
}: {
  title: React.ReactNode;
  visible: boolean;
  children: React.ReactNode;
  /** Tighter top margin */
  compact?: boolean;
  /** Heading omitted (for self-explanatory blocks, e.g. the stat tiles in Preview) */
  hideTitle?: boolean;
}) {
  if (!visible) return null;
  return (
    <section className={compact ? "mt-4" : "mt-6"}>
      {!hideTitle && (
      <h2 className="mb-4 break-after-avoid border-b border-slate-200">
        <span className="-mb-px inline-block border-b-[3px] border-[var(--accent)] pb-1 text-[0.95rem] font-semibold uppercase tracking-wider text-[var(--ink)]">
          {title}
        </span>
      </h2>
      )}
      {children}
    </section>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  const editing = useEditing();
  if (!editing) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print mt-3 cursor-pointer rounded-full bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
    >
      + {label}
    </button>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  const editing = useEditing();
  if (!editing) return null;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="no-print cursor-pointer rounded-full px-2 text-lg leading-none text-slate-400 hover:bg-red-50 hover:text-red-600"
    >
      ×
    </button>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-500">{children}</span>;
}
