export function FilterSidebarSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/8 bg-card-raised/40 p-5">
      {/* "Filters" heading */}
      <div className="mb-5 h-4 w-16 rounded bg-white/10" />
      {/* Location section: label + 4 chip pills wrapped */}
      <div className="mb-6">
        <div className="mb-2.5 h-3 w-20 rounded bg-white/8" />
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-16 rounded-full bg-white/6" />
          <div className="h-7 w-20 rounded-full bg-white/6" />
          <div className="h-7 w-14 rounded-full bg-white/6" />
          <div className="h-7 w-24 rounded-full bg-white/6" />
        </div>
      </div>
      {/* Salary section: label + slider track */}
      <div>
        <div className="mb-3 h-3 w-24 rounded bg-white/8" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-3 w-12 rounded bg-white/6" />
            <div className="h-3 w-12 rounded bg-white/6" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/6" />
        </div>
      </div>
    </div>
  );
}

export function SearchBarSkeleton() {
  return (
    <div className="mb-5 flex animate-pulse items-stretch gap-2">
      <div className="h-10 flex-1 rounded-md bg-white/6" />
      {/* mobile filter trigger button placeholder */}
      <div className="h-10 w-24 shrink-0 rounded-md bg-white/6 lg:hidden" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/8 bg-card p-5 sm:p-6">
      {/* Title + location (left) / status badge (right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-1/3 rounded bg-white/6" />
        </div>
        <div className="h-5 w-14 shrink-0 rounded-full bg-white/6" />
      </div>
      {/* short_description — line-clamp-3 on mobile, can expand on sm+ */}
      <div className="mt-3 space-y-2">
        <div className="h-3 rounded bg-white/6" />
        <div className="h-3 w-11/12 rounded bg-white/6" />
        <div className="h-3 w-3/4 rounded bg-white/6" />
      </div>
      {/* Tag chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <div className="h-5 w-16 rounded-full bg-white/6" />
        <div className="h-5 w-20 rounded-full bg-white/6" />
        <div className="h-5 w-14 rounded-full bg-white/6" />
      </div>
      {/* Salary line */}
      <div className="mt-4 h-3 w-2/5 rounded bg-white/6" />
      {/* Posted date */}
      <div className="mt-2 h-3 w-1/4 rounded bg-white/5" />
    </div>
  );
}
