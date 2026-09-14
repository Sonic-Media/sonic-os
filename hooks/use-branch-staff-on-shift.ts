"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBranchStaffOnShiftApi } from "@/lib/api/staff-attendance";
import type { Branch } from "@/types";

export function useBranchStaffOnShift(branch: Branch, businessDate: string) {
  const [staffOnShift, setStaffOnShift] = useState<
    Array<{ staffId: string; staffName: string }>
  >([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const records = await fetchBranchStaffOnShiftApi({
        branch,
        date: businessDate,
      });
      setStaffOnShift(records);
    } catch (error) {
      console.error("[branch-staff-on-shift] refresh failed:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [branch, businessDate]);

  useEffect(() => {
    setIsLoaded(false);
    void refresh();
  }, [refresh]);

  return {
    staffOnShift,
    refresh,
    isLoaded,
  };
}
