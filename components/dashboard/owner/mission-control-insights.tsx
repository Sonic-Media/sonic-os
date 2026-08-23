"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDashboardContext } from "@/context/dashboard-context";
import { useSales } from "@/context/sales-context";
import { useStock } from "@/context/stock-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";

export function TopStaffToday() {
  const { analytics } = useDashboardContext();
  const bestStaff = analytics.bestStaff;

  return (
    <OwnerCard>
      <OwnerSectionTitle>Top Staff Today</OwnerSectionTitle>
      {!bestStaff ? (
        <DashboardEmptyState
          className="mt-5"
          title="No staff activity yet today."
          description="Performance highlights appear after the first operational records."
        />
      ) : (
        <div className="mt-5">
          <p className="text-2xl font-semibold text-white">{bestStaff.staffName}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {formatCurrency(bestStaff.totalSales)} handled today
          </p>
          <p className="mt-1 text-sm text-zinc-500">{bestStaff.branchName}</p>
        </div>
      )}
    </OwnerCard>
  );
}

export function TopProductsToday() {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const today = getTodayISO();

  const topProduct = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch).filter(
      (sale) => sale.date === today && sale.status === "completed"
    );
    const totals = new Map<string, { name: string; amount: number }>();

    for (const sale of branchSales) {
      for (const item of sale.items) {
        const current = totals.get(item.productId) ?? {
          name: item.productName,
          amount: 0,
        };
        current.amount += item.lineTotal;
        totals.set(item.productId, current);
      }
    }

    let leader: { name: string; amount: number } | null = null;
    for (const entry of totals.values()) {
      if (!leader || entry.amount > leader.amount) {
        leader = entry;
      }
    }

    return leader;
  }, [activeBranch, sales, today]);

  return (
    <OwnerCard>
      <OwnerSectionTitle>Top Products</OwnerSectionTitle>
      {!topProduct ? (
        <DashboardEmptyState
          className="mt-5"
          title="No product sales yet today."
          description="Accessory sales recorded in Today's Operations will appear here."
        />
      ) : (
        <div className="mt-5">
          <p className="text-2xl font-semibold text-white">{topProduct.name}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {formatCurrency(topProduct.amount)} sold today
          </p>
        </div>
      )}
    </OwnerCard>
  );
}

export function RecentSalesToday() {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const today = getTodayISO();

  const recentSales = useMemo(
    () =>
      filterByBranchField(sales, activeBranch)
        .filter((sale) => sale.date === today && sale.status === "completed")
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )
        .slice(0, 5),
    [activeBranch, sales, today]
  );

  return (
    <OwnerCard>
      <OwnerSectionTitle>Recent Sales</OwnerSectionTitle>
      {recentSales.length === 0 ? (
        <DashboardEmptyState
          className="mt-5"
          title="No sales recorded yet today."
          description="Recent accessory sales will stream in from Today's Operations."
        />
      ) : (
        <div className="mt-5 space-y-3">
          {recentSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.04] bg-zinc-900/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {sale.staffName ?? "Sale"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{sale.time}</p>
              </div>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(sale.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}

export function InventoryAlerts() {
  const { metrics } = useStock();
  const lowStock = metrics.lowStock ?? 0;
  const outOfStock = metrics.outOfStock ?? 0;
  const hasAlerts = lowStock > 0 || outOfStock > 0;

  return (
    <OwnerCard>
      <OwnerSectionTitle>Inventory Alerts</OwnerSectionTitle>
      {!hasAlerts ? (
        <DashboardEmptyState
          className="mt-5"
          title="Inventory looks healthy."
          description="Low-stock and out-of-stock alerts will appear here automatically."
        />
      ) : (
        <div className="mt-5 space-y-3">
          {outOfStock > 0 ? (
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">
              {outOfStock} product{outOfStock === 1 ? "" : "s"} out of stock.
            </div>
          ) : null}
          {lowStock > 0 ? (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-200">
              {lowStock} product{lowStock === 1 ? "" : "s"} running low.
            </div>
          ) : null}
        </div>
      )}
    </OwnerCard>
  );
}
