"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { buildBusinessTransactions } from "@/lib/transactions/build-business-transactions";
import { getTodayISO } from "@/lib/dates";

export function useBusinessTransactions(date = getTodayISO()) {
  const { activeBranch } = useActiveBranch();
  const { entries } = useEntriesContext();
  const { sales } = useSales();
  const { expenses } = useExpensesModule();
  const { purchases } = usePurchasing();
  const { payments } = useStaffPaymentsModule();
  const { getOpenRecord, getClosedRecord } = useDayClosing();

  return useMemo(() => {
    const transactions = buildBusinessTransactions({
      activeBranch,
      date,
      entries,
      sales,
      expenses,
      purchases,
      payments,
      openRecord: getOpenRecord(activeBranch, date),
      closedRecord: getClosedRecord(activeBranch, date),
    });

    return {
      transactions,
      hasActivity: transactions.length > 0,
    };
  }, [
    activeBranch,
    date,
    entries,
    expenses,
    getClosedRecord,
    getOpenRecord,
    payments,
    purchases,
    sales,
  ]);
}
