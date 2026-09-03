"use client";

import { cn } from "@/lib/utils";
import { useBranch } from "@/context/branch-context";

interface ActiveBranchLabelProps {
  /** Optional prefix, e.g. "Branch" or "Operating in" */
  label?: string;
  className?: string;
  /** Larger display for metric cards */
  variant?: "inline" | "badge" | "metric";
}

export function ActiveBranchLabel({
  label = "Branch",
  className,
  variant = "inline",
}: ActiveBranchLabelProps) {
  const { activeBranch, getBranchName, loading } = useBranch();

  if (loading) {
    return null;
  }

  const name = getBranchName(activeBranch);

  if (variant === "metric") {
    return (
      <p className={cn("text-xs font-medium uppercase tracking-wide text-zinc-500", className)}>
        {name}
      </p>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-medium text-zinc-300",
          className
        )}
      >
        {label}: {name}
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-zinc-500", className)}>
      {label}: <span className="font-medium text-zinc-300">{name}</span>
    </span>
  );
}
