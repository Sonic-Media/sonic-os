"use client";

import { Input } from "@/components/shared/ui/input";
import {
  SALES_CATALOG_FILTERS,
  type SalesCatalogFilter,
} from "@/lib/sales/product-groups";
import { cn } from "@/lib/utils";

interface SalesCatalogFiltersProps {
  filter: SalesCatalogFilter;
  onFilterChange: (filter: SalesCatalogFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

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

export function SalesCatalogFilters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: SalesCatalogFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SALES_CATALOG_FILTERS.map((item) => (
          <FilterChip
            key={item.id}
            active={filter === item.id}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>
      <Input
        placeholder="Search products"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
