import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { FullscreenProvider } from "@/lib/fullscreen";
import { AdminShell } from "@/components/admin-shell";

// The nav-restructure fix: members get no persistent chrome from this
// layout at all (their header/back-button live in each screen itself,
// per CLAUDE_CODE_PROMPT.md §4.2-§4.3). Admins get BottomNav+MoreSheet
// below the desktop breakpoint, DesktopRail at and above it — never both
// (§4.9-§4.10).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const phoneNumber = user.phone ? `+${user.phone}` : null;

  return (
    <FullscreenProvider>
      <ToastProvider>
        {user.isAdmin ? <AdminShell phoneNumber={phoneNumber}>{children}</AdminShell> : children}
      </ToastProvider>
    </FullscreenProvider>
  );
}
