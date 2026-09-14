"use client";

import type { CalendarBranchFilter } from "@/lib/calendar/activity-index";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";
import { cn } from "@/lib/utils";

interface CalendarBranchFiltersProps {
  canSwitchBranch: boolean;
  activeBranches: BranchEntity[];
  getBranchName: (code: Branch) => string;
  branchFilter: CalendarBranchFilter;
  onBranchFilterChange: (value: CalendarBranchFilter) => void;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-xl px-3.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function CalendarBranchFilters({
  canSwitchBranch,
  activeBranches,
  getBranchName,
  branchFilter,
  onBranchFilterChange,
}: CalendarBranchFiltersProps) {
  if (!canSwitchBranch) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip
        active={branchFilter === "all"}
        onClick={() => onBranchFilterChange("all")}
      >
        All Branches
      </FilterChip>
      {activeBranches.map((branch) => (
        <FilterChip
          key={branch.code}
          active={branchFilter === branch.code}
          onClick={() => onBranchFilterChange(branch.code)}
        >
          {getBranchName(branch.code)}
        </FilterChip>
      ))}
    </div>
  );
}
