import type { ReactNode } from "react";

export function StickyFooterAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t-2 border-rule bg-ground px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
