"use client";

import { Input } from "@/components/shared/ui/input";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { DASHBOARD_PERIODS } from "@/lib/constants";
import type { AnalyticsTimeFilter, CustomDateRange } from "@/lib/analytics-view";
import { cn } from "@/lib/utils";

const TIME_FILTER_OPTIONS: { id: AnalyticsTimeFilter; label: string }[] = [
  ...DASHBOARD_PERIODS,
  { id: "custom", label: "Custom" },
];

interface AnalyticsPeriodFilterProps {
  timeFilter: AnalyticsTimeFilter;
  customRange: CustomDateRange;
  onTimeFilterChange: (filter: AnalyticsTimeFilter) => void;
  onCustomRangeChange: (range: CustomDateRange) => void;
  className?: string;
}

export function AnalyticsPeriodFilter({
  timeFilter,
  customRange,
  onTimeFilterChange,
  onCustomRangeChange,
  className,
}: AnalyticsPeriodFilterProps) {
  return (
    <div className={cn("mb-6 space-y-4", className)}>
      <SegmentedControl
        options={TIME_FILTER_OPTIONS}
        value={timeFilter}
        onChange={onTimeFilterChange}
      />

      {timeFilter === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 animate-in fade-in duration-250">
          <Input
            label="Start date"
            type="date"
            value={customRange.start}
            onChange={(event) =>
              onCustomRangeChange({
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
              onCustomRangeChange({
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
