"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SalesRecentSales } from "@/components/sales/sales-recent-sales";
import { Button } from "@/components/shared/ui/button";
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

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
        Accessory Sales
      </h3>

      <Card className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {isToday ? "Today's Accessory Sales" : "Accessory Sales"}
          </p>
          <p className="mt-1 text-lg font-semibold text-white tabular-nums">
            {formatCurrency(todayRevenue)}
          </p>
        </div>
        {!readOnly && isToday && (
          <Button href="/sales/new" type="button">
            Record Sale
          </Button>
        )}
      </Card>

      {!readOnly && isToday && (
        <p className="text-sm text-zinc-500">
          Record physical accessory sales in the{" "}
          <Link href="/sales/new" className="text-white hover:text-zinc-300">
            Accessory Sales
          </Link>{" "}
          module. Totals update here automatically.
        </p>
      )}

      <SalesRecentSales sales={todaysSales} />
    </section>
  );
}
