import { Skeleton } from "@/components/ui/skeleton";

// Shown while the catalogue streams in on a cold page load. Mirrors the real
// list's geometry (header, search, rows) so nothing jumps when it arrives.
export function CatalogueListSkeleton({ rows = 9 }: { rows?: number }) {
  return (
    <div className="flex min-h-dvh flex-col tablet:min-h-0 tablet:flex-1" role="status" aria-label="Loading songs">
      <div className="flex h-14 items-center justify-between px-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="px-4 pb-3">
        <Skeleton className="h-[52px] w-full" />
      </div>
      <div className="border-b border-rule px-4 pb-2">
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="px-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-[52px_1fr] items-center gap-2 border-b border-rule py-4 pr-3">
            <Skeleton className="h-3.5 w-8" />
            <div className="space-y-2">
              <Skeleton className="h-5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
