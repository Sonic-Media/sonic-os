"use client";

import { useMemo, useState } from "react";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { StaffOperationCard } from "@/components/operations/staff/staff-operation-card";
import {
  StaffAnimatedMoney,
  StaffCollapsedSummary,
  StaffMetricTile,
  StaffSectionLabel,
  StaffSuccessFlash,
} from "@/components/operations/staff/primitives";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatCurrency } from "@/lib/format";
import { getTodayISO } from "@/lib/dates";

interface StaffAccessorySalesCardProps {
  date: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSaleComplete?: () => void;
}

export function StaffAccessorySalesCard({
  date,
  expanded,
  onExpandedChange,
  onSaleComplete,
}: StaffAccessorySalesCardProps) {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const { metrics } = useSalesDashboard();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const today = getTodayISO();
  const isToday = date === today;

  const branchSales = useMemo(
    () => filterByBranchField(sales, activeBranch),
    [sales, activeBranch]
  );

  const todaysSales = useMemo(
    () =>
      branchSales.filter(
        (sale) => sale.date === date && sale.status === "completed"
      ),
    [branchSales, date]
  );

  const todayRevenue = isToday
    ? (metrics.todayRevenue ?? 0)
    : todaysSales.reduce((sum, sale) => sum + sale.total, 0);

  const salesLabel =
    todaysSales.length === 1 ? "1 sale" : `${todaysSales.length} sales`;

  function handleSaleSuccess() {
    setRefreshKey((value) => value + 1);
    setShowSuccess(true);
    window.setTimeout(() => setShowSuccess(false), 1200);
    onExpandedChange?.(false);
    onSaleComplete?.();
  }

  return (
    <StaffOperationCard
      accent="default"
      title="Accessory Sales"
      description="Record sales throughout the day."
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      headerAction={<StaffSuccessFlash show={showSuccess} />}
      collapsedPreview={
        <StaffCollapsedSummary
          primary={salesLabel}
          secondary={formatCurrency(todayRevenue)}
        />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StaffMetricTile
            label="Today's Sales"
            value={todaysSales.length}
            highlight="neutral"
          />
          <StaffMetricTile
            label="Today's Revenue"
            value={
              <StaffAnimatedMoney
                value={todayRevenue}
                className="text-inherit"
                fromZero={false}
              />
            }
            highlight="positive"
          />
        </div>

        {isToday ? (
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
            <StaffSectionLabel>Record Sale</StaffSectionLabel>
            <div className="mt-4">
              <NewSaleForm
                key={refreshKey}
                inline
                onSuccess={handleSaleSuccess}
              />
            </div>
          </div>
        ) : null}
      </div>
    </StaffOperationCard>
  );
}
