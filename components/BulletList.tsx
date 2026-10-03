"use client";
import { useState } from "react";
import { nonBlank } from "@/lib/cv";
import { Editable, useEditing } from "./Editable";

/**
 * Bullet-point editor. Enter adds the next bullet, Backspace in an empty bullet removes it.
 * Preview renders a plain <ul> of the non-empty bullets.
 */
export function BulletList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const editing = useEditing();
  const [focusIdx, setFocusIdx] = useState(-1);

  if (!editing) {
    const shown = nonBlank(items);
    if (!shown.length) return null;
    return (
      <ul className="list-disc space-y-1 pl-5 marker:text-[var(--ink)]">
        {shown.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    );
  }

  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const insertAfter = (i: number) => {
    const next = [...items];
    next.splice(i + 1, 0, "");
    setFocusIdx(i + 1);
    onChange(next);
  };
  const removeAt = (i: number) => {
    setFocusIdx(Math.max(0, i - 1));
    onChange(items.filter((_, j) => j !== i));
  };

  return (
    <div>
      <ul className="list-disc space-y-1 pl-5 marker:text-[var(--ink)]">
        {items.map((t, i) => (
          <li key={i} className="group/bullet">
            <Editable
              value={t}
              onChange={(v) => set(i, v)}
              placeholder={placeholder}
              autoFocus={focusIdx === i}
              onEnter={() => insertAfter(i)}
              onBackspaceEmpty={items.length > 1 || i > 0 ? () => removeAt(i) : undefined}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => insertAfter(items.length - 1)}
        className="no-print mt-1 cursor-pointer text-sm font-medium text-[var(--ink)] hover:underline"
      >
        + Add bullet
      </button>
    </div>
  );
}
