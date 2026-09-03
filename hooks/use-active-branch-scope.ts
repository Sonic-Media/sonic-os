"use client";

import { useMemo } from "react";
import { useBranch } from "@/context/branch-context";
import { getTodayISO } from "@/lib/dates";

export function useActiveBranchScope<
  T extends { branch: import("@/types").Branch },
>(records: T[]) {
  const { activeBranch, isLoaded, filterByActiveBranch } = useBranch();

  const scopedRecords = useMemo(
    () => filterByActiveBranch(records),
    [records, filterByActiveBranch]
  );

  return {
    activeBranch,
    isLoaded,
    records: scopedRecords,
    today: getTodayISO(),
  };
}
