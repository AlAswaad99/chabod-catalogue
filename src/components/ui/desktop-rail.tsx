"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LogOut, Music, Plus, Presentation, Tag, Upload, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wordmark } from "./wordmark";
import { Button } from "./button";
import { SegmentedControl } from "./segmented-control";
import { useTheme } from "@/lib/theme";

const TOOLS = [
  { href: "/admin/slides", icon: Presentation, name: "Slides" },
  { href: "/admin/import", icon: Upload, name: "Import" },
  { href: "/admin/members", icon: Users, name: "Members" },
  { href: "/admin/metadata-fields", icon: Tag, name: "Fields" },
];

function RailIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 size={19} className="animate-spin" aria-hidden />
  ) : (
    <Icon size={19} strokeWidth={1.8} className={className} aria-hidden />
  );
}

function RailLink({ href, icon, name, active }: { href: string; icon: LucideIcon; name: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-10 items-center gap-3 rounded-md pl-3 transition-colors ${
        active ? "bg-secondary font-semibold text-foreground" : "text-foreground/80 hover:bg-secondary/60"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-fill" aria-hidden />}
      <RailIcon icon={icon} className={active ? "text-brand" : "text-muted-foreground"} />
      <span className="type-body">{name}</span>
    </Link>
  );
}

// Desktop (1200px+) admin chrome — replaces both BottomNav and MoreSheet
// entirely (§4.10). Members never see this at any width.
export function DesktopRail({ phoneNumber }: { phoneNumber: string | null }) {
  const pathname = usePathname();
  const [theme, changeTheme] = useTheme();

  const catalogueActive = pathname === "/catalogue" || pathname.startsWith("/songs/");

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-[232px] flex-col border-r border-rule bg-card desktop:flex">
      <div className="space-y-1 px-5 pb-4 pt-6">
        <Wordmark size={36} />
        <p className="type-meta">Chabod Choir</p>
      </div>

      <div className="px-3">
        <Button variant="primary" icon={Plus} href="/admin/songs/new">
          Add song
        </Button>
      </div>

      <nav className="mt-4 space-y-0.5 px-3" aria-label="Primary">
        <RailLink href="/catalogue" icon={Music} name="Catalogue" active={catalogueActive} />
      </nav>

      <p className="type-section-label mt-6 px-5 pb-1">Admin tools</p>
      <nav className="space-y-0.5 px-3" aria-label="Admin tools">
        {TOOLS.map((tool) => (
          <RailLink key={tool.href} href={tool.href} icon={tool.icon} name={tool.name} active={pathname === tool.href} />
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-rule px-4 py-4">
        <SegmentedControl
          aria-label="Appearance"
          value={theme}
          onChange={changeTheme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        {phoneNumber && <p className="type-meta">{phoneNumber}</p>}
        <form action="/api/auth/sign-out" method="post">
          <button type="submit" className="flex h-11 w-full items-center gap-2 text-destructive">
            <LogOut size={18} strokeWidth={2} aria-hidden />
            <span className="type-body">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
