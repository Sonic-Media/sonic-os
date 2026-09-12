"use client";

import { useBusinessTransactions } from "@/hooks/use-business-transactions";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

import type { BusinessTransactionType } from "@/lib/transactions/types";

const typeAccent: Partial<Record<BusinessTransactionType, string>> = {
  AccessorySale: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  Revenue: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  Expense: "border-orange-500/25 bg-orange-500/10 text-orange-400",
  Purchase: "border-violet-500/25 bg-violet-500/10 text-violet-400",
  StaffPayment: "border-purple-500/25 bg-purple-500/10 text-purple-400",
  BranchOpen: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  BranchClose: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
};

function resolveAccent(type: BusinessTransactionType): string {
  return (
    typeAccent[type] ??
    "border-indigo-500/25 bg-indigo-500/10 text-indigo-400"
  );
}

export function TodayTimeline() {
  const { transactions, hasActivity } = useBusinessTransactions();

  return (
    <OwnerCard className="h-full">
      <OwnerSectionTitle>Today&apos;s Activity</OwnerSectionTitle>
      <p className="mt-1 text-xs text-zinc-500">
        Operational events as they happen — newest first.
      </p>

      {!hasActivity ? (
        <DashboardEmptyState
          className="mt-6 py-8"
          title="No activity yet today"
          description="Sales, expenses, and shift events will appear here in real time."
        />
      ) : (
        <div className="mt-5 space-y-0">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {index < transactions.length - 1 ? (
                <span className="absolute left-[13px] top-6 h-[calc(100%-0.5rem)] w-px bg-white/[0.06]" />
              ) : null}

              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  resolveAccent(transaction.type)
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white">{transaction.title}</p>
                  <p className="text-xs tabular-nums text-zinc-500">
                    {transaction.timeLabel}
                  </p>
                </div>
                {transaction.detail ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{transaction.detail}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}
