"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";
const THEME_COLOR: Record<Theme, string> = { dark: "#0d2124", light: "#f4f1ea" };

// Inlined into a <script> in the root layout so it runs before first paint —
// keep in sync with getTheme()/setTheme() below. Duplicated deliberately:
// this string runs pre-hydration, outside the module graph.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

const listeners = new Set<() => void>();

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getServerSnapshot(): Theme {
  return "dark";
}

// localStorage-backed theme is unknown to the server, so reading it can't
// happen during the initial render without risking a hydration mismatch —
// and setting it from an effect trips react-hooks/set-state-in-effect.
// useSyncExternalStore is the sanctioned escape hatch for exactly this:
// React renders getServerSnapshot() on both the server and the first client
// pass, then re-renders with the real client value right after hydration,
// with no manual effect/setState needed.
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerSnapshot);
  return [theme, setTheme] as const;
}
