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
import { mapCloseDayError } from "@/lib/ux/close-day-messages";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { useStaff } from "@/context/staff-context";

export function useStaffCloseDay(date?: string) {
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
  const {
    submitCloseRequest,
    getActiveOpenRecord,
    isCloseRequestPending,
    isBranchDayClosed,
  } = useDayClosing();

  const activeRecord = getActiveOpenRecord(activeBranch);
  const businessDate = activeRecord?.date ?? date ?? getTodayISO();
  const closeRequestPending =
    activeRecord?.status === "close_requested" ||
    isCloseRequestPending(activeBranch, businessDate);
  const dayClosed = isBranchDayClosed(activeBranch, businessDate);

  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);

  const branchEntity = activeBranches.find((item) => item.code === activeBranch);
  const shopOpen = Boolean(activeRecord?.status === "open");

  const metrics = useMemo(() => {
    if (!branchEntity) return null;
    return computeDayClosingMetrics(
      branchEntity,
      sales,
      purchases,
      expenses,
      entries,
      payments,
      businessDate
    );
  }, [branchEntity, sales, purchases, expenses, entries, payments, businessDate]);

  const clearError = useCallback(() => setError(null), []);

  const closeStaffDay = useCallback(
    async (closingNotes: string) => {
      if (closingRef.current || isClosing) {
        return { success: false as const };
      }

      if (!session) {
        const message = mapCloseDayError("", "forbidden");
        setError(message);
        return { success: false as const, message };
      }

      if (closeRequestPending) {
        const message = mapCloseDayError(
          "A closing request has already been submitted for this business day.",
          "close_request_already_pending"
        );
        setError(message);
        return { success: false as const, message };
      }

      if (dayClosed) {
        const message = mapCloseDayError("", "day_already_closed");
        setError(message);
        return { success: false as const, message };
      }

      if (!shopOpen) {
        const message = mapCloseDayError("", "shop_not_opened");
        setError(message);
        return { success: false as const, message };
      }

      if (!metrics) {
        const message =
          "We couldn't submit the closing request. Check your connection and try again.";
        setError(message);
        return { success: false as const, message };
      }

      closingRef.current = true;
      setIsClosing(true);
      setError(null);

      const payoutRows = buildStaffPayoutRows(
        staff,
        activeBranch,
        payments,
        businessDate
      ).map((payout) => ({ ...payout, selected: false }));

      const expectedCash = computeExpectedCash(metrics.cashBeforeClosing, payoutRows);

      const result = await submitCloseRequest({
        branch: activeBranch,
        date: businessDate,
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
      businessDate,
      closeRequestPending,
      dayClosed,
      isClosing,
      metrics,
      payments,
      session,
      settings.ownerName,
      shopOpen,
      staff,
      submitCloseRequest,
    ]
  );

  return {
    closeStaffDay,
    isClosing,
    error,
    clearError,
    shopOpen,
    businessDate,
    closeRequestPending,
    dayClosed,
  };
}
