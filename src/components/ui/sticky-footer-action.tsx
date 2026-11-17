import type { ReactNode } from "react";

// A bar pinned to the bottom of the screen for a screen's main action.
// `aboveAdminNav` lifts it above the fixed 72px admin bottom bar (phone and
// tablet), which would otherwise cover it; at desktop width that bar is gone.
export function StickyFooterAction({ children, aboveAdminNav }: { children: ReactNode; aboveAdminNav?: boolean }) {
  return (
    <div
      className={`sticky z-20 border-t border-rule bg-ground px-4 py-3 ${
        aboveAdminNav
          ? "bottom-[calc(72px+env(safe-area-inset-bottom))] desktop:bottom-0 desktop:pb-3"
          : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {children}
    </div>
  );
}
