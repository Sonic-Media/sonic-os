"use client";

import { useBranchState } from "@/hooks/use-branch-state";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerKpiIcon,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3.5 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <AnimatedMoney
        value={value}
        className={cn(
          "text-sm font-semibold",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          tone === "warning" && "text-orange-400",
          tone === "default" && "text-white"
        )}
      />
    </div>
  );
}

export function MissionControlRightPanel() {
  const branchState = useBranchState();
  const totalIn = branchState.movieRevenue + branchState.accessoryRevenue;
  const totalOut = branchState.operatingExpenses + branchState.staffWages;

  return (
    <div className="space-y-4">
      <OwnerCard accent="orange">
        <div className="flex items-start justify-between gap-3">
          <div>
            <OwnerSectionTitle>Expenses</OwnerSectionTitle>
            <AnimatedMoney
              value={branchState.operatingExpenses}
              className="mt-3 block text-2xl font-semibold text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">Operating expenses today</p>
          </div>
          <OwnerKpiIcon accent="orange">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0V18.75M2.25 18.75V9A2.25 2.25 0 014.5 6.75h15A2.25 2.25 0 0121.75 9v9.75A2.25 2.25 0 0119.5 21h-15a2.25 2.25 0 01-2.25-2.25z" />
            </svg>
          </OwnerKpiIcon>
        </div>
      </OwnerCard>

      <OwnerCard accent="purple">
        <div className="flex items-start justify-between gap-3">
          <div>
            <OwnerSectionTitle>Daily Wage</OwnerSectionTitle>
            <AnimatedMoney
              value={branchState.staffWages}
              className="mt-3 block text-2xl font-semibold text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">Staff payments today</p>
          </div>
          <OwnerKpiIcon accent="purple">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </OwnerKpiIcon>
        </div>
      </OwnerCard>

      <OwnerCard accent="blue">
        <OwnerSectionTitle>Cash Summary</OwnerSectionTitle>
        <p className="mt-1 text-xs text-zinc-500">Today&apos;s cash position</p>

        <div className="mt-4 space-y-2">
          <SummaryRow label="Revenue In" value={totalIn} tone="positive" />
          <SummaryRow label="Expenses Out" value={branchState.operatingExpenses} tone="warning" />
          <SummaryRow label="Staff Wages" value={branchState.staffWages} />
          <SummaryRow label="Total Out" value={totalOut} tone="warning" />
          <div className="border-t border-white/[0.06] pt-2">
            <SummaryRow
              label="Net Cash"
              value={branchState.netCash}
              tone={branchState.netCash >= 0 ? "positive" : "negative"}
            />
          </div>
        </div>
      </OwnerCard>
    </div>
  );
}
