"use client";

import { Card } from "@/components/shared/ui/card";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { BranchProgress, ReportSummary } from "@/types";
import { cn } from "@/lib/utils";

interface TodayAtAGlanceProps {
  summary: ReportSummary;
  progress: BranchProgress[];
  lastUpdatedAt?: string | null;
  className?: string;
}

function GlanceRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className={cn("text-sm font-semibold text-white", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function TodayAtAGlance({
  summary,
  progress,
  lastUpdatedAt,
  className,
}: TodayAtAGlanceProps) {
  const completedCount = progress.filter((item) => item.completed).length;
  const totalBranches = progress.length;

  return (
    <Card
      className={cn(
        "transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:shadow-lg",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Today at a Glance
      </h2>

      <div className="space-y-3">
        <GlanceRow label="Revenue" value={formatCurrency(summary.totalSales)} />
        <GlanceRow
          label="Expenses"
          value={formatCurrency(summary.totalExpenses)}
        />
        <GlanceRow
          label="Net Savings"
          value={formatCurrency(summary.totalSavings)}
          valueClassName={
            summary.totalSavings < 0 ? "text-red-400" : undefined
          }
        />
        <GlanceRow
          label="Completed"
          value={`${completedCount} / ${totalBranches} Branches`}
          valueClassName={
            completedCount === totalBranches ? "text-emerald-400" : undefined
          }
        />
        <GlanceRow
          label="Updated"
          value={
            lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : "No entries yet"
          }
        />
      </div>
    </Card>
  );
}
