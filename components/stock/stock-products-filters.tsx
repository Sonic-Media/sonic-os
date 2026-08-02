"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { SegmentedControl } from "@/components/shared/segmented-control";
import {
  STOCK_CATEGORY_FILTER_OPTIONS,
  STOCK_PRODUCT_SORT_OPTIONS,
  STOCK_STATUS_FILTER_OPTIONS,
} from "@/lib/stock/constants";
import { cn } from "@/lib/utils";
import type {
  StockProductFilterCriteria,
  StockProductSortField,
  StockProductSortOrder,
} from "@/types/stock";

interface StockProductsFiltersProps {
  criteria: StockProductFilterCriteria;
  onCriteriaChange: (patch: Partial<StockProductFilterCriteria>) => void;
  className?: string;
}

const SORT_ORDER_OPTIONS: { id: StockProductSortOrder; label: string }[] = [
  { id: "asc", label: "Asc" },
  { id: "desc", label: "Desc" },
];

export function StockProductsFilters({
  criteria,
  onCriteriaChange,
  className,
}: StockProductsFiltersProps) {
  const statusOptions = STOCK_STATUS_FILTER_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const sortFieldOptions = STOCK_PRODUCT_SORT_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  return (
    <section className={cn("space-y-4 mb-8", className)}>
      <Input
        label="Search"
        type="search"
        placeholder="Search products..."
        value={criteria.search}
        onChange={(event) =>
          onCriteriaChange({ search: event.target.value })
        }
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">
          Category
        </p>
        <SegmentedControl
          options={STOCK_CATEGORY_FILTER_OPTIONS}
          value={criteria.category}
          onChange={(category) => onCriteriaChange({ category })}
        />
      </div>

      <Select
        label="Status"
        value={criteria.status}
        placeholder="All"
        options={statusOptions}
        onChange={(event) =>
          onCriteriaChange({
            status: event.target.value as StockProductFilterCriteria["status"],
          })
        }
      />

      <Select
        label="Sort By"
        value={criteria.sortField}
        options={sortFieldOptions}
        onChange={(event) =>
          onCriteriaChange({
            sortField: event.target.value as StockProductSortField,
          })
        }
      />

      <div>
        <p className="block text-sm font-medium text-zinc-400 mb-2">
          Sort Order
        </p>
        <SegmentedControl
          options={SORT_ORDER_OPTIONS}
          value={criteria.sortOrder}
          onChange={(sortOrder) => onCriteriaChange({ sortOrder })}
        />
      </div>
    </section>
  );
}
