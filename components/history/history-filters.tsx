"use client";

import { Input } from "@/components/shared/ui/input";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { BRANCHES, HISTORY_SORT_OPTIONS } from "@/lib/constants";
import type { HistoryBranchFilter, HistorySortOrder } from "@/types";

interface HistoryFiltersProps {
  date: string;
  branch: HistoryBranchFilter;
  sortOrder: HistorySortOrder;
  onDateChange: (date: string) => void;
  onBranchChange: (branch: HistoryBranchFilter) => void;
  onSortOrderChange: (order: HistorySortOrder) => void;
}

const branchOptions = [
  { id: "all" as const, label: "All" },
  ...BRANCHES.map((b) => ({ id: b.id, label: b.name })),
];

export function HistoryFilters({
  date,
  branch,
  sortOrder,
  onDateChange,
  onBranchChange,
  onSortOrderChange,
}: HistoryFiltersProps) {
  return (
    <section className="space-y-4 mb-8">
      <Input
        label="Search by date"
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Branch</p>
        <SegmentedControl
          options={branchOptions}
          value={branch}
          onChange={onBranchChange}
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Sort</p>
        <SegmentedControl
          options={HISTORY_SORT_OPTIONS}
          value={sortOrder}
          onChange={onSortOrderChange}
        />
      </div>
    </section>
  );
}
