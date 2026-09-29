import { createClient } from "@/lib/supabase/server";
import { CatalogueListPane } from "@/components/catalogue-list-pane";

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <div className="tablet:flex desktop:block">
      <div className="tablet:w-[380px] tablet:shrink-0 tablet:border-r-2 tablet:border-rule desktop:w-auto desktop:border-r-0">
        <CatalogueListPane query={query} isAdmin={isAdmin} />
      </div>
      <div className="hidden tablet:flex tablet:flex-1 tablet:items-center tablet:justify-center desktop:hidden">
        <p className="type-body text-muted">Choose a song to read.</p>
      </div>
    </div>
  );
}
