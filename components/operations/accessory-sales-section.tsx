"use client";

import { useMemo, useState } from "react";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { SalesRecentSales } from "@/components/sales/sales-recent-sales";
import { Card } from "@/components/shared/ui/card";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { useSalesDashboard } from "@/hooks/use-sales-dashboard";
import { formatCurrency } from "@/lib/format";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";

interface AccessorySalesSectionProps {
  date: string;
  readOnly?: boolean;
}

export function AccessorySalesSection({
  date,
  readOnly = false,
}: AccessorySalesSectionProps) {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const { metrics } = useSalesDashboard();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = getTodayISO();
  const isToday = date === today;
  const canRecord = !readOnly && isToday;

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

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Accessory Sales
      </h3>

      <Card className="px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {isToday ? "Today's Accessory Sales" : "Accessory Sales"}
        </p>
        <p className="mt-1 text-lg font-semibold text-white tabular-nums">
          {formatCurrency(todayRevenue)}
        </p>
      </Card>

      {canRecord ? (
        <NewSaleForm
          key={refreshKey}
          inline
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}

      <SalesRecentSales
        sales={todaysSales}
        title={isToday ? "Today's Accessory Sales" : "Accessory Sales"}
        limit={canRecord ? 8 : 5}
      />
    </section>
  );
}
