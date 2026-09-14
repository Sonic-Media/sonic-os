"use client";

import { Input } from "@/components/shared/ui/input";
import type {
  StaffBranchFilter,
  StaffShiftFilter,
  StaffStatusFilter,
} from "@/hooks/use-staff-management-page";
import { cn } from "@/lib/utils";

interface StaffManagementFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  shiftFilter: StaffShiftFilter;
  onShiftFilterChange: (value: StaffShiftFilter) => void;
  branchFilter: StaffBranchFilter;
  onBranchFilterChange: (value: StaffBranchFilter) => void;
  statusFilter: StaffStatusFilter;
  onStatusFilterChange: (value: StaffStatusFilter) => void;
  canSwitchBranch: boolean;
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
          ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function StaffManagementFilters({
  search,
  onSearchChange,
  shiftFilter,
  onShiftFilterChange,
  branchFilter,
  onBranchFilterChange,
  statusFilter,
  onStatusFilterChange,
  canSwitchBranch,
}: StaffManagementFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={shiftFilter === "all"}
          onClick={() => onShiftFilterChange("all")}
        >
          All Staff
        </FilterChip>
        <FilterChip
          active={shiftFilter === "on-shift"}
          onClick={() => onShiftFilterChange("on-shift")}
        >
          On Shift
        </FilterChip>
        <FilterChip
          active={shiftFilter === "off-shift"}
          onClick={() => onShiftFilterChange("off-shift")}
        >
          Off Shift
        </FilterChip>

        {canSwitchBranch ? (
          <>
            <FilterChip
              active={branchFilter === "all"}
              onClick={() => onBranchFilterChange("all")}
            >
              All Branches
            </FilterChip>
            <FilterChip
              active={branchFilter === "main"}
              onClick={() => onBranchFilterChange("main")}
            >
              Kansanga
            </FilterChip>
            <FilterChip
              active={branchFilter === "salaama"}
              onClick={() => onBranchFilterChange("salaama")}
            >
              Salaama
            </FilterChip>
          </>
        ) : null}

        <FilterChip
          active={statusFilter === "active"}
          onClick={() => onStatusFilterChange("active")}
        >
          Active
        </FilterChip>
        <FilterChip
          active={statusFilter === "inactive"}
          onClick={() => onStatusFilterChange("inactive")}
        >
          Inactive
        </FilterChip>
      </div>

      <Input
        placeholder="Search by name, role, branch, or phone"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
