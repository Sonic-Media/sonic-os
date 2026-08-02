"use client";

import { useMemo } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { getTodayISO } from "@/lib/dates";
import { filterByBranchField } from "@/lib/active-branch/filters";

export function useActiveBranchScope<T extends { branch: import("@/types").Branch }>(
  records: T[]
) {
  const { activeBranch, isLoaded } = useActiveBranch();

  const scopedRecords = useMemo(
    () => filterByBranchField(records, activeBranch),
    [records, activeBranch]
  );

  return {
    activeBranch,
    isLoaded,
    records: scopedRecords,
    today: getTodayISO(),
  };
}
