import { prisma } from "@/lib/db";
import { buildClosedDayDailyOperationEntry } from "@/lib/day-closing/entry-sync";
import { mapDailyOperationToEntry } from "@/lib/server/mappers/entities";
import { upsertDailyOperation } from "@/lib/server/services/daily-operations-service";
import { getBranchIdByCode } from "@/lib/server/branch-lookup";
import type { Branch } from "@/types";
import type { DayClosingSummary } from "@/types/day-closing";
import type { StaffActionRecord } from "@/types/staff-session";

export async function syncClosedDayDailyOperation(input: {
  branch: Branch;
  date: string;
  summary: DayClosingSummary;
  closingNotes?: string;
  createdBy?: StaffActionRecord;
}) {
  const branchId = await getBranchIdByCode(input.branch);
  const existing = await prisma.dailyOperation.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: input.date,
      },
    },
    include: { branch: true, expenses: true },
  });

  const entry = buildClosedDayDailyOperationEntry({
    branch: input.branch,
    date: input.date,
    summary: input.summary,
    closingNotes: input.closingNotes,
    existing: existing ? mapDailyOperationToEntry(existing) : undefined,
    createdBy: input.createdBy,
  });

  if (existing) {
    entry.id = existing.id;
  }

  return upsertDailyOperation(entry);
}
