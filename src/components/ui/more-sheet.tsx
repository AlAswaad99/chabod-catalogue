"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Presentation, Tag, Upload, Users, X } from "lucide-react";
import { SegmentedControl } from "./segmented-control";
import { useTheme } from "@/lib/theme";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const TOOLS = [
  { href: "/admin/slides", icon: Presentation, name: "Slides", subline: "Build a service deck" },
  { href: "/admin/import", icon: Upload, name: "Import", subline: "Paste lyrics in bulk" },
  { href: "/admin/members", icon: Users, name: "Members", subline: "Phone access · roles" },
  { href: "/admin/metadata-fields", icon: Tag, name: "Fields", subline: "Metadata cleanup" },
];

export function MoreSheet({ open, onClose, triggerRef }: MoreSheetProps) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [theme, changeTheme] = useTheme();
  const previousPathname = useRef(pathname);

  // Close on navigation.
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Focus trap + Esc + return focus to the More button on close.
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const focusable = sheet?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", handleKey);
      trigger?.focus();
    };
  }, [open, onClose, triggerRef]);

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-scrim motion-safe:transition-opacity motion-safe:duration-200 desktop:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="Admin tools"
        className={`fixed inset-x-0 z-20 border-t-2 border-fill bg-surface motion-safe:transition-transform motion-safe:duration-[240ms] motion-safe:ease-[cubic-bezier(.2,.8,.2,1)] desktop:hidden ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        style={{ bottom: 72 }}
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <span className="type-section-label">Admin tools</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center text-ink"
          >
            <X size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-rule">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="space-y-1 bg-surface p-4">
              <tool.icon size={24} strokeWidth={2} className="text-accent" aria-hidden />
              <p className="text-[16px] font-extrabold text-ink">{tool.name}</p>
              <p className="type-meta">{tool.subline}</p>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-rule px-4 py-3">
          <span className="type-body text-ink">Appearance</span>
          <SegmentedControl
            aria-label="Appearance"
            value={theme}
            onChange={changeTheme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </div>
        <form action="/api/auth/sign-out" method="post" className="border-t border-rule">
          <button type="submit" className="flex h-14 w-full items-center gap-2 pl-4 text-danger">
            <LogOut size={20} strokeWidth={2} aria-hidden />
            <span className="type-body">Sign out</span>
          </button>
        </form>
      </div>
    </>
  );
}
