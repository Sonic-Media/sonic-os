"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { SegmentedControl } from "@/components/shared/segmented-control";
import {
  SALE_DATE_FILTER_OPTIONS,
  SALE_PAYMENT_FILTER_OPTIONS,
} from "@/lib/sales/constants";
import { cn } from "@/lib/utils";
import type { SaleFilterCriteria } from "@/types/sales";

interface SalesHistoryFiltersProps {
  criteria: SaleFilterCriteria;
  onCriteriaChange: (patch: Partial<SaleFilterCriteria>) => void;
  customerOptions: { value: string; label: string }[];
  className?: string;
}

export function SalesHistoryFilters({
  criteria,
  onCriteriaChange,
  customerOptions,
  className,
}: SalesHistoryFiltersProps) {
  const dateOptions = SALE_DATE_FILTER_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
  }));

  const paymentOptions = SALE_PAYMENT_FILTER_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const allCustomerOptions = [
    { value: "all", label: "All Customers" },
    ...customerOptions,
  ];

  return (
    <section className={cn("space-y-4 mb-8", className)}>
      <Input
        label="Search"
        type="search"
        placeholder="Search sales..."
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
              date: value as SaleFilterCriteria["date"],
            })
          }
        />
      </div>

      <Select
        label="Customer"
        value={criteria.customer}
        options={allCustomerOptions}
        onChange={(event) =>
          onCriteriaChange({ customer: event.target.value })
        }
      />

      <Select
        label="Payment Method"
        value={criteria.paymentMethod}
        options={paymentOptions}
        onChange={(event) =>
          onCriteriaChange({
            paymentMethod: event.target.value as SaleFilterCriteria["paymentMethod"],
          })
        }
      />
    </section>
  );
}
