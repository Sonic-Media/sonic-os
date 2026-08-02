import { getTodayISO } from "@/lib/dates";
import type { AuditLogFilterCriteria, AuditLogRecord } from "@/types/audit-log";

export function createDefaultAuditLogFilters(
  todayISO: string = getTodayISO()
): AuditLogFilterCriteria {
  return {
    dateStart: `${todayISO.slice(0, 7)}-01`,
    dateEnd: todayISO,
    branch: "all",
    staffId: "all",
    module: "all",
    action: "all",
  };
}

export function filterAuditLogRecords(
  records: AuditLogRecord[],
  criteria: AuditLogFilterCriteria
): AuditLogRecord[] {
  return records
    .filter((record) => {
      const date = record.timestamp.slice(0, 10);
      if (date < criteria.dateStart || date > criteria.dateEnd) return false;
      if (criteria.branch !== "all" && record.branch !== criteria.branch) {
        return false;
      }
      if (criteria.staffId !== "all" && record.userId !== criteria.staffId) {
        return false;
      }
      if (criteria.module !== "all" && record.module !== criteria.module) {
        return false;
      }
      if (criteria.action !== "all" && record.action !== criteria.action) {
        return false;
      }
      return true;
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}
