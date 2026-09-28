"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { BottomNav } from "./ui/bottom-nav";
import { MoreSheet } from "./ui/more-sheet";
import { DesktopRail } from "./ui/desktop-rail";

export function AdminShell({ phoneNumber, children }: { phoneNumber: string | null; children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DesktopRail phoneNumber={phoneNumber} />
      <div className="pb-[72px] desktop:pb-0 desktop:pl-[232px]">{children}</div>
      <BottomNav
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((v) => !v)}
        moreButtonRef={moreButtonRef}
      />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} triggerRef={moreButtonRef} />
    </>
  );
}
