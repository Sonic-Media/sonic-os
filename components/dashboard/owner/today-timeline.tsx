"use client";

import { useBusinessTransactions } from "@/hooks/use-business-transactions";
import {
  DashboardEmptyState,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";

export function TodayTimeline() {
  const { transactions, hasActivity } = useBusinessTransactions();

  return (
    <OwnerCard>
      <OwnerSectionTitle>Live Operations</OwnerSectionTitle>
      <p className="mt-2 text-sm text-zinc-500">
        Newest activity first — what staff are doing right now.
      </p>

      {!hasActivity ? (
        <DashboardEmptyState
          className="mt-6"
          title="No activity yet today"
          description="Sales, expenses, and shift events will appear here in real time."
        />
      ) : (
        <div className="mt-8 space-y-0">
          {transactions.map((transaction, index) => (
            <div
              key={transaction.id}
              className="relative flex gap-4 pb-7 last:pb-0"
            >
              {index < transactions.length - 1 ? (
                <span className="absolute left-[11px] top-7 h-[calc(100%-0.75rem)] w-px bg-zinc-800/80" />
              ) : null}

              <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums text-zinc-500">
                  {transaction.timeLabel}
                </p>
                <p className="mt-1 text-base font-medium text-white">
                  {transaction.title}
                </p>
                {transaction.detail ? (
                  <p className="mt-1 text-sm text-zinc-400">
                    {transaction.detail}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerCard>
  );
}
