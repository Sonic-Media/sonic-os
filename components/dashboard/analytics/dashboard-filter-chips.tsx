"use client";

import { FilterChip, FilterChipRow } from "@/components/dashboard/analytics/filter-chip";
import { Input } from "@/components/shared/ui/input";
import { useDashboardContext } from "@/context/dashboard-context";
import { BRANCH_IDS } from "@/lib/constants";
import type { AnalyticsTimeFilter } from "@/lib/analytics-view";
import { cn } from "@/lib/utils";

const PERIOD_CHIPS: { id: AnalyticsTimeFilter; label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "custom", label: "Custom" },
];

interface DashboardFilterChipsProps {
  className?: string;
}

export function DashboardFilterChips({ className }: DashboardFilterChipsProps) {
  const {
    timeFilter,
    setTimeFilter,
    customRange,
    setCustomRange,
    branchFilter,
    setBranchFilter,
    staffFilter,
    setStaffFilter,
    branchNames,
    staff,
    hasActiveFilters,
    clearFilters,
  } = useDashboardContext();

  const activeStaff = staff.filter((member) => member.active);

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      <FilterChipRow>
        {PERIOD_CHIPS.map((chip) => (
          <FilterChip
            key={chip.id}
            label={chip.label}
            isActive={timeFilter === chip.id}
            onClick={() => setTimeFilter(chip.id)}
          />
        ))}
      </FilterChipRow>

      {timeFilter === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 animate-in fade-in duration-200">
          <Input
            label="Start date"
            type="date"
            value={customRange.start}
            onChange={(event) =>
              setCustomRange({
                ...customRange,
                start: event.target.value,
              })
            }
          />
          <Input
            label="End date"
            type="date"
            value={customRange.end}
            onChange={(event) =>
              setCustomRange({
                ...customRange,
                end: event.target.value,
              })
            }
          />
        </div>
      )}

      <FilterChipRow>
        <FilterChip
          label="Branch"
          isActive={branchFilter === null}
          onClick={() => setBranchFilter(null)}
        />
        {BRANCH_IDS.map((branchId) => (
          <FilterChip
            key={branchId}
            label={branchNames[branchId]}
            isActive={branchFilter === branchId}
            onClick={() =>
              setBranchFilter(branchFilter === branchId ? null : branchId)
            }
          />
        ))}
      </FilterChipRow>

      <FilterChipRow>
        <FilterChip
          label="Staff"
          isActive={staffFilter === null}
          onClick={() => setStaffFilter(null)}
        />
        {activeStaff.map((member) => (
          <FilterChip
            key={member.id}
            label={member.name}
            isActive={staffFilter === member.id}
            onClick={() =>
              setStaffFilter(staffFilter === member.id ? null : member.id)
            }
          />
        ))}
      </FilterChipRow>

      {hasActiveFilters && (
        <FilterChipRow>
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-full border border-zinc-800 px-4 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:border-zinc-600 hover:text-zinc-300"
          >
            Clear filters
          </button>
        </FilterChipRow>
      )}
    </div>
  );
}
