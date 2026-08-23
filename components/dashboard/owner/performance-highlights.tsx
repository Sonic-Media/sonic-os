"use client";

import { useMemo } from "react";
import { useDashboardContext } from "@/context/dashboard-context";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getTodayISO } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";

function HighlightCard({
  icon,
  label,
  value,
  detail,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-lg">
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {label}
        </p>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-zinc-400">{detail}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-zinc-900/70"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-5">
      {content}
    </div>
  );
}

export function PerformanceHighlights() {
  const { analytics, openDrillDown } = useDashboardContext();
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();
  const today = getTodayISO();

  const bestProduct = useMemo(() => {
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

  const highestSale = analytics.quickInsights.highestSalesDay;
  const highestExpense = analytics.quickInsights.highestExpenseCategory;
  const hasHighlights =
    analytics.bestStaff ||
    highestSale ||
    bestProduct ||
    highestExpense;

  return (
    <OwnerCard>
      <OwnerSectionTitle>Performance</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Standout moments from today&apos;s operating rhythm.
      </p>

      {!hasHighlights ? (
        <DashboardEmptyState
          className="mt-6"
          title="Today's performance highlights will appear here."
          description="Record today's first sale to unlock insights."
        />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HighlightCard
            icon="🏆"
            label="Best Staff"
            value={analytics.bestStaff?.staffName ?? "Waiting for activity"}
            detail={
              analytics.bestStaff
                ? `${formatCurrency(analytics.bestStaff.totalSales)} handled`
                : "Staff performance appears after today's first records."
            }
            onClick={
              analytics.bestStaff ? () => openDrillDown("staff") : undefined
            }
          />
          <HighlightCard
            icon="💰"
            label="Highest Sale"
            value={formatCurrency(highestSale?.value ?? 0)}
            detail={highestSale?.label ?? "Accessory and revenue peaks will show here."}
            onClick={highestSale ? () => openDrillDown("highest-sales-day") : undefined}
          />
          <HighlightCard
            icon="📦"
            label="Best Product"
            value={bestProduct?.name ?? "No product sales yet"}
            detail={
              bestProduct
                ? `${formatCurrency(bestProduct.amount)} sold today`
                : "Add products and record accessory sales to populate this card."
            }
          />
          <HighlightCard
            icon="💸"
            label="Highest Expense"
            value={formatCurrency(highestExpense?.amount ?? 0)}
            detail={highestExpense?.label ?? "Expense categories will appear here."}
            onClick={
              highestExpense ? () => openDrillDown("expense-history") : undefined
            }
          />
        </div>
      )}
    </OwnerCard>
  );
}
