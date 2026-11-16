"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Loader2, Music, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BottomNavProps {
  moreOpen: boolean;
  onToggleMore: () => void;
  moreButtonRef?: React.RefObject<HTMLButtonElement | null>;
  /** True on the catalogue/song-detail routes, where the 768-1199px tablet
   * split-view's 380px list column means BottomNav spans under it only,
   * not the full viewport width (§4.10). */
  constrainWidthAtTablet?: boolean;
}

// Swaps the icon for a spinner while its link's navigation is in flight, so a
// tap always shows an immediate response (no wondering whether it registered).
function NavIcon({ icon: Icon, strokeWidth = 1.9 }: { icon: LucideIcon; strokeWidth?: number }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 size={22} className="animate-spin" aria-hidden />
  ) : (
    <Icon size={22} strokeWidth={strokeWidth} aria-hidden />
  );
}

// Admin, mobile/tablet only (§3.14) — hidden at the desktop breakpoint,
// where DesktopRail takes over both this and MoreSheet.
export function BottomNav({ moreOpen, onToggleMore, moreButtonRef, constrainWidthAtTablet }: BottomNavProps) {
  const pathname = usePathname();
  const catalogueActive = pathname === "/catalogue" && !moreOpen;

  return (
    <nav
      aria-label="Primary"
      className={`fixed bottom-0 left-0 z-30 grid h-[72px] grid-cols-3 border-t border-rule bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur desktop:hidden ${
        constrainWidthAtTablet ? "right-auto w-full tablet:w-[380px] tablet:border-r" : "right-0"
      }`}
    >
      <Link
        href="/catalogue"
        onClick={() => moreOpen && onToggleMore()}
        aria-current={catalogueActive ? "page" : undefined}
        className={`relative flex flex-col items-center justify-center gap-1 ${catalogueActive ? "text-brand" : "text-muted-foreground"}`}
      >
        {catalogueActive && <span className="absolute inset-x-6 top-0 h-[2px] bg-fill" aria-hidden />}
        <NavIcon icon={Music} />
        <span className="text-[12px] font-semibold">Catalogue</span>
      </Link>
      <Link
        href="/admin/songs/new"
        className="m-2 flex flex-col items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground"
      >
        <NavIcon icon={Plus} strokeWidth={2.3} />
        <span className="text-[12px] font-semibold">Add song</span>
      </Link>
      <button
        ref={moreButtonRef}
        type="button"
        onClick={onToggleMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={`flex flex-col items-center justify-center gap-1 ${moreOpen ? "text-brand" : "text-muted-foreground"}`}
      >
        <Ellipsis size={22} strokeWidth={1.9} aria-hidden />
        <span className="text-[12px] font-semibold">More</span>
      </button>
    </nav>
  );
}
