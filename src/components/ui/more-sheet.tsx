"use client";

import { useEffect, useRef } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LogOut, Presentation, Tag, Upload, Users } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "./drawer";
import { SegmentedControl } from "./segmented-control";
import { useTheme } from "@/lib/theme";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const TOOLS = [
  { href: "/admin/slides", icon: Presentation, name: "Slides", subline: "Build a service deck" },
  { href: "/admin/import", icon: Upload, name: "Import", subline: "Paste lyrics in bulk" },
  { href: "/admin/members", icon: Users, name: "Members", subline: "Phone access · roles" },
  { href: "/admin/metadata-fields", icon: Tag, name: "Fields", subline: "Metadata cleanup" },
];

function PendingSpinner() {
  const { pending } = useLinkStatus();
  return (
    <Loader2
      size={16}
      aria-hidden
      className={`absolute right-3 top-3 animate-spin text-muted-foreground transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}
    />
  );
}

// The admin tools sheet (phone and tablet; the desktop rail replaces it). Built
// on the Drawer component: drag it down or flick to dismiss, tap the scrim or
// press Esc to close, focus is trapped and restored — all handled by the
// library rather than by hand.
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const pathname = usePathname();
  const [theme, changeTheme] = useTheme();
  const previousPathname = useRef(pathname);

  // Close once a navigation lands.
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} showSwipeHandle>
      <DrawerContent className="desktop:hidden">
        <DrawerHeader className="pb-3 text-left">
          <DrawerTitle className="type-section-label font-sans !text-[11.5px] !font-semibold">Admin tools</DrawerTitle>
          <DrawerDescription className="sr-only">Slides, import, members and metadata fields.</DrawerDescription>
        </DrawerHeader>

        <div className="grid grid-cols-2 gap-px border-y border-rule bg-rule">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="relative space-y-1 bg-popover p-4 transition-colors active:bg-secondary"
            >
              <tool.icon size={22} strokeWidth={1.75} className="text-brand" aria-hidden />
              <p className="font-display text-[17px] font-semibold text-foreground">{tool.name}</p>
              <p className="type-meta">{tool.subline}</p>
              <PendingSpinner />
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="type-body text-foreground">Appearance</span>
          <SegmentedControl
            aria-label="Appearance"
            value={theme}
            onChange={changeTheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>

        <form action="/api/auth/sign-out" method="post" className="border-t border-rule pb-[env(safe-area-inset-bottom)]">
          <button type="submit" className="flex h-14 w-full items-center gap-2 pl-4 text-destructive">
            <LogOut size={20} strokeWidth={2} aria-hidden />
            <span className="type-body">Sign out</span>
          </button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
