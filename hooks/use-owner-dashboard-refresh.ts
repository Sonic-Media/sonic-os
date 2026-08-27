"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuditLog } from "@/context/audit-log-context";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpensesModule } from "@/context/expenses-module-context";
import { usePurchasing } from "@/context/purchasing-context";
import { useSales } from "@/context/sales-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { isOwnerRole } from "@/lib/auth/validation";

const OWNER_DASHBOARD_REFRESH_MS = 12_000;

export function useOwnerDashboardRefresh(): void {
  const { session, isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { refreshAuditLog } = useAuditLog();
  const { refreshClosings } = useDayClosing();
  const { refreshEntries } = useEntriesContext();
  const { refreshFromApi: refreshExpenses } = useExpensesModule();
  const { refreshSales } = useSales();
  const { refreshPurchases } = usePurchasing();
  const { refreshPayments } = useStaffPaymentsModule();
  const refreshInFlight = useRef(false);

  const refreshAll = useCallback(async () => {
    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;

    try {
      await Promise.all([
        refreshAuditLog(),
        refreshClosings(),
        refreshEntries(),
        refreshExpenses(),
        refreshSales(),
        refreshPurchases(),
        refreshPayments(),
      ]);
    } catch (error) {
      console.error("[owner-dashboard] live refresh failed:", error);
    } finally {
      refreshInFlight.current = false;
    }
  }, [
    refreshAuditLog,
    refreshClosings,
    refreshEntries,
    refreshExpenses,
    refreshSales,
    refreshPurchases,
    refreshPayments,
  ]);

  useEffect(() => {
    if (!authLoaded || !isAuthenticated || !session || !isOwnerRole(session.role)) {
      return;
    }

    function refreshIfVisible() {
      if (document.visibilityState === "hidden") {
        return;
      }

      void refreshAll();
    }

    refreshIfVisible();

    const interval = window.setInterval(
      refreshIfVisible,
      OWNER_DASHBOARD_REFRESH_MS
    );
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [authLoaded, isAuthenticated, session, refreshAll]);
}
