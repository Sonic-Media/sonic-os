"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useBranches } from "@/context/branches-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaff } from "@/context/staff-context";
import {
  buildStaffPayoutRows,
  computeDayClosingMetrics,
  computeExpectedCash,
} from "@/lib/day-closing/calculations";
import { mapCloseDayError } from "@/lib/ux/close-day-messages";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import { resolveBranchEntityForMetrics } from "@/lib/branch/resolve-branch-entity";

export function useManagementApproveClose(branch: Branch, businessDate: string) {
  const { getBranchByCode, getBranchName } = useBranches();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { expenses } = useExpensesModule();
  const { entries } = useEntriesContext();
  const { payments } = useStaffPaymentsModule();
  const { staff } = useStaff();
  const { session } = useAuth();
  const { settings } = useSettings();
  const { approveAndClose } = useDayClosing();

  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approvingRef = useRef(false);

  const branchEntity = useMemo(
    () => resolveBranchEntityForMetrics(branch, getBranchByCode, getBranchName),
    [branch, getBranchByCode, getBranchName]
  );

  const metrics = useMemo(() => {
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

  const approveClose = useCallback(
    async (closingNotes?: string): Promise<{
      success: boolean;
      record?: DayClosingRecord;
      message?: string;
    }> => {
      if (approvingRef.current || isApproving) {
        return { success: false };
      }

      if (!session) {
        const message = mapCloseDayError("", "forbidden");
        setError(message);
        return { success: false, message };
      }

      approvingRef.current = true;
      setIsApproving(true);
      setError(null);

      const payoutRows = buildStaffPayoutRows(
        staff,
        branch,
        payments,
        businessDate
      ).map((payout) => ({ ...payout, selected: false }));

      const expectedCash = computeExpectedCash(metrics.cashBeforeClosing, payoutRows);

      const result = await approveAndClose({
        branch,
        date: businessDate,
        metrics,
        staffPayouts: payoutRows,
        expectedCash,
        actualCashCounted: expectedCash,
        closingNotes: closingNotes?.trim() || undefined,
      });

      setIsApproving(false);
      approvingRef.current = false;

      if (!result.success) {
        const message = toStaffFacingError(result.errors.form ?? "", {
          ownerName: settings.ownerName,
          context: "close-day",
        });
        setError(message);
        return { success: false, message };
      }

      return { success: true, record: result.record };
    },
    [
      approveAndClose,
      branch,
      businessDate,
      isApproving,
      metrics,
      payments,
      session,
      settings.ownerName,
      staff,
    ]
  );

  return {
    approveClose,
    isApproving,
    error,
    metrics,
  };
}
