import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";

function isActiveBusinessDayRecord(record: DayClosingRecord): boolean {
  return (
    (record.status === "open" || record.status === "close_requested") &&
    !!(record.openedAt || record.reopenedAt)
  );
}

/**
 * Returns the active open business day for a branch (earliest open date).
 * Used by Close Day to avoid calendar-date rollover mismatches.
 */
export function getActiveOpenDayRecord(
  branch: Branch,
  records: DayClosingRecord[]
): DayClosingRecord | undefined {
  return records
    .filter(
      (record) =>
        matchesBranch(record.branch, branch) && isActiveBusinessDayRecord(record)
    )
    .sort((left, right) => left.date.localeCompare(right.date))[0];
}

function matchesBranch(recordBranch: Branch, branch: Branch): boolean {
  return branchCodesReferToSameInventory(recordBranch, branch);
}
