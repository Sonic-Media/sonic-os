"use client";

import {
  StaffAnimatedMoney,
  StaffCollapsibleCard,
  StaffSectionLabel,
} from "@/components/operations/staff/primitives";
import { cn } from "@/lib/utils";

interface StaffCashSummaryCardProps {
  movieRevenue: number;
  accessorySales: number;
  totalExpenses: number;
  staffPayouts: number;
  netCash: number;
  savingsAllocation?: number;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  readOnly?: boolean;
  collapsible?: boolean;
}

function SummaryRow({
  label,
  value,
  valueClassName,
  animatedValue,
  large,
}: {
  label: string;
  value?: string;
  valueClassName?: string;
  animatedValue?: number;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm font-normal text-zinc-500">{label}</span>
      {animatedValue !== undefined ? (
        <StaffAnimatedMoney
          value={animatedValue}
          fromZero={false}
          className={cn(
            "font-bold tabular-nums text-white",
            large ? "text-2xl" : "text-sm",
            valueClassName
          )}
        />
      ) : (
        <span
          className={cn(
            "font-bold tabular-nums text-white",
            large ? "text-2xl" : "text-sm",
            valueClassName
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export function StaffCashSummaryCard({
  movieRevenue,
  accessorySales,
  totalExpenses,
  staffPayouts,
  netCash,
  savingsAllocation = 0,
  expanded,
  onExpandedChange,
  readOnly = false,
  collapsible = true,
}: StaffCashSummaryCardProps) {
  const totalRevenue = movieRevenue + accessorySales;
  const remainingCash = netCash - savingsAllocation;

  const collapsedPreview = (
    <StaffAnimatedMoney
      value={remainingCash}
      fromZero={false}
      className={cn(
        "text-lg font-bold",
        remainingCash < 0 ? "text-red-400" : "text-blue-200"
      )}
    />
  );

  const content = (
    <div className="space-y-3 rounded-2xl border border-white/[0.05] bg-black/20 p-5">
      <SummaryRow
        label="Movie Revenue"
        animatedValue={movieRevenue}
      />
      <SummaryRow
        label="Accessory Revenue"
        animatedValue={accessorySales}
      />
      <SummaryRow
        label="Total Revenue"
        animatedValue={totalRevenue}
        valueClassName="text-emerald-400"
      />
      <div className="my-2 h-px bg-white/[0.06]" />
      <SummaryRow
        label="Expenses"
        animatedValue={totalExpenses}
        valueClassName="text-amber-200/90"
      />
      <SummaryRow
        label="Daily Wage"
        animatedValue={staffPayouts}
        valueClassName="text-amber-200/90"
      />
      {savingsAllocation > 0 ? (
        <SummaryRow
          label="Savings Allocation"
          animatedValue={savingsAllocation}
        />
      ) : null}
      <div className="my-2 h-px bg-white/[0.06]" />
      <SummaryRow
        label="Cash To Hand In"
        animatedValue={remainingCash}
        valueClassName={remainingCash < 0 ? "text-red-400" : "text-blue-200"}
        large
      />
    </div>
  );

  if (readOnly) {
    return (
      <div className="rounded-3xl border border-white/[0.06] border-t-[3px] border-t-blue-500/40 bg-zinc-950/55 p-6 sm:p-7">
        <StaffSectionLabel>Cash Summary</StaffSectionLabel>
        <p className="mt-2 text-sm text-zinc-500">Final cash position for today.</p>
        <div className="mt-6">{content}</div>
      </div>
    );
  }

  return (
    <StaffCollapsibleCard
      accent="cash"
      title="Cash Summary"
      description="Live totals — updates automatically as you work."
      expanded={collapsible ? expanded : true}
      onExpandedChange={collapsible ? onExpandedChange : undefined}
      collapsible={collapsible}
      collapsedPreview={
        <div>
          <StaffSectionLabel>Cash To Hand In</StaffSectionLabel>
          <div className="mt-2">{collapsedPreview}</div>
        </div>
      }
    >
      {content}
    </StaffCollapsibleCard>
  );
}
