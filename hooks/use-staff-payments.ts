"use client";

import { useMemo } from "react";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useStaff } from "@/context/staff-context";
import { useSettings } from "@/context/settings-context";
import { getDateRangeForPeriod } from "@/lib/expenses-module/calculations";
import {
  computeStaffPaymentReportSummary,
  computeStaffPaymentSummary,
  filterStaffPaymentExpenses,
  getStaffPaymentHistory,
} from "@/lib/staff-payments/calculations";
import type { Branch } from "@/types";
import type { CashFlowDateRange } from "@/types/expenses-module";

export function useStaffPayments(range?: CashFlowDateRange) {
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { activeStaff, isLoaded: staffLoaded } = useStaff();
  const { getBranchName } = useSettings();

  const effectiveRange = range ?? getDateRangeForPeriod("month");

  const summaries = useMemo(
    () =>
      activeStaff.map((member) =>
        computeStaffPaymentSummary(member, expenses)
      ),
    [activeStaff, expenses]
  );

  const allPayments = useMemo(
    () =>
      filterStaffPaymentExpenses(expenses).sort((left, right) => {
        const dateCompare = right.date.localeCompare(left.date);
        if (dateCompare !== 0) return dateCompare;
        return right.createdAt.localeCompare(left.createdAt);
      }),
    [expenses]
  );

  const report = useMemo(() => {
    const summary = computeStaffPaymentReportSummary(expenses, effectiveRange);
    return {
      ...summary,
      byBranch: summary.byBranch.map(({ branch, total }) => ({
        branch: getBranchName(branch as Branch),
        total,
      })),
    };
  }, [expenses, effectiveRange, getBranchName]);

  function getPaymentHistoryForStaff(staffId: string) {
    return getStaffPaymentHistory(staffId, expenses);
  }

  return {
    summaries,
    allPayments,
    report,
    isLoaded: expensesLoaded && staffLoaded,
    getPaymentHistoryForStaff,
  };
}
