"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranchState } from "@/hooks/use-branch-state";
import { useBusinessTransactions } from "@/hooks/use-business-transactions";
import { useSales } from "@/context/sales-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatRelativeTime } from "@/lib/format";
import { formatClockTime } from "@/lib/staff/attendance";
import { getTodayISO } from "@/lib/dates";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function MissionControlShopStatus() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const branchState = useBranchState();
  const { sales } = useSales();
  const { transactions } = useBusinessTransactions(today);

  const meta = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch)
      .filter((sale) => sale.date === today && sale.status === "completed")
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

    const lastSale = branchSales[0];
    const lastTransaction = transactions[0];

    let durationMinutes = 0;
    if (branchState.openedAt) {
      const endTime =
        branchState.status === "closed" && branchState.closedAt
          ? new Date(branchState.closedAt).getTime()
          : Date.now();
      durationMinutes = Math.max(
        0,
        Math.floor((endTime - new Date(branchState.openedAt).getTime()) / 60_000)
      );
    }

    return {
      durationLabel: durationMinutes > 0 ? formatDuration(durationMinutes) : "—",
      lastSaleLabel: lastSale
        ? formatRelativeTime(lastSale.createdAt)
        : "No sales yet",
      lastActivityLabel: lastTransaction?.title ?? "No activity yet",
    };
  }, [
    activeBranch,
    branchState.closedAt,
    branchState.openedAt,
    branchState.status,
    sales,
    today,
    transactions,
  ]);

  const statusLabel =
    branchState.status === "closed"
      ? "Closed"
      : branchState.status === "open"
        ? "Open"
        : "Waiting";

  return (
    <OwnerCard>
      <OwnerSectionTitle>Shop Status</OwnerSectionTitle>

      <div className="mt-6 flex items-center gap-3">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            branchState.status === "open"
              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
              : "bg-zinc-500"
          )}
        />
        <p
          className={cn(
            "text-xl font-semibold",
            branchState.status === "open" ? "text-emerald-400" : "text-zinc-400"
          )}
        >
          {statusLabel}
        </p>
      </div>

      {branchState.status === "closed" ? (
        <div className="mt-8 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Closed At
            </p>
            <p className="mt-2 text-base font-medium text-white tabular-nums">
              {formatClockTime(branchState.closedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Closed By
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {branchState.closedByName ?? "—"}
            </p>
          </div>
        </div>
      ) : branchState.status === "open" ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Opened By
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {branchState.openedByName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Duration
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {meta.durationLabel}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Sale
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {meta.lastSaleLabel}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Last Activity
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {meta.lastActivityLabel}
            </p>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          className="mt-6"
          title="Shop not open yet"
          description="Staff will open today's shop during operating hours."
        />
      )}
    </OwnerCard>
  );
}
