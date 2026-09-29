"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Music, Plus, Presentation, Tag, Upload, Users } from "lucide-react";
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

// Desktop (1200px+) admin chrome — replaces both BottomNav and MoreSheet
// entirely (§4.10). Members never see this at any width.
export function DesktopRail({ phoneNumber }: { phoneNumber: string | null }) {
  const pathname = usePathname();
  const [theme, changeTheme] = useTheme();

  const catalogueActive = pathname === "/catalogue";

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-[232px] flex-col border-r-2 border-rule bg-ground desktop:flex">
      <div className="space-y-1 px-5 pb-4 pt-6">
        <Wordmark size={40} />
        <p className="type-meta">Chabod Choir</p>
      </div>

      <div className="px-3">
        <Button variant="primary" icon={Plus} href="/admin/songs/new">
          Add song
        </Button>
      </div>

      <nav className="mt-4 px-3">
        <Link
          href="/catalogue"
          className={`relative flex h-11 items-center gap-3 pl-3 ${
            catalogueActive ? "bg-surface text-accent" : "text-ink"
          }`}
        >
          {catalogueActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-fill" aria-hidden />}
          <Music size={20} strokeWidth={2} aria-hidden />
          <span className="type-body">Catalogue</span>
        </Link>
      </nav>

      <p className="type-section-label mt-6 px-4">Admin tools</p>
      <nav className="px-3">
        {TOOLS.map((tool) => {
          const active = pathname === tool.href;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={`relative flex h-11 items-center gap-3 pl-3 ${active ? "bg-surface text-accent" : "text-ink"}`}
            >
              {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-fill" aria-hidden />}
              <tool.icon size={20} strokeWidth={2} className="text-accent" aria-hidden />
              <span className="type-body">{tool.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-rule px-4 py-4">
        <SegmentedControl
          aria-label="Appearance"
          value={theme}
          onChange={changeTheme}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
        {phoneNumber && <p className="type-meta">{phoneNumber}</p>}
        <form action="/api/auth/sign-out" method="post">
          <button type="submit" className="flex h-11 w-full items-center gap-2 text-danger">
            <LogOut size={18} strokeWidth={2} aria-hidden />
            <span className="type-body">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
