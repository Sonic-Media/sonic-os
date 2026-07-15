"use client";

import type { EntryStatus } from "@/types";
import { cn } from "@/lib/utils";

interface EntryStatusBadgeProps {
  status: EntryStatus;
  className?: string;
}

export function EntryStatusBadge({ status, className }: EntryStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        status === "completed"
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400",
        className
      )}
    >
      {status === "completed" ? "Completed" : "Draft"}
    </span>
  );
}
