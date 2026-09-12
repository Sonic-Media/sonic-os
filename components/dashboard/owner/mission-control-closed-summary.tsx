"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranchState } from "@/hooks/use-branch-state";
import { useSales } from "@/context/sales-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { formatCurrency } from "@/lib/format";
import { formatClockTime } from "@/lib/staff/attendance";
import { getTodayISO } from "@/lib/dates";
import { getTopAccessoryProduct } from "@/lib/operations/staff-day-insights";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function HighlightRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}

export function MissionControlClosedSummary() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const branchState = useBranchState();
  const { sales } = useSales();

  const highlights = useMemo(() => {
    const branchSales = filterByBranchField(sales, activeBranch).filter(
      (sale) => sale.date === today && sale.status === "completed"
    );
    const topProduct = getTopAccessoryProduct(branchSales) ?? "—";
    const highestTransaction =
      branchSales.length > 0
        ? Math.max(...branchSales.map((sale) => sale.total))
        : 0;

    return {
      topProduct,
      highestTransaction,
    };
  }, [activeBranch, sales, today]);

  if (branchState.status !== "closed") {
    return null;
  }

  return (
    <section className="space-y-4">
      <OwnerCard accent="green" className="border-emerald-500/15">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            ✓
          </span>
          <div>
            <p className="text-lg font-semibold text-emerald-300">Shop Closed</p>
            <p className="mt-0.5 text-sm text-zinc-400">
              Closed by {branchState.closedByName ?? "—"} ·{" "}
              {formatClockTime(branchState.closedAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Movie Revenue
            </p>
            <AnimatedMoney
              value={branchState.movieRevenue}
              className="mt-2 block text-xl font-semibold text-white"
            />
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Accessory Revenue
            </p>
            <AnimatedMoney
              value={branchState.accessoryRevenue}
              className="mt-2 block text-xl font-semibold text-white"
            />
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Expenses
            </p>
            <AnimatedMoney
              value={branchState.operatingExpenses}
              className="mt-2 block text-xl font-semibold text-white"
            />
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Net Cash
            </p>
            <AnimatedMoney
              value={branchState.netCash}
              className={cn(
                "mt-2 block text-xl font-semibold",
                branchState.netCash >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            />
          </div>
        </div>
      </OwnerCard>

      <OwnerCard>
        <OwnerSectionTitle>Today&apos;s Highlights</OwnerSectionTitle>
        <div className="mt-4 space-y-2">
          <HighlightRow label="Top accessory" value={highlights.topProduct} />
          <HighlightRow
            label="Highest transaction"
            value={
              highlights.highestTransaction > 0
                ? formatCurrency(highlights.highestTransaction)
                : "—"
            }
          />
          <HighlightRow
            label="Total expenses"
            value={formatCurrency(branchState.operatingExpenses)}
          />
        </div>
      </OwnerCard>
    </section>
  );
}
