import { calculateExpenses } from "@/lib/amounts";
import { filterCompletedEntries } from "@/lib/entry-helpers";
import {
  buildStaffLookup,
  resolveStaffDisplayName,
} from "@/lib/staff-storage";
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
  return entries.filter((entry) => entry.staffId === staffFilter);
}

export function aggregateEntriesByStaff(
  entries: Entry[],
  staff: Staff[]
): StaffReportSummary[] {
  const lookup = buildStaffLookup(staff);
  const completedEntries = filterCompletedEntries(entries);
  const grouped = new Map<string, StaffReportSummary>();

  for (const entry of completedEntries) {
    if (!entry.staffId) continue;

    const member = lookup.get(entry.staffId);
    const expenses = calculateExpenses(entry);
    const existing = grouped.get(entry.staffId);

    if (existing) {
      existing.entryCount += 1;
      existing.totalSales += entry.sales;
      existing.totalExpenses += expenses;
      existing.totalSavings += entry.sales - expenses;
      continue;
    }

    grouped.set(entry.staffId, {
      staffId: entry.staffId,
      staffName: resolveStaffDisplayName(
        entry.staffId,
        entry.staffName,
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
