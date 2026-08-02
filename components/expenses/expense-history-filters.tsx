"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { SegmentedControl } from "@/components/shared/segmented-control";
import {
  EXPENSE_DATE_FILTER_OPTIONS,
  EXPENSE_PAYMENT_FILTER_OPTIONS,
} from "@/lib/expenses-module/constants";
import { useSettings } from "@/context/settings-context";
import { cn } from "@/lib/utils";
import type { ExpenseFilterCriteria } from "@/types/expenses-module";

interface ExpenseHistoryFiltersProps {
  criteria: ExpenseFilterCriteria;
  onCriteriaChange: (patch: Partial<ExpenseFilterCriteria>) => void;
  categoryOptions: { value: string; label: string }[];
  className?: string;
}

export function ExpenseHistoryFilters({
  criteria,
  onCriteriaChange,
  categoryOptions,
  className,
}: ExpenseHistoryFiltersProps) {
  const { branches } = useSettings();

  const dateOptions = EXPENSE_DATE_FILTER_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
  }));

  const paymentOptions = EXPENSE_PAYMENT_FILTER_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const branchOptions = [
    { value: "all", label: "All Branches" },
    ...branches.map((branch) => ({
      value: branch.id,
      label: branch.name,
    })),
  ];

  const allCategoryOptions = [
    { value: "all", label: "All Categories" },
    ...categoryOptions,
  ];

  return (
    <section className={cn("space-y-4 mb-8", className)}>
      <Input
        label="Search"
        type="search"
        placeholder="Search description..."
        value={criteria.search}
        onChange={(event) =>
          onCriteriaChange({ search: event.target.value })
        }
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">Date</p>
        <SegmentedControl
          options={dateOptions}
          value={criteria.date}
          onChange={(value) =>
            onCriteriaChange({
              date: value as ExpenseFilterCriteria["date"],
            })
          }
        />
      </div>

      <Select
        label="Category"
        value={criteria.category}
        options={allCategoryOptions}
        onChange={(event) =>
          onCriteriaChange({ category: event.target.value })
        }
      />

      <Select
        label="Branch"
        value={criteria.branch}
        options={branchOptions}
        onChange={(event) =>
          onCriteriaChange({
            branch: event.target.value as ExpenseFilterCriteria["branch"],
          })
        }
      />

      <Select
        label="Payment Method"
        value={criteria.paymentMethod}
        options={paymentOptions}
        onChange={(event) =>
          onCriteriaChange({
            paymentMethod:
              event.target.value as ExpenseFilterCriteria["paymentMethod"],
          })
        }
      />
    </section>
  );
}
