"use client";

import { LogOut, Moon } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

// Members have no bottom bar or More sheet (§4.2), so their theme toggle and
// sign-out live here instead. Admins already get both from AdminShell
// (BottomNav/MoreSheet/DesktopRail), so this header stays wordmark + count
// for them.
export function CatalogueHeader({ isAdmin, songCount }: { isAdmin: boolean; songCount: number }) {
  const [theme, setTheme] = useTheme();

  return (
    <header className="flex h-14 items-center justify-between px-4">
      <Wordmark size={22} />
      <div className="flex items-center gap-1">
        <span className="type-meta">
          {songCount} {songCount === 1 ? "song" : "songs"}
        </span>
        {!isAdmin && (
          <>
            <Button
              variant="icon"
              icon={Moon}
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            <form action="/api/auth/sign-out" method="post">
              <Button variant="icon" icon={LogOut} type="submit" aria-label="Sign out" />
            </form>
          </>
        )}
      </div>
    </header>
  );
}
