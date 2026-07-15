"use client";

import { useDashboardContext } from "@/context/dashboard-context";
import { cn } from "@/lib/utils";

interface ComparePreviousToggleProps {
  className?: string;
}

export function ComparePreviousToggle({ className }: ComparePreviousToggleProps) {
  const { comparePrevious, setComparePrevious } = useDashboardContext();

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-xs text-zinc-500 transition-colors duration-200 hover:text-zinc-400",
        className
      )}
    >
      <input
        type="checkbox"
        checked={comparePrevious}
        onChange={(event) => setComparePrevious(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-white"
      />
      Compare previous period
    </label>
  );
}
