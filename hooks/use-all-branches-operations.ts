"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useBranch } from "@/context/branch-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useStaff } from "@/context/staff-context";
import { useStaffAttendance } from "@/hooks/use-staff-attendance";
import {
  computeBranchOperationsSnapshot,
  type BranchOperationsSnapshot,
} from "@/lib/branch/operations-state";
import { getStaffAuditRecords } from "@/lib/staff/audit";
import { getTodayISO } from "@/lib/dates";
import type { Branch } from "@/types";

export function useAllBranchesOperations(
  dateISO: string = getTodayISO()
): BranchOperationsSnapshot[] {
  const { activeBranches } = useBranch();
  const { closings, isLoaded } = useDayClosing();
  const { activeStaff } = useStaff();
  useStaffAttendance(dateISO);

  return useMemo(() => {
    if (!isLoaded) return [];

    const auditRecords = getStaffAuditRecords();
    return activeBranches.map((branch) =>
      computeBranchOperationsSnapshot(
        branch.code,
        dateISO,
        closings,
        activeStaff,
        auditRecords
      )
    );
  }, [activeBranches, activeStaff, closings, dateISO, isLoaded]);
}

export function useBranchOperationsSnapshot(
  branch: Branch,
  dateISO: string = getTodayISO()
): BranchOperationsSnapshot {
  const { closings, isLoaded } = useDayClosing();
  const { activeStaff } = useStaff();
  useStaffAttendance(dateISO);

  return useMemo(() => {
    const auditRecords = getStaffAuditRecords();
    if (!isLoaded) {
      return computeBranchOperationsSnapshot(
        branch,
        dateISO,
        [],
        activeStaff,
        auditRecords
      );
    }

    return computeBranchOperationsSnapshot(
      branch,
      dateISO,
      closings,
      activeStaff,
      auditRecords
    );
  }, [activeStaff, branch, closings, dateISO, isLoaded]);
}

export function useActiveBranchOperations(
  dateISO: string = getTodayISO()
): BranchOperationsSnapshot {
  const { activeBranch } = useActiveBranch();
  return useBranchOperationsSnapshot(activeBranch, dateISO);
}
