import { Skeleton } from "@/components/ui/skeleton";

// Instant fallback for a song while its lyrics, recordings and metadata load.
// Next shows this the moment a row is tapped (the layout and list stay put),
// so the screen responds immediately instead of looking frozen.
export default function SongLoading() {
  return (
    <div className="tablet:min-w-0 tablet:flex-1" role="status" aria-label="Loading song">
      <div className="flex h-[60px] items-center gap-2 px-4">
        <Skeleton className="h-8 w-8" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="desktop:flex">
        <div className="min-w-0 flex-1 desktop:max-w-[600px] desktop:px-14">
          <div className="space-y-3 border-b border-rule px-5 pb-4 desktop:px-0">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-9 w-3/4" />
          </div>

          <div className="space-y-8 px-5 py-6 desktop:px-0">
            {[5, 4, 5].map((lines, block) => (
              <div key={block} className="space-y-3">
                <Skeleton className="h-3 w-20" />
                {Array.from({ length: lines }, (_, i) => (
                  <Skeleton key={i} className="h-5" style={{ width: `${62 + ((i * 23 + block * 11) % 34)}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
