"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import {
  HISTORY_SORT_OPTIONS,
  HISTORY_STATUS_OPTIONS,
} from "@/lib/constants";
import { getStaffOptions } from "@/lib/staff-reports";
import type { HistoryFilterCriteria, HistorySortOrder } from "@/types";

interface HistoryFiltersProps {
  criteria: HistoryFilterCriteria;
  sortOrder: HistorySortOrder;
  onCriteriaChange: (patch: Partial<HistoryFilterCriteria>) => void;
  onSortOrderChange: (order: HistorySortOrder) => void;
}

const sortOptions = HISTORY_SORT_OPTIONS;

export function HistoryFilters({
  criteria,
  sortOrder,
  onCriteriaChange,
  onSortOrderChange,
}: HistoryFiltersProps) {
  const { branches } = useSettings();
  const { staff: staffMembers } = useStaff();
  const branchOptions = [
    { id: "all" as const, label: "All" },
    ...branches.map((b) => ({ id: b.id, label: b.name })),
  ];
  const staffOptions = [
    { value: "all", label: "All Staff" },
    ...getStaffOptions(staffMembers),
  ];

  return (
    <section className="space-y-4 mb-8">
      <Input
        label="Search by date"
        type="date"
        value={criteria.date ?? ""}
        onChange={(e) =>
          onCriteriaChange({ date: e.target.value || undefined })
        }
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Branch</p>
        <SegmentedControl
          options={branchOptions}
          value={criteria.branch}
          onChange={(branch) => onCriteriaChange({ branch })}
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Status</p>
        <SegmentedControl
          options={HISTORY_STATUS_OPTIONS}
          value={criteria.status}
          onChange={(status) => onCriteriaChange({ status })}
        />
      </div>

      <Select
        label="Staff"
        value={criteria.staff}
        placeholder="All Staff"
        options={staffOptions}
        onChange={(e) => onCriteriaChange({ staff: e.target.value })}
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Sort</p>
        <SegmentedControl
          options={sortOptions}
          value={sortOrder}
          onChange={onSortOrderChange}
        />
      </div>
    </section>
  );
}
