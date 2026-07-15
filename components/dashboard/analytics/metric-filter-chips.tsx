"use client";

import { FilterChip, FilterChipRow } from "@/components/dashboard/analytics/filter-chip";
import { useDashboardContext } from "@/context/dashboard-context";
import type { MetricFocus } from "@/lib/analytics-view";

const METRIC_CHIPS: { id: MetricFocus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sales", label: "Sales" },
  { id: "expenses", label: "Expenses" },
  { id: "savings", label: "Savings" },
  { id: "profit", label: "Profit" },
];

interface MetricFilterChipsProps {
  className?: string;
}

export function MetricFilterChips({ className }: MetricFilterChipsProps) {
  const { activeMetric, setActiveMetric } = useDashboardContext();

  return (
    <FilterChipRow className={className}>
      {METRIC_CHIPS.map((chip) => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          isActive={activeMetric === chip.id}
          onClick={() => setActiveMetric(chip.id)}
        />
      ))}
    </FilterChipRow>
  );
}
