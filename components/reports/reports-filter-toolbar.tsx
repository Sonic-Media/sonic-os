"use client";

import { ReportsBranchFilter } from "@/components/reports/reports-branch-filter";
import { ReportsDatePicker } from "@/components/reports/reports-date-picker";
import { ReportsPeriodTabs } from "@/components/reports/reports-period-tabs";
import type { ReportsPresentationType } from "@/lib/reports/presentation-kpis";
import type { ReportsBranchScope } from "@/hooks/use-reports";
import type { ReportPeriod } from "@/types";
import { cn } from "@/lib/utils";

interface ReportsFilterToolbarProps {
  reportType: ReportsPresentationType;
  onReportTypeChange: (value: ReportsPresentationType) => void;
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  referenceDate: string;
  onReferenceDateChange: (value: string) => void;
  branchScope: ReportsBranchScope;
  onBranchScopeChange: (value: ReportsBranchScope) => void;
  canSelectBranch: boolean;
}

const REPORT_TYPE_OPTIONS: {
  id: ReportsPresentationType;
  label: string;
}[] = [
  { id: "sales", label: "Sales" },
  { id: "expenses", label: "Expenses" },
  { id: "purchases", label: "Purchases" },
  { id: "stock", label: "Stock" },
  { id: "staff", label: "Staff" },
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
          ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white ring-1 ring-indigo-500/30"
          : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

export function ReportsFilterToolbar({
  reportType,
  onReportTypeChange,
  period,
  onPeriodChange,
  referenceDate,
  onReferenceDateChange,
  branchScope,
  onBranchScopeChange,
  canSelectBranch,
}: ReportsFilterToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Report Type
        </p>
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.id}
              active={reportType === option.id}
              onClick={() => onReportTypeChange(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,320px)] xl:items-end">
        <ReportsPeriodTabs period={period} onPeriodChange={onPeriodChange} />

        {period === "daily" ? (
          <ReportsDatePicker
            value={referenceDate}
            onChange={onReferenceDateChange}
          />
        ) : (
          <div className="hidden xl:block" />
        )}

        {canSelectBranch ? (
          <ReportsBranchFilter
            value={branchScope}
            onChange={onBranchScopeChange}
          />
        ) : null}
      </div>
    </div>
  );
}
