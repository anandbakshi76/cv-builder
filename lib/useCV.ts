"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { defaultCV, STORAGE_KEY } from "./defaults";
import { migrate } from "./migrate";
import type { CVData } from "./types";

export type SaveStatus = "saved" | "unsaved" | "error";

function load(): CVData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultCV;
  } catch {
    return defaultCV;
  }
}

export function useCV() {
  const [data, setData] = useState<CVData | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<CVData | null>(null);

  useEffect(() => {
    const d = load();
    latest.current = d;
    setData(d);
  }, []);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!latest.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  const update = useCallback(
    (fn: (d: CVData) => CVData) => {
      if (!latest.current) return;
      latest.current = fn(latest.current);
      setData(latest.current);
      setStatus("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  // Don't lose a pending debounce if the tab is closed or reloaded.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) flush();
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  const reset = useCallback(() => update(() => defaultCV), [update]);

  return { data, status, update, reset };
}
