import { Skeleton } from "@/components/ui/skeleton";

// Shared fallback for every admin screen (members, fields, slides, import,
// add/edit song): a title bar and a stack of rows, shown the instant a nav
// item is tapped while the page's data loads.
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex h-[60px] items-center gap-3 border-b border-rule px-4">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="space-y-4 px-5 py-6 desktop:mx-auto desktop:max-w-[720px]">
        <Skeleton className="h-14 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2 border-b border-rule pb-4">
            <Skeleton className="h-5" style={{ width: `${50 + ((i * 19) % 40)}%` }} />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
