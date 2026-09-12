import { buildBusinessTransactions } from "@/lib/transactions/build-business-transactions";
import type { BusinessTransaction } from "@/lib/transactions/types";
import type { BranchEntity } from "@/types/branch";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { CalendarActivityDataSources, CalendarBranchFilter } from "@/lib/calendar/activity-index";

interface BuildCalendarTransactionsInput extends CalendarActivityDataSources {
  branchFilter: CalendarBranchFilter;
  date: string;
  activeBranches: BranchEntity[];
  getOpenRecord: (branch: Branch, date?: string) => DayClosingRecord | undefined;
  getClosedRecord: (branch: Branch, date?: string) => DayClosingRecord | undefined;
}

export function buildCalendarTransactions({
  branchFilter,
  date,
  activeBranches,
  entries,
  sales,
  expenses,
  purchases,
  payments,
  getOpenRecord,
  getClosedRecord,
}: BuildCalendarTransactionsInput): BusinessTransaction[] {
  const branches =
    branchFilter === "all"
      ? activeBranches.map((branch) => branch.code)
      : [branchFilter];

  const transactions = branches.flatMap((branch) =>
    buildBusinessTransactions({
      activeBranch: branch,
      date,
      entries,
      sales,
      expenses,
      purchases,
      payments,
      openRecord: getOpenRecord(branch, date),
      closedRecord: getClosedRecord(branch, date),
    })
  );

  return transactions.sort((left, right) => right.sortKey - left.sortKey);
}
