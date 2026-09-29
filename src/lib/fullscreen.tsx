"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface FullscreenContextValue {
  fullscreen: boolean;
  setFullscreen: (value: boolean) => void;
}

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

// App-wide so AdminShell (a layout-level component, outside any one page)
// can hide its own chrome — DesktopRail, BottomNav, MoreSheet — while song
// detail's reading focus mode is active. Resets on every route change so it
// can never "leak" chrome-hidden onto a page the toggle wasn't meant for
// (back button, a Link click, anything other than the exit control).
export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [fullscreen, setFullscreen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset during render, not in an effect — this is the sanctioned pattern
  // for "adjust state when a prop changes" (avoids both an extra render
  // pass and react-hooks/set-state-in-effect).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (fullscreen) setFullscreen(false);
  }

  return (
    <FullscreenContext.Provider value={{ fullscreen, setFullscreen }}>
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  const ctx = useContext(FullscreenContext);
  if (!ctx) throw new Error("useFullscreen must be used within a FullscreenProvider");
  return ctx;
}
