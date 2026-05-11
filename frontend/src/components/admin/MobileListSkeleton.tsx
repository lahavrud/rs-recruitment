/**
 * Loading skeleton that matches the `MobileEntityCard` layout: a left chevron
 * circle, a stacked title/subtitle area, and a small status badge on the
 * right. Use alongside `TableSkeleton` so each viewport gets a shape that
 * matches the real content.
 *
 *   <div className="space-y-2 md:hidden">
 *     <MobileListSkeleton rows={4} />
 *   </div>
 *   <div className="hidden md:block">
 *     <TableSkeleton rows={6} columns={4} />
 *   </div>
 */
export default function MobileListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-white/8 bg-card px-3 py-3.5"
        >
          <span className="inline-flex size-7 shrink-0 rounded-full border border-white/10 bg-white/5" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-3/5 rounded bg-white/8" />
            <div className="h-2.5 w-2/5 rounded bg-white/5" />
          </div>
          <span className="size-5 w-14 shrink-0 rounded-full bg-white/6" />
        </div>
      ))}
    </div>
  );
}
