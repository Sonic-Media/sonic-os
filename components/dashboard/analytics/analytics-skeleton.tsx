export function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="h-10 rounded-xl bg-zinc-900" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="h-28 rounded-2xl bg-zinc-900" />
        <div className="h-28 rounded-2xl bg-zinc-900" />
        <div className="h-28 rounded-2xl bg-zinc-900" />
        <div className="col-span-2 h-28 rounded-2xl bg-zinc-900 sm:col-span-1" />
      </div>
      <div className="h-8 w-48 rounded-lg bg-zinc-900" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-64 rounded-2xl bg-zinc-900" />
        <div className="h-64 rounded-2xl bg-zinc-900" />
        <div className="h-64 rounded-2xl bg-zinc-900" />
        <div className="h-64 rounded-2xl bg-zinc-900" />
      </div>
    </div>
  );
}
