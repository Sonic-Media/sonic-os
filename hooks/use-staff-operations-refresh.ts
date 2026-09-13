"use client";

import { useCallback, useEffect, useRef } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useEntriesContext } from "@/context/entries-context";
import { canSubmitCloseRequest } from "@/lib/day-closing/permissions";

const STAFF_OPERATIONS_REFRESH_MS = 12_000;

export function useStaffOperationsRefresh(options?: {
  closeRequestPending?: boolean;
}): void {
  const { session, isAuthenticated, isLoaded: authLoaded } = useAuth();
  const { activeBranch } = useActiveBranch();
  const { refreshClosings, isBranchDayClosed, getActiveOpenRecord } =
    useDayClosing();
  const { refreshEntries } = useEntriesContext();
  const refreshInFlight = useRef(false);

  const shouldPoll =
    options?.closeRequestPending ||
    getActiveOpenRecord(activeBranch)?.status === "close_requested";

  const refreshAll = useCallback(async () => {
    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;

    try {
      await Promise.all([refreshClosings(), refreshEntries()]);
    } catch (error) {
      console.error("[staff-operations] live refresh failed:", error);
    } finally {
      refreshInFlight.current = false;
    }
  }, [refreshClosings, refreshEntries]);

  useEffect(() => {
    if (!authLoaded || !isAuthenticated || !session) {
      return;
    }

    if (!canSubmitCloseRequest(session.role) && !shouldPoll) {
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
      STAFF_OPERATIONS_REFRESH_MS
    );
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [
    activeBranch,
    authLoaded,
    isAuthenticated,
    refreshAll,
    session,
    shouldPoll,
    isBranchDayClosed,
  ]);
}
