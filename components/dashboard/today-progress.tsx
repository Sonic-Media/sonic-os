"use client";

import Link from "next/link";
import { getBranchEntryHref } from "@/lib/entry-helpers";
import type { BranchProgress } from "@/types";
import { cn } from "@/lib/utils";

interface TodayProgressProps {
  progress: BranchProgress[];
  className?: string;
}

function statusLabel(item: BranchProgress): string {
  switch (item.status) {
    case "completed":
      return "✓ Completed";
    case "draft":
      return "◐ Draft";
    default:
      return "○ Pending";
  }
}

export function TodayProgress({ progress, className }: TodayProgressProps) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Today&apos;s Entries
      </h2>
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 divide-y divide-zinc-800/80">
        {progress.map((item) => (
          <Link
            key={item.branch}
            href={getBranchEntryHref(item)}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-900/80"
          >
            <span className="text-sm font-medium text-white">{item.name}</span>
            <span
              className={cn(
                "text-xs font-medium",
                item.status === "completed" && "text-emerald-400",
                item.status === "draft" && "text-amber-400",
                item.status === "pending" && "text-zinc-500"
              )}
            >
              {statusLabel(item)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
