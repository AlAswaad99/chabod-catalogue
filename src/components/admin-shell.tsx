"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFullscreen } from "@/lib/fullscreen";
import { BottomNav } from "./ui/bottom-nav";
import { MoreSheet } from "./ui/more-sheet";
import { DesktopRail } from "./ui/desktop-rail";

export function AdminShell({ phoneNumber, children }: { phoneNumber: string | null; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { fullscreen } = useFullscreen();

  // Tablet split-view (§4.10): on the catalogue/song-detail routes, the
  // 380px list column is the only thing BottomNav sits under — everywhere
  // else it still spans the full width below the desktop breakpoint.
  const isSplitViewRoute = pathname === "/catalogue" || pathname.startsWith("/songs/");

  // Song detail's reading focus mode hides all admin chrome — DesktopRail,
  // BottomNav, MoreSheet — so the reading column gets the full screen.
  if (fullscreen) {
    return <>{children}</>;
  }

  return (
    <>
      <DesktopRail phoneNumber={phoneNumber} />
      <div className="pb-[72px] desktop:pb-0 desktop:pl-[232px]">{children}</div>
      <BottomNav
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((v) => !v)}
        moreButtonRef={moreButtonRef}
        constrainWidthAtTablet={isSplitViewRoute}
      />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} triggerRef={moreButtonRef} />
    </>
  );
}
