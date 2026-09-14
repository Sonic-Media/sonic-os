"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  fetchBranchStaffOnShift,
  type BranchStaffOnShiftMember,
} from "@/lib/api/staff-attendance";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import type { Branch } from "@/types";

export function useBranchStaffOnShift(branch: Branch, businessDate: string) {
  const { isAuthenticated } = useAuth();
  const [staffOnShift, setStaffOnShift] = useState<BranchStaffOnShiftMember[]>(
    []
  );
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    function handleAuditUpdated() {
      refresh();
    }

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
    return () =>
      window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated || !branch || !businessDate) {
      setStaffOnShift([]);
      return;
    }

    let cancelled = false;

    void fetchBranchStaffOnShift({ branch, date: businessDate })
      .then((records) => {
        if (!cancelled) {
          setStaffOnShift(records);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStaffOnShift([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [branch, businessDate, isAuthenticated, version]);

  return { staffOnShift, refresh };
}
