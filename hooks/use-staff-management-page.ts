"use client";

import { useMemo, useState } from "react";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { getDateRangeForPeriod } from "@/lib/expenses-module/calculations";
import { computeStaffTodayStatus, getStaffActivityForProfile } from "@/lib/staff/dashboard";
import { filterStaffBySearch } from "@/lib/staff/search";
import {
  computeStaffPaymentReportSummary,
  filterStaffPaymentsByRange,
} from "@/lib/staff-payments/calculations";
import { getTodayISO } from "@/lib/dates";
import { useBranch } from "@/context/branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import type { Branch, Staff } from "@/types";
import type { StaffTodayStatus } from "@/types/staff-payment";

export type StaffShiftFilter = "all" | "on-shift" | "off-shift";
export type StaffBranchFilter = "all" | Branch;
export type StaffStatusFilter = "active" | "inactive" | "all";

export interface StaffManagementRow {
  member: Staff;
  todayStatus: StaffTodayStatus;
  todayHours: number;
  onShift: boolean;
}

export function useStaffManagementPage() {
  const today = getTodayISO();
  const monthRange = getDateRangeForPeriod("month");

  const { staff, activeStaff, isLoaded: staffLoaded } = useStaff();
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { purchases, isLoaded: purchasesLoaded } = usePurchasing();
  const { payments, isLoaded: paymentsLoaded } = useStaffPaymentsModule();
  const {
    activeBranch,
    canSwitchBranch,
    getBranchName,
    isLoaded: branchLoaded,
  } = useBranch();
  const { getActiveOpenRecord, isLoaded: closingLoaded } = useDayClosing();

  const activeOpenRecord = getActiveOpenRecord(activeBranch);
  const attendanceDate = activeOpenRecord?.date ?? today;
  const {
    getAttendanceForStaff,
    isStaffOnShift,
    isLoaded: attendanceLoaded,
  } = useStaffAttendance(attendanceDate);

  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState<StaffShiftFilter>("all");
  const [branchFilter, setBranchFilter] = useState<StaffBranchFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("active");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const basePool = useMemo(() => {
    if (statusFilter === "inactive") {
      return staff.filter((member) => !member.active || member.status === "inactive");
    }
    if (statusFilter === "all") {
      return staff;
    }
    return activeStaff;
  }, [activeStaff, staff, statusFilter]);

  const scopedPool = useMemo(() => {
    let pool = basePool;

    if (!canSwitchBranch) {
      pool = pool.filter((member) =>
        branchCodesReferToSameInventory(member.branch, activeBranch)
      );
    } else if (branchFilter !== "all") {
      pool = pool.filter((member) =>
        branchCodesReferToSameInventory(member.branch, branchFilter)
      );
    }

    return filterStaffBySearch(pool, search);
  }, [activeBranch, basePool, branchFilter, canSwitchBranch, search]);

  const rows = useMemo((): StaffManagementRow[] => {
    return scopedPool
      .map((member) => {
        const memberExpenses = filterByBranchField(expenses, member.branch);
        const memberSales = filterByBranchField(sales, member.branch);
        const memberPayments = filterByBranchField(payments, member.branch);
        const attendance = getAttendanceForStaff(member.id, member.branch);
        const onShift = isStaffOnShift(member.id, member.branch);

        return {
          member,
          todayStatus: computeStaffTodayStatus(
            member,
            memberExpenses,
            memberSales,
            undefined,
            undefined,
            today,
            memberPayments
          ),
          todayHours: attendance?.todayTotalHours ?? 0,
          onShift,
        };
      })
      .sort((left, right) =>
        left.member.name.localeCompare(right.member.name)
      );
  }, [
    expenses,
    getAttendanceForStaff,
    isStaffOnShift,
    payments,
    sales,
    scopedPool,
    today,
  ]);

  const filteredRows = useMemo(() => {
    if (shiftFilter === "on-shift") {
      return rows.filter((row) => row.onShift);
    }
    if (shiftFilter === "off-shift") {
      return rows.filter((row) => !row.onShift);
    }
    return rows;
  }, [rows, shiftFilter]);

  const kpis = useMemo(() => {
    const onShiftCount = rows.filter((row) => row.onShift).length;
    const totalHours = rows.reduce((sum, row) => sum + row.todayHours, 0);
    const pendingPayments = rows.filter((row) => !row.todayStatus.paidToday).length;

    const paymentScope =
      branchFilter === "all" && canSwitchBranch
        ? payments
        : filterByBranchField(
            payments,
            branchFilter === "all" ? activeBranch : branchFilter
          );

    const monthlyTotal = computeStaffPaymentReportSummary(
      filterStaffPaymentsByRange(paymentScope, monthRange),
      monthRange
    ).totalStaffPayments;

    return {
      totalStaff: rows.length,
      onShiftNow: onShiftCount,
      totalHoursToday: Math.round(totalHours * 10) / 10,
      pendingPayments,
      monthlyStaffCosts: monthlyTotal,
    };
  }, [
    activeBranch,
    branchFilter,
    canSwitchBranch,
    monthRange,
    payments,
    rows,
  ]);

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.member.id === selectedStaffId) ?? null,
    [filteredRows, selectedStaffId]
  );

  const recentActivity = useMemo(() => {
    const items = rows.flatMap((row) => {
      const memberExpenses = filterByBranchField(expenses, row.member.branch);
      const memberSales = filterByBranchField(sales, row.member.branch);
      const memberPurchases = filterByBranchField(purchases, row.member.branch);
      const memberPayments = filterByBranchField(payments, row.member.branch);

      return getStaffActivityForProfile(
        row.member,
        memberSales,
        memberExpenses,
        memberPurchases,
        memberPayments
      ).slice(0, 3);
    });

    return items
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 8);
  }, [expenses, payments, purchases, rows, sales]);

  const todayAttendance = useMemo(
    () =>
      rows
        .filter((row) => row.todayHours > 0 || row.onShift)
        .sort((left, right) => right.todayHours - left.todayHours),
    [rows]
  );

  const isLoaded =
    staffLoaded &&
    expensesLoaded &&
    salesLoaded &&
    purchasesLoaded &&
    paymentsLoaded &&
    branchLoaded &&
    closingLoaded &&
    attendanceLoaded;

  return {
    isLoaded,
    canSwitchBranch,
    getBranchName,
    search,
    setSearch,
    shiftFilter,
    setShiftFilter,
    branchFilter,
    setBranchFilter,
    statusFilter,
    setStatusFilter,
    selectedStaffId,
    setSelectedStaffId,
    filteredRows,
    selectedRow,
    kpis,
    recentActivity,
    todayAttendance,
    today,
  };
}
