"use client";

import { useCallback } from "react";
import { useAuditLog } from "@/context/audit-log-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useStock } from "@/context/stock-context";

export function useAppDataRefresh() {
  const { refreshAuditLog } = useAuditLog();
  const { refreshClosings } = useDayClosing();
  const { refreshEntries } = useEntriesContext();
  const { refreshFromApi: refreshExpenses } = useExpensesModule();
  const { refreshSales } = useSales();
  const { refreshPurchases } = usePurchasing();
  const { refreshPayments } = useStaffPaymentsModule();
  const { refreshStockFromApi } = useStock();

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshAuditLog(),
      refreshClosings(),
      refreshEntries(),
      refreshExpenses(),
      refreshSales(),
      refreshPurchases(),
      refreshPayments(),
      refreshStockFromApi(),
    ]);
  }, [
    refreshAuditLog,
    refreshClosings,
    refreshEntries,
    refreshExpenses,
    refreshSales,
    refreshPurchases,
    refreshPayments,
    refreshStockFromApi,
  ]);

  return { refreshAll };
}
