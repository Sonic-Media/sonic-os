"use client";

export function ShiftCompletedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-10 text-center">
          <p className="text-xl font-medium text-white">
            Today&apos;s shift has already been completed.
          </p>
          <p className="mt-4 text-sm text-zinc-400">See you tomorrow 👋</p>
        </div>
      </div>
    </div>
  );
}
