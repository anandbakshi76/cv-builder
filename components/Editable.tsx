"use client";
import { createContext, useContext, useEffect, useRef } from "react";

/** true = edit mode, false = preview (empty content hidden, nothing editable). */
export const EditContext = createContext(true);
export const useEditing = () => useContext(EditContext);

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  /** Focus on mount (used when a new bullet is created) */
  autoFocus?: boolean;
  /** Single-line fields: Enter normally just blurs; bullets use this to add the next bullet instead */
  onEnter?: () => void;
  /** Backspace in an already-empty field */
  onBackspaceEmpty?: () => void;
}

/**
 * Click-to-edit text. Uncontrolled contentEditable so the caret never jumps;
 * the DOM is only rewritten when the value changes from outside (e.g. reset).
 */
export function Editable({
  value,
  onChange,
  placeholder,
  multiline,
  className = "",
  autoFocus,
  onEnter,
  onBackspaceEmpty,
}: Props) {
  const editing = useEditing();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  }, [value, editing]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  if (!editing && value.trim() === "") return null;

  return (
    <span
      ref={ref}
      contentEditable={editing ? "plaintext-only" : false}
      suppressContentEditableWarning
      spellCheck={editing}
      lang="en-GB"
      role={editing ? "textbox" : undefined}
      aria-label={placeholder}
      data-placeholder={placeholder}
      className={`editable ${multiline ? "multiline" : ""} ${className}`}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          if (onEnter) onEnter();
          else e.currentTarget.blur();
        } else if (e.key === "Backspace" && onBackspaceEmpty && !(e.currentTarget.textContent ?? "")) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
    />
  );
}
