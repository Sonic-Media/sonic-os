"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { PURCHASE_DATE_FILTER_OPTIONS } from "@/lib/purchasing/constants";
import { cn } from "@/lib/utils";
import type { PurchaseFilterCriteria } from "@/types/purchasing";

interface PurchaseHistoryFiltersProps {
  criteria: PurchaseFilterCriteria;
  onCriteriaChange: (patch: Partial<PurchaseFilterCriteria>) => void;
  supplierOptions: { value: string; label: string }[];
  className?: string;
}

export function PurchaseHistoryFilters({
  criteria,
  onCriteriaChange,
  supplierOptions,
  className,
}: PurchaseHistoryFiltersProps) {
  const dateOptions = PURCHASE_DATE_FILTER_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
  }));

  const allSupplierOptions = [
    { value: "all", label: "All Suppliers" },
    ...supplierOptions,
  ];

  return (
    <section className={cn("space-y-4 mb-8", className)}>
      <Input
        label="Search"
        type="search"
        placeholder="Search purchases..."
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
              date: value as PurchaseFilterCriteria["date"],
            })
          }
        />
      </div>

      <Select
        label="Supplier"
        value={criteria.supplier}
        options={allSupplierOptions}
        onChange={(event) =>
          onCriteriaChange({ supplier: event.target.value })
        }
      />
    </section>
  );
}
