"use client";

import { useBranchState } from "@/hooks/use-branch-state";
import { formatClockTime } from "@/lib/staff/attendance";
import { AnimatedMoney, OwnerCard, OwnerSectionTitle } from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

export function LiveBranchCard() {
  const branchState = useBranchState();

  const statusLabel =
    branchState.status === "closed"
      ? "Closed"
      : branchState.status === "open"
        ? "Open"
        : "Waiting";

  return (
    <OwnerCard>
      <OwnerSectionTitle>Branch Status</OwnerSectionTitle>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                branchState.status === "closed"
                  ? "bg-zinc-500"
                  : branchState.status === "open"
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                    : "bg-amber-400"
              )}
            />
            <p
              className={cn(
                "text-sm font-medium",
                branchState.status === "closed"
                  ? "text-zinc-400"
                  : branchState.status === "open"
                    ? "text-emerald-400"
                    : "text-amber-400"
              )}
            >
              {branchState.isLoaded ? statusLabel : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Opened By</p>
          <p className="mt-2 text-sm font-medium text-white">
            {branchState.openedByName ?? "—"}
          </p>
          {branchState.openedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              {formatClockTime(branchState.openedAt)}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Closed By</p>
          <p className="mt-2 text-sm font-medium text-white">
            {branchState.closedByName ?? "—"}
          </p>
          {branchState.closedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              {formatClockTime(branchState.closedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 xl:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Active Staff</p>
          <p className="mt-2 text-3xl font-semibold text-white tabular-nums">
            {branchState.activeStaffCount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Accessory Revenue
          </p>
          <AnimatedMoney
            value={branchState.accessoryRevenue}
            className="mt-2 block text-3xl font-semibold text-white"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Movie Revenue
          </p>
          <AnimatedMoney
            value={branchState.movieRevenue}
            className="mt-2 block text-3xl font-semibold text-white"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Expenses</p>
          <AnimatedMoney
            value={branchState.expenses}
            className="mt-2 block text-3xl font-semibold text-white"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Purchases</p>
          <AnimatedMoney
            value={branchState.purchases}
            className="mt-2 block text-3xl font-semibold text-white"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Net Cash Flow</p>
          <AnimatedMoney
            value={branchState.netCashFlow}
            className={cn(
              "mt-2 block text-3xl font-semibold",
              branchState.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          />
        </div>
      </div>
    </OwnerCard>
  );
}
