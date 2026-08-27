"use client";

import { useMemo } from "react";
import {
  StaffCard,
  StaffSectionLabel,
} from "@/components/operations/staff/primitives";
import { EmptyState } from "@/components/shared/ui/empty-state";
import { useSales } from "@/context/sales-context";
import { useActiveBranch } from "@/context/active-branch-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatCurrency } from "@/lib/format";
import type { Sale } from "@/types/sales";

interface StaffRecentTransactionsCardProps {
  date: string;
  movieRevenue: number;
  movieTime?: string;
  movieSortKey?: number;
  limit?: number;
}

interface DisplayTransaction {
  id: string;
  sortKey: number;
  time: string;
  saleType: string;
  amount: number;
}

function getAccessorySaleType(sale: Sale): string {
  const firstItem = sale.items[0];
  return firstItem?.productName ?? "Accessory Sale";
}

export function StaffRecentTransactionsCard({
  date,
  movieRevenue,
  movieTime,
  movieSortKey = 0,
  limit = 5,
}: StaffRecentTransactionsCardProps) {
  const { sales } = useSales();
  const { activeBranch } = useActiveBranch();

  const transactions = useMemo(() => {
    const rows: DisplayTransaction[] = filterByBranchField(sales, activeBranch)
      .filter(
        (sale) => sale.date === date && sale.status === "completed"
      )
      .map((sale) => ({
        id: sale.id,
        sortKey: Date.parse(sale.createdAt) || 0,
        time: sale.time,
        saleType: getAccessorySaleType(sale),
        amount: sale.total,
      }));

    if (movieRevenue > 0) {
      rows.push({
        id: "movie-sale",
        sortKey: movieSortKey,
        time: movieTime ?? "—",
        saleType: "Movie Sale",
        amount: movieRevenue,
      });
    }

    return rows.sort((a, b) => b.sortKey - a.sortKey).slice(0, limit);
  }, [
    sales,
    activeBranch,
    date,
    movieRevenue,
    movieTime,
    movieSortKey,
    limit,
  ]);

  return (
    <StaffCard accent="default">
      <StaffSectionLabel>Recent Transactions</StaffSectionLabel>

      {transactions.length === 0 ? (
        <div className="mt-5">
          <EmptyState compact title="No transactions recorded yet today." />
        </div>
      ) : (
        <div className="mt-5 divide-y divide-white/[0.05] rounded-2xl border border-white/[0.05] bg-black/20">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm tabular-nums text-zinc-500">
                  {transaction.time}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-white">
                  {transaction.saleType}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-white sm:text-right">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </StaffCard>
  );
}
