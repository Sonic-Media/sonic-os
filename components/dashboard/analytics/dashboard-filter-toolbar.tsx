"use client";

import { Input } from "@/components/shared/ui/input";
import { ActiveBranchLabel } from "@/components/shared/layout/active-branch-label";
import { useDashboardContext } from "@/context/dashboard-context";
import type { AnalyticsTimeFilter } from "@/lib/analytics-view";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: AnalyticsTimeFilter; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "custom", label: "Custom" },
];

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-zinc-900/80",
          "pl-3 pr-8 text-sm font-medium text-zinc-300",
          "transition-[border-color,background-color,color] duration-200",
          "hover:border-zinc-700 hover:bg-zinc-900 hover:text-white",
          "focus:outline-none focus:ring-2 focus:ring-white/20"
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 text-[10px] text-zinc-500"
      >
        ▼
      </span>
    </label>
  );
}

interface DashboardFilterToolbarProps {
  className?: string;
}

export function DashboardFilterToolbar({ className }: DashboardFilterToolbarProps) {
  const {
    timeFilter,
    setTimeFilter,
    customRange,
    setCustomRange,
    staffFilter,
    setStaffFilter,
    comparePrevious,
    setComparePrevious,
    resetFilters,
    staff,
  } = useDashboardContext();

  const activeStaff = staff.filter((member) => member.active);

  const staffOptions = [
    { value: "all", label: "All Staff" },
    ...activeStaff.map((member) => ({
      value: member.id,
      label: member.name,
    })),
  ];

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Time period"
          value={timeFilter}
          onChange={(value) => setTimeFilter(value as AnalyticsTimeFilter)}
          options={PERIOD_OPTIONS}
        />

        <ActiveBranchLabel variant="badge" />

        <FilterSelect
          label="Staff"
          value={staffFilter ?? "all"}
          onChange={(value) =>
            setStaffFilter(value === "all" ? null : value)
          }
          options={staffOptions}
        />

        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 text-sm text-zinc-400 transition-[border-color,background-color,color] duration-200 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300">
          <input
            type="checkbox"
            checked={comparePrevious}
            onChange={(event) => setComparePrevious(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-white"
          />
          <span>Compare Previous</span>
        </label>

        <button
          type="button"
          onClick={resetFilters}
          className="h-9 rounded-lg border border-zinc-800 px-3 text-sm font-medium text-zinc-500 transition-[border-color,color,background-color] duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 hover:text-zinc-300"
        >
          Reset Filters
        </button>
      </div>

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
    </div>
  );
}
