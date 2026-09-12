"use client";

import { Input } from "@/components/shared/ui/input";
import type { ExpensesPageDateFilter } from "@/hooks/use-expenses-page";
import type { CashFlowDateRange } from "@/types/expenses-module";
import { cn } from "@/lib/utils";

interface ExpensesPageFiltersProps {
  dateFilter: ExpensesPageDateFilter;
  onDateFilterChange: (value: ExpensesPageDateFilter) => void;
  customRange: CashFlowDateRange;
  onCustomRangeChange: (patch: Partial<CashFlowDateRange>) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const DATE_FILTER_OPTIONS: { id: ExpensesPageDateFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

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
          ? "bg-gradient-to-r from-orange-500/20 to-amber-500/15 text-white ring-1 ring-orange-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function ExpensesPageFilters({
  dateFilter,
  onDateFilterChange,
  customRange,
  onCustomRangeChange,
  search,
  onSearchChange,
}: ExpensesPageFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {DATE_FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            active={dateFilter === option.id}
            onClick={() => onDateFilterChange(option.id)}
          >
            {option.label}
          </FilterChip>
        ))}

        <div className="min-w-[220px] flex-1 sm:max-w-sm sm:ml-auto">
          <Input
            type="search"
            placeholder="Search expenses..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      {dateFilter === "custom" ? (
        <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            value={customRange.start}
            onChange={(event) =>
              onCustomRangeChange({ start: event.target.value })
            }
          />
          <Input
            label="End Date"
            type="date"
            value={customRange.end}
            onChange={(event) =>
              onCustomRangeChange({ end: event.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
