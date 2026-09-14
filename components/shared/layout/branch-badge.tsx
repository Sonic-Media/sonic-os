"use client";

import { useBranch } from "@/context/branch-context";
import { cn } from "@/lib/utils";

interface BranchBadgeProps {
  className?: string;
}

export function BranchBadge({ className }: BranchBadgeProps) {
  const { activeBranch, getBranchName, loading } = useBranch();

  if (loading) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300",
        className
      )}
    >
      Branch: {getBranchName(activeBranch)}
    </span>
  );
}
