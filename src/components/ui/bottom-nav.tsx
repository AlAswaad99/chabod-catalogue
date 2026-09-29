"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Music, Plus } from "lucide-react";

interface BottomNavProps {
  moreOpen: boolean;
  onToggleMore: () => void;
  moreButtonRef?: React.RefObject<HTMLButtonElement | null>;
  /** True on the catalogue/song-detail routes, where the 768-1199px tablet
   * split-view's 380px list column means BottomNav spans under it only,
   * not the full viewport width (§4.10). */
  constrainWidthAtTablet?: boolean;
}

// Admin, mobile/tablet only (§3.14) — hidden at the desktop breakpoint,
// where DesktopRail takes over both this and MoreSheet.
export function BottomNav({ moreOpen, onToggleMore, moreButtonRef, constrainWidthAtTablet }: BottomNavProps) {
  const pathname = usePathname();
  const catalogueActive = pathname === "/catalogue" && !moreOpen;

  return (
    <nav
      className={`fixed bottom-0 left-0 z-30 grid h-[72px] grid-cols-3 border-t-2 border-rule bg-ground pb-[env(safe-area-inset-bottom)] desktop:hidden ${
        constrainWidthAtTablet ? "right-auto w-full tablet:w-[380px] tablet:border-r-2" : "right-0"
      }`}
    >
      <Link
        href="/catalogue"
        onClick={() => moreOpen && onToggleMore()}
        className={`relative flex items-center gap-2 pl-[18px] ${catalogueActive ? "text-accent" : "text-muted"}`}
      >
        {catalogueActive && <span className="absolute inset-x-0 top-0 h-[3px] bg-fill" aria-hidden />}
        <Music size={22} strokeWidth={2} aria-hidden />
        <span className="type-action text-[13px]">Catalogue</span>
      </Link>
      <Link href="/admin/songs/new" className="flex items-center gap-2 bg-fill pl-[18px] text-on-fill">
        <Plus size={22} strokeWidth={2.4} aria-hidden />
        <span className="type-action text-[13px]">Add song</span>
      </Link>
      <button
        ref={moreButtonRef}
        type="button"
        onClick={onToggleMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={`flex items-center gap-2 pl-[18px] ${moreOpen ? "text-accent" : "text-muted"}`}
      >
        <Ellipsis size={22} strokeWidth={2} aria-hidden />
        <span className="type-action text-[13px]">More</span>
      </button>
    </nav>
  );
}
