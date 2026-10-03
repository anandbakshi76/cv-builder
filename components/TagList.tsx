"use client";
import { useState } from "react";
import { useEditing } from "./Editable";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}

/** Comma-separated tag input. Each tag is clickable (highlight toggle; hook for future filtering). */
export function TagList({ tags, onChange, placeholder }: Props) {
  const editing = useEditing();
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());

  const commit = (raw: string) => {
    const incoming = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length) {
      const seen = new Set(tags.map((t) => t.toLowerCase()));
      const fresh = incoming.filter((t) => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
      if (fresh.length) onChange([...tags, ...fresh]);
    }
    setDraft("");
  };

  const toggle = (t: string) =>
    setActive((s) => {
      const n = new Set(s);
      if (!n.delete(t)) n.add(t);
      return n;
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm transition ${
            active.has(t)
              ? "border-[var(--accent)] bg-[var(--ink)] text-white"
              : "border-[var(--accent)]/25 bg-[var(--tint)] text-[var(--ink)] hover:border-[var(--accent)]"
          }`}
        >
          <button type="button" onClick={() => toggle(t)} aria-pressed={active.has(t)} className="cursor-pointer">
            {t}
          </button>
          {editing && (
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="cursor-pointer leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {editing && (
        <input
          value={draft}
          placeholder={tags.length ? "Add another…" : placeholder}
          aria-label={placeholder}
          spellCheck
          lang="en-GB"
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          className="min-w-24 flex-1 rounded px-1 py-0.5 text-sm outline-none placeholder:italic placeholder:text-slate-400 focus:bg-[var(--tint)] focus:ring-2 focus:ring-[var(--accent)]/40"
        />
      )}
    </div>
  );
}
