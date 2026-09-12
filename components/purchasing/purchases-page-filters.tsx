"use client";

import type { PurchasesPageStatusFilter } from "@/hooks/use-purchases-page";
import { cn } from "@/lib/utils";

interface PurchasesPageFiltersProps {
  statusFilter: PurchasesPageStatusFilter;
  onStatusFilterChange: (value: PurchasesPageStatusFilter) => void;
}

const STATUS_FILTER_OPTIONS: {
  id: PurchasesPageStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "All Purchases" },
  { id: "pending", label: "Pending" },
  { id: "received", label: "Received" },
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
          ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white ring-1 ring-blue-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function PurchasesPageFilters({
  statusFilter,
  onStatusFilterChange,
}: PurchasesPageFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_FILTER_OPTIONS.map((option) => (
        <FilterChip
          key={option.id}
          active={statusFilter === option.id}
          onClick={() => onStatusFilterChange(option.id)}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}
