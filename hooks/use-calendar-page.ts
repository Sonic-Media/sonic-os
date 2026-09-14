"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCalendarActivityIndex,
  getCalendarActivityMarkers,
  type CalendarBranchFilter,
} from "@/lib/calendar/activity-index";
import { buildCalendarTransactions } from "@/lib/calendar/build-calendar-transactions";
import {
  addDays,
  addMonths,
  addWeeks,
  buildMonthGrid,
  buildWeekDays,
  endOfWeek,
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  parseDateISO,
  startOfWeek,
  toDateISO,
} from "@/lib/calendar/date-utils";
import { useBranch } from "@/context/branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { getTodayISO } from "@/lib/dates";

export type CalendarViewMode = "month" | "week" | "day";

export function useCalendarPage() {
  const todayISO = getTodayISO();
  const {
    activeBranch,
    activeBranches,
    canSwitchBranch,
    getBranchName,
    isLoaded: branchLoaded,
  } = useBranch();
  const { entries, isLoaded: entriesLoaded } = useEntriesContext();
  const { sales, isLoaded: salesLoaded } = useSales();
  const { expenses, isLoaded: expensesLoaded } = useExpensesModule();
  const { purchases, isLoaded: purchasesLoaded } = usePurchasing();
  const { payments, isLoaded: paymentsLoaded } = useStaffPaymentsModule();
  const {
    closings,
    isLoaded: closingsLoaded,
    getOpenRecord,
    getClosedRecord,
  } = useDayClosing();

  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => parseDateISO(todayISO));
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [branchFilter, setBranchFilter] = useState<CalendarBranchFilter>("all");

  const effectiveBranchFilter: CalendarBranchFilter = canSwitchBranch
    ? branchFilter
    : activeBranch;

  useEffect(() => {
    if (!canSwitchBranch) {
      setBranchFilter(activeBranch);
    }
  }, [activeBranch, canSwitchBranch]);

  const dataSources = useMemo(
    () => ({
      entries,
      sales,
      expenses,
      purchases,
      payments,
      closings,
    }),
    [closings, entries, expenses, payments, purchases, sales]
  );

  const activityIndex = useMemo(
    () => buildCalendarActivityIndex(effectiveBranchFilter, dataSources),
    [dataSources, effectiveBranchFilter]
  );

  const monthGrid = useMemo(
    () => buildMonthGrid(anchorDate, todayISO),
    [anchorDate, todayISO]
  );

  const weekDays = useMemo(
    () => buildWeekDays(anchorDate, todayISO),
    [anchorDate, todayISO]
  );

  const selectedTransactions = useMemo(
    () =>
      buildCalendarTransactions({
        branchFilter: effectiveBranchFilter,
        date: selectedDate,
        activeBranches,
        ...dataSources,
        getOpenRecord,
        getClosedRecord,
      }),
    [
      activeBranches,
      dataSources,
      effectiveBranchFilter,
      getClosedRecord,
      getOpenRecord,
      selectedDate,
    ]
  );

  const periodLabel = useMemo(() => {
    if (viewMode === "month") return formatMonthLabel(anchorDate);
    if (viewMode === "week") {
      return formatWeekLabel(startOfWeek(anchorDate), endOfWeek(anchorDate));
    }
    return formatDayLabel(parseDateISO(selectedDate));
  }, [anchorDate, selectedDate, viewMode]);

  function goToPreviousPeriod() {
    setAnchorDate((current) => {
      if (viewMode === "month") return addMonths(current, -1);
      if (viewMode === "week") return addWeeks(current, -1);
      const next = addDays(parseDateISO(selectedDate), -1);
      setSelectedDate(toDateISO(next));
      return next;
    });
  }

  function goToNextPeriod() {
    setAnchorDate((current) => {
      if (viewMode === "month") return addMonths(current, 1);
      if (viewMode === "week") return addWeeks(current, 1);
      const next = addDays(parseDateISO(selectedDate), 1);
      setSelectedDate(toDateISO(next));
      return next;
    });
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setAnchorDate(parseDateISO(date));
    if (viewMode === "month") {
      setViewMode("day");
    }
  }

  function getMarkers(date: string) {
    return getCalendarActivityMarkers(activityIndex, date);
  }

  const isLoaded =
    branchLoaded &&
    entriesLoaded &&
    salesLoaded &&
    expensesLoaded &&
    purchasesLoaded &&
    paymentsLoaded &&
    closingsLoaded;

  return {
    isLoaded,
    canSwitchBranch,
    getBranchName,
    activeBranches,
    viewMode,
    setViewMode,
    periodLabel,
    goToPreviousPeriod,
    goToNextPeriod,
    monthGrid,
    weekDays,
    selectedDate,
    selectDate,
    getMarkers,
    selectedTransactions,
    branchFilter: effectiveBranchFilter,
    setBranchFilter,
    todayISO,
  };
}
