"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import type { StockPageBranchFilter } from "@/hooks/use-stock-page";
import {
  STOCK_CATEGORY_FILTER_OPTIONS,
  STOCK_STATUS_FILTER_OPTIONS,
} from "@/lib/stock/constants";
import type { BranchEntity } from "@/types/branch";
import type { StockCategoryFilter, StockStatusFilter } from "@/types/stock";
import { cn } from "@/lib/utils";

interface StockPageFiltersProps {
  canSwitchBranch: boolean;
  activeBranches: BranchEntity[];
  getBranchName: (code: import("@/types").Branch) => string;
  branchFilter: StockPageBranchFilter;
  onBranchFilterChange: (value: StockPageBranchFilter) => void;
  categoryFilter: StockCategoryFilter;
  onCategoryFilterChange: (value: StockCategoryFilter) => void;
  statusFilter: StockStatusFilter;
  onStatusFilterChange: (value: StockStatusFilter) => void;
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
          ? "bg-gradient-to-r from-violet-500/20 to-purple-500/15 text-white ring-1 ring-violet-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function StockPageFilters({
  canSwitchBranch,
  activeBranches,
  getBranchName,
  branchFilter,
  onBranchFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
}: StockPageFiltersProps) {
  const categoryOptions = STOCK_CATEGORY_FILTER_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  const statusOptions = STOCK_STATUS_FILTER_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canSwitchBranch ? (
          <>
            <FilterChip
              active={branchFilter === "all"}
              onClick={() => onBranchFilterChange("all")}
            >
              All Branches
            </FilterChip>
            {activeBranches.map((branch) => (
              <FilterChip
                key={branch.code}
                active={branchFilter === branch.code}
                onClick={() => onBranchFilterChange(branch.code)}
              >
                {getBranchName(branch.code)}
              </FilterChip>
            ))}
          </>
        ) : null}

        <div className="h-6 w-px bg-white/[0.08] max-sm:hidden" />

        <Select
          value={categoryFilter}
          options={categoryOptions}
          onChange={(event) =>
            onCategoryFilterChange(
              event.target.value as StockCategoryFilter
            )
          }
          className="min-w-[160px]"
        />

        <Select
          value={statusFilter}
          options={statusOptions}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as StockStatusFilter)
          }
          className="min-w-[140px]"
        />

        <div className="min-w-[220px] flex-1 sm:max-w-sm sm:ml-auto">
          <Input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
