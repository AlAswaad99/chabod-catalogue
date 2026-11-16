import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { BrowseShell } from "@/components/browse-shell";
import { CatalogueListData } from "@/components/catalogue-list-data";
import { CatalogueListSkeleton } from "@/components/catalogue-list-skeleton";

// Persistent across /catalogue and /songs/[id]: Next.js doesn't re-run a
// layout when you navigate between its children, so the catalogue is fetched
// once here instead of on every song you open.
export default async function BrowseLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const isAdmin = user?.isAdmin ?? false;

  return (
    <BrowseShell
      list={
        <Suspense fallback={<CatalogueListSkeleton />}>
          <CatalogueListData isAdmin={isAdmin} />
        </Suspense>
      }
    >
      {children}
    </BrowseShell>
  );
}
