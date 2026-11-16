"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFullscreen } from "@/lib/fullscreen";

// Lays out the catalogue list beside whichever page is open (§4.10). The list
// is a slot rendered by the browse *layout*, so it stays mounted — keeping its
// search text, scroll position and already-loaded songs — while the user moves
// between /catalogue and /songs/[id]. Only the right-hand page re-renders.
//
//   phone    /catalogue: list only          /songs/[id]: song only
//   tablet   list column + page (empty state on /catalogue)
//   desktop  /catalogue: list only          /songs/[id]: song only (rail + sidebar)
export function BrowseShell({ list, children }: { list: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const { fullscreen } = useFullscreen();
  const isSong = pathname.startsWith("/songs/");

  // Reading focus mode shows only the lyrics. Hide (don't unmount) the list so
  // search state survives exiting fullscreen.
  const listClass = fullscreen
    ? "hidden"
    : isSong
      ? "hidden tablet:block tablet:w-[380px] tablet:shrink-0 tablet:border-r tablet:border-rule desktop:hidden"
      : "tablet:w-[380px] tablet:shrink-0 tablet:border-r tablet:border-rule desktop:w-auto desktop:border-r-0";

  const pageClass = isSong
    ? "tablet:min-w-0 tablet:flex-1"
    : "hidden tablet:flex tablet:flex-1 tablet:items-center tablet:justify-center desktop:hidden";

  return (
    <div className="tablet:flex desktop:block">
      <div className={listClass}>{list}</div>
      <div className={pageClass}>{children}</div>
    </div>
  );
}
