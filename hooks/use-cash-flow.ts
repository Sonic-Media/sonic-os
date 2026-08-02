"use client";

import { useMemo, useState } from "react";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import {
  computeBranchExpenseTotals,
  computeCashFlowSummary,
  computeCategoryExpenseTotals,
  computeMonthlySummary,
  getDateRangeForPeriod,
} from "@/lib/expenses-module/calculations";
import { STAFF_PAYMENT_CATEGORY_NAME } from "@/lib/expenses-module/constants";
import { computeStaffPaymentReportSummary } from "@/lib/staff-payments/calculations";
import type { Branch } from "@/types";
import type { CashFlowDateRange, CashFlowPeriod } from "@/types/expenses-module";

export function useCashFlow(initialPeriod: CashFlowPeriod = "month") {
  const { expenses } = useExpensesModule();
  const { sales } = useSales();
  const { purchases } = usePurchasing();
  const { entries } = useEntriesContext();
  const { getBranchName } = useSettings();

  const [period, setPeriod] = useState<CashFlowPeriod>(initialPeriod);
  const [customRange, setCustomRange] = useState<CashFlowDateRange>(() =>
    getDateRangeForPeriod("month")
  );

  const range = useMemo(
    () => getDateRangeForPeriod(period, customRange),
    [period, customRange]
  );

  const summary = useMemo(
    () => computeCashFlowSummary(sales, purchases, expenses, range, entries),
    [sales, purchases, expenses, range, entries]
  );

  const monthlySummary = useMemo(
    () => computeMonthlySummary(sales, purchases, expenses, range, entries),
    [sales, purchases, expenses, range, entries]
  );

  const topCategories = useMemo(
    () =>
      computeCategoryExpenseTotals(expenses, range)
        .filter((item) => item.category !== STAFF_PAYMENT_CATEGORY_NAME)
        .slice(0, 5),
    [expenses, range]
  );

  const staffPaymentReport = useMemo(() => {
    const summary = computeStaffPaymentReportSummary(expenses, range);
    return {
      ...summary,
      byBranch: summary.byBranch.map(({ branch, total }) => ({
        branch: getBranchName(branch as Branch),
        total,
      })),
    };
  }, [expenses, range, getBranchName]);

  const branchComparison = useMemo(
    () =>
      computeBranchExpenseTotals(expenses, range).map(({ branch, total }) => ({
        branch: getBranchName(branch as Branch),
        total,
      })),
    [expenses, range, getBranchName]
  );

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    range,
    summary,
    monthlySummary,
    topCategories,
    branchComparison,
    staffPaymentReport,
  };
}
