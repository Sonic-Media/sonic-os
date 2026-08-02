"use client";

import { useActiveBranch } from "@/context/active-branch-context";
import { useBranches } from "@/context/branches-context";
import { cn } from "@/lib/utils";

interface BranchBadgeProps {
  className?: string;
}

export function BranchBadge({ className }: BranchBadgeProps) {
  const { activeBranch, isLoaded } = useActiveBranch();
  const { getBranchName } = useBranches();

  if (!isLoaded) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300",
        className
      )}
    >
      Branch: {getBranchName(activeBranch)}
    </span>
  );
}
