"use client";

import { useSyncExternalStore } from "react";

// Persisted per device (§4.3) — the A-/A+ control on song detail. Built on
// useSyncExternalStore for the same reason as src/lib/theme.ts's useTheme:
// reading localStorage from an effect trips react-hooks/set-state-in-effect,
// and this is the sanctioned way to read browser-only state without a
// hydration mismatch, with every reader (the A-/A+ buttons and the lyrics
// container) staying in sync automatically.
const STORAGE_KEY = "lyrics-size";
export const READING_SIZE_MIN = 16;
export const READING_SIZE_MAX = 32;
export const READING_SIZE_STEP = 2;
const DEFAULT_SIZE = 20;

const listeners = new Set<() => void>();

function getSize(): number {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return stored >= READING_SIZE_MIN && stored <= READING_SIZE_MAX ? stored : DEFAULT_SIZE;
}

function setSize(size: number) {
  if (typeof window === "undefined") return;
  const clamped = Math.min(READING_SIZE_MAX, Math.max(READING_SIZE_MIN, size));
  window.localStorage.setItem(STORAGE_KEY, String(clamped));
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getServerSnapshot(): number {
  return DEFAULT_SIZE;
}

export function useReadingSize() {
  const size = useSyncExternalStore(subscribe, getSize, getServerSnapshot);
  return [size, setSize] as const;
}
