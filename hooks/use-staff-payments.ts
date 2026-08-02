"use client";

import { useMemo } from "react";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { useActiveBranch } from "@/context/active-branch-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useSettings } from "@/context/settings-context";
import { getDateRangeForPeriod } from "@/lib/expenses-module/calculations";
import {
  computeStaffPaymentReportSummary,
  filterStaffPaymentsByRange,
  getStaffPaymentHistory,
} from "@/lib/staff-payments/calculations";
import {
  computeStaffTodayStatus,
  getStaffActivityForProfile,
  getStaffExpenses,
  getStaffInventoryActions,
  getStaffLoginHistory,
  getStaffPurchases,
  getStaffSales,
} from "@/lib/staff/dashboard";
import { computeStaffReports } from "@/lib/staff/reports";
import { filterStaffBySearch } from "@/lib/staff/search";
import { getStaffAuditForProfile } from "@/lib/staff/audit";
import type { Branch, Staff } from "@/types";
import type { CashFlowDateRange } from "@/types/expenses-module";

export function useStaffPayments(range?: CashFlowDateRange) {
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { payments, isLoaded: paymentsLoaded } = useStaffPaymentsModule();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { purchases, isLoaded: purchasesLoaded } = usePurchasing();
  const { activeStaff, isLoaded: staffLoaded } = useStaff();
  const { getBranchName } = useSettings();
  const { activeBranch, isLoaded: branchLoaded } = useActiveBranch();

  const effectiveRange = range ?? getDateRangeForPeriod("month");

  const branchStaff = useMemo(
    () => activeStaff.filter((member) => member.branch === activeBranch),
    [activeStaff, activeBranch]
  );

  const branchExpenses = useMemo(
    () => filterByBranchField(expenses, activeBranch),
    [expenses, activeBranch]
  );

  const branchPayments = useMemo(
    () => filterByBranchField(payments, activeBranch),
    [payments, activeBranch]
  );

  const branchSales = useMemo(
    () => filterByBranchField(sales, activeBranch),
    [sales, activeBranch]
  );

  const branchPurchases = useMemo(
    () => filterByBranchField(purchases, activeBranch),
    [purchases, activeBranch]
  );

  const todayStatuses = useMemo(
    () =>
      branchStaff.map((member) =>
        computeStaffTodayStatus(
          member,
          branchExpenses,
          branchSales,
          undefined,
          undefined,
          undefined,
          branchPayments
        )
      ),
    [branchStaff, branchExpenses, branchSales, branchPayments]
  );

  const summaries = todayStatuses;

  const allPayments = useMemo(
    () =>
      filterStaffPaymentsByRange(branchPayments, effectiveRange).sort(
        (left, right) => {
          const dateCompare = right.date.localeCompare(left.date);
          if (dateCompare !== 0) return dateCompare;
          return right.createdAt.localeCompare(left.createdAt);
        }
      ),
    [branchPayments, effectiveRange]
  );

  const report = useMemo(() => {
    const summary = computeStaffPaymentReportSummary(
      branchPayments,
      effectiveRange
    );
    return {
      ...summary,
      byBranch: summary.byBranch.map(({ branch, total }) => ({
        branch: getBranchName(branch as Branch),
        total,
      })),
    };
  }, [branchPayments, effectiveRange, getBranchName]);

  const staffReports = useMemo(
    () =>
      computeStaffReports(
        branchStaff,
        branchExpenses,
        branchSales,
        branchPurchases,
        branchPayments
      ),
    [branchStaff, branchExpenses, branchSales, branchPurchases, branchPayments]
  );

  function getPaymentHistoryForStaff(staffId: string) {
    return getStaffPaymentHistory(staffId, branchPayments);
  }

  function filterSummariesBySearch(query: string) {
    const filteredStaff = filterStaffBySearch(branchStaff, query);
    const ids = new Set(filteredStaff.map((member) => member.id));
    return todayStatuses.filter((status) => ids.has(status.staffId));
  }

  function getStaffDashboard(member: Staff) {
    return {
      todayStatus: computeStaffTodayStatus(
        member,
        branchExpenses,
        branchSales,
        undefined,
        undefined,
        undefined,
        branchPayments
      ),
      activity: getStaffActivityForProfile(
        member,
        branchSales,
        branchExpenses,
        branchPurchases,
        branchPayments
      ),
      payments: getStaffPaymentHistory(member.id, branchPayments),
      sales: getStaffSales(member, branchSales),
      inventory: getStaffInventoryActions(member),
      expenses: getStaffExpenses(member, branchExpenses),
      loginHistory: getStaffLoginHistory(member),
      auditLog: getStaffAuditForProfile(member.id),
      purchases: getStaffPurchases(member, branchPurchases),
    };
  }

  return {
    summaries,
    todayStatuses,
    allPayments,
    report,
    staffReports,
    isLoaded:
      expensesLoaded &&
      paymentsLoaded &&
      staffLoaded &&
      salesLoaded &&
      purchasesLoaded &&
      branchLoaded,
    getPaymentHistoryForStaff,
    filterSummariesBySearch,
    getStaffDashboard,
  };
}
