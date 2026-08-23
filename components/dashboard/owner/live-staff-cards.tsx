"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useSales } from "@/context/sales-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import { useStaffPayments } from "@/hooks/use-staff-payments";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import { formatRelativeTime } from "@/lib/format";
import { formatClockTime } from "@/lib/staff/attendance";
import {
  AnimatedMoney,
  OwnerCard,
  OwnerSectionTitle,
} from "@/components/dashboard/owner/primitives";
import { cn } from "@/lib/utils";
import { useBranchState } from "@/hooks/use-branch-state";

export function LiveStaffCards() {
  const today = getTodayISO();
  const { activeBranch } = useActiveBranch();
  const { sales } = useSales();
  const { todayStatuses } = useStaffPayments();
  const { activeOnShift } = useStaffAttendance(today);
  const branchState = useBranchState();

  const cards = useMemo(() => {
    return activeOnShift.map((attendance) => {
      const status = todayStatuses.find(
        (item) => item.staffId === attendance.staffId
      );
      const memberSales = sales.filter(
        (sale) =>
          sale.date === today &&
          sale.status === "completed" &&
          branchCodesReferToSameInventory(sale.branch, activeBranch) &&
          (sale.staffId === attendance.staffId ||
            sale.staffName === attendance.staffName)
      );

      return {
        staffId: attendance.staffId,
        staffName: attendance.staffName,
        shiftStartedAt: attendance.shiftStartedAt,
        lastActivityLabel: status?.lastActivityLabel ?? null,
        lastActivityAt: status?.lastActivityAt ?? null,
        accessoryRevenue: memberSales.reduce((sum, sale) => sum + sale.total, 0),
        transactions: memberSales.length,
      };
    });
  }, [activeBranch, activeOnShift, sales, today, todayStatuses]);

  if (!branchState.isLoaded) {
    return null;
  }

  if (branchState.status === "waiting") {
    return (
      <OwnerCard>
        <OwnerSectionTitle>Active Staff</OwnerSectionTitle>
        <p className="mt-4 text-sm text-zinc-500">
          Waiting for the first staff member to start today&apos;s shift.
        </p>
      </OwnerCard>
    );
  }

  if (cards.length === 0) {
    return (
      <OwnerCard>
        <OwnerSectionTitle>Active Staff</OwnerSectionTitle>
        <p className="mt-4 text-sm text-zinc-500">
          No staff are currently clocked in at this branch.
        </p>
      </OwnerCard>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <OwnerSectionTitle>Active Staff</OwnerSectionTitle>
        <p className="mt-2 text-sm text-zinc-500">
          Live employee cards from today&apos;s attendance sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <OwnerCard key={card.staffId} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{card.staffName}</h3>
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-2 text-sm font-medium",
                    "text-emerald-400"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  On Shift
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                Since {formatClockTime(card.shiftStartedAt)}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Accessory Revenue
                </p>
                <AnimatedMoney
                  value={card.accessoryRevenue}
                  className="mt-2 block text-xl font-semibold text-white"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Transactions
                </p>
                <p className="mt-2 text-xl font-semibold text-white tabular-nums">
                  {card.transactions}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/[0.05] pt-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Last Activity
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {card.lastActivityLabel ?? "No activity yet"}
              </p>
              {card.lastActivityAt ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {formatRelativeTime(card.lastActivityAt)}
                </p>
              ) : null}
            </div>
          </OwnerCard>
        ))}
      </div>
    </section>
  );
}
