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

export interface AllBranchesOperationsState {
  snapshots: BranchOperationsSnapshot[];
  isReady: boolean;
  hasMultipleBranches: boolean;
}

export function useAllBranchesOperationsState(
  dateISO: string = getTodayISO()
): AllBranchesOperationsState {
  const { activeBranches, isLoaded: branchesLoaded } = useBranch();
  const { closings, isLoaded: closingsLoaded } = useDayClosing();
  const { activeStaff } = useStaff();
  useStaffAttendance(dateISO);

  const isReady = branchesLoaded && closingsLoaded;
  const hasMultipleBranches = activeBranches.length > 1;

  const snapshots = useMemo(() => {
    if (!isReady) return [];

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
  }, [
    activeBranches,
    activeStaff,
    closings,
    dateISO,
    isReady,
  ]);

  return { snapshots, isReady, hasMultipleBranches };
}

export function useAllBranchesOperations(
  dateISO: string = getTodayISO()
): BranchOperationsSnapshot[] {
  return useAllBranchesOperationsState(dateISO).snapshots;
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
