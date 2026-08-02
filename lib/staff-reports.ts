import { calculateExpenses } from "@/lib/amounts";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import {
  buildStaffLookup,
  resolveStaffDisplayName,
} from "@/lib/staff-storage";
import { getEntryActorId, getEntryActorName } from "@/lib/staff/session";
import type { Branch, Entry, HistoryStaffFilter, Staff } from "@/types";

export interface StaffReportSummary {
  staffId: string;
  staffName: string;
  branch: Branch;
  entryCount: number;
  totalSales: number;
  totalExpenses: number;
  totalSavings: number;
}

export function filterEntriesByStaff(
  entries: Entry[],
  staffFilter: HistoryStaffFilter
): Entry[] {
  if (staffFilter === "all") return entries;
  return entries.filter((entry) => getEntryActorId(entry) === staffFilter);
}

export function aggregateEntriesByStaff(
  entries: Entry[],
  staff: Staff[]
): StaffReportSummary[] {
  const lookup = buildStaffLookup(staff);
  const completedEntries = filterCompletedEntries(entries);
  const grouped = new Map<string, StaffReportSummary>();

  for (const entry of completedEntries) {
    const actorId = getEntryActorId(entry);
    if (!actorId) continue;

    const member = lookup.get(actorId);
    const expenses = calculateExpenses(entry);
    const existing = grouped.get(actorId);

    if (existing) {
      existing.entryCount += 1;
      existing.totalSales += entry.sales;
      existing.totalExpenses += expenses;
      existing.totalSavings += entry.sales - expenses;
      continue;
    }

    grouped.set(actorId, {
      staffId: actorId,
      staffName: resolveStaffDisplayName(
        actorId,
        getEntryActorName(entry) ?? "",
        lookup
      ),
      branch: member?.branch ?? entry.branch,
      entryCount: 1,
      totalSales: entry.sales,
      totalExpenses: expenses,
      totalSavings: entry.sales - expenses,
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.staffName.localeCompare(b.staffName)
  );
}

export function getStaffOptions(
  staff: Staff[]
): { value: string; label: string }[] {
  return staff.map((member) => ({
    value: member.id,
    label: member.active ? member.name : `${member.name} (Inactive)`,
  }));
}
