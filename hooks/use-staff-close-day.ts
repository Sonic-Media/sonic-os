"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import {
  buildStaffPayoutRows,
  computeDayClosingMetrics,
  computeExpectedCash,
} from "@/lib/day-closing/calculations";
import { getTodayISO } from "@/lib/dates";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { useStaff } from "@/context/staff-context";

export function useStaffCloseDay(date = getTodayISO()) {
  const { activeBranch } = useActiveBranch();
  const { activeBranches } = useBranches();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { entries } = useEntriesContext();
  const { payments } = useStaffPaymentsModule();
  const { staff } = useStaff();
  const { session } = useAuth();
  const { settings } = useSettings();
  const { closeDay } = useDayClosing();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);

  const branchEntity = activeBranches.find((item) => item.code === activeBranch);

  const metrics = useMemo(() => {
    if (!branchEntity) return null;
    return computeDayClosingMetrics(
      branchEntity,
      sales,
      purchases,
      expenses,
      entries,
      payments,
      date
    );
  }, [branchEntity, sales, purchases, expenses, entries, payments, date]);

  const closeStaffDay = useCallback(
    async (closingNotes: string) => {
      if (closingRef.current || isClosing) {
        return { success: false as const };
      }

      if (!metrics || !session) {
        setError("Unable to close the day right now.");
        return { success: false as const };
      }

      closingRef.current = true;
      setIsClosing(true);
      setError(null);

      const payoutRows = buildStaffPayoutRows(
        staff,
        activeBranch,
        payments,
        date
      ).map((payout) => ({ ...payout, selected: false }));

      const expectedCash = computeExpectedCash(metrics.cashBeforeClosing, payoutRows);

      const result = await closeDay({
        branch: activeBranch,
        date,
        metrics,
        staffPayouts: payoutRows,
        expectedCash,
        actualCashCounted: expectedCash,
        closingNotes,
      });

      setIsClosing(false);
      closingRef.current = false;

      if (!result.success) {
        const message = toStaffFacingError(result.errors.form ?? "", {
          ownerName: settings.ownerName,
          context: "close-day",
        });
        setError(message);
        return { success: false as const, message };
      }

      return { success: true as const, record: result.record };
    },
    [
      activeBranch,
      closeDay,
      date,
      isClosing,
      metrics,
      payments,
      session,
      settings.ownerName,
      staff,
    ]
  );

  return {
    closeStaffDay,
    isClosing,
    error,
  };
}
