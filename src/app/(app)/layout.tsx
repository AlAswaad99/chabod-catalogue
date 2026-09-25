import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.app_metadata?.role === "admin";

  const navItems = [
    { href: "/catalogue", label: "Catalogue" },
    ...(isAdmin
      ? [
          { href: "/admin/songs/new", label: "Add song" },
          { href: "/admin/metadata-fields", label: "Fields" },
          { href: "/admin/members", label: "Members" },
          { href: "/admin/import", label: "Import" },
          { href: "/admin/slides", label: "Slides" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Desktop / tablet top nav */}
      <header className="hidden sm:flex items-center justify-between border-b border-foreground/10 px-6 py-4">
        <Link href="/catalogue" className="font-semibold">
          Chabod Choir Catalogue
        </Link>
        <nav className="flex gap-4 text-sm">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          <form action="/api/auth/sign-out" method="post">
            <button type="submit" className="text-foreground/60 hover:underline">
              Sign out
            </button>
          </form>
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-foreground/10">
        <span className="font-semibold">Chabod Catalogue</span>
        <form action="/api/auth/sign-out" method="post">
          <button type="submit" className="text-sm text-foreground/60">
            Sign out
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20 sm:pb-8">{children}</main>

      {/* Mobile bottom nav — this is the primary navigation surface on the
          device most choir members will actually use during rehearsal. */}
      <nav className="fixed bottom-0 inset-x-0 sm:hidden border-t border-foreground/10 bg-background flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 text-center text-xs py-1 text-foreground/70"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
