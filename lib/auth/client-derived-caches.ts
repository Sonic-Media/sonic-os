import { clearActivityRecordsCache } from "@/lib/activity-log";
import { clearStaffAuditClientCaches } from "@/lib/staff/audit";

/** Clears non-authoritative client module caches on logout/login/session change. */
export function clearClientDerivedCaches(): void {
  clearStaffAuditClientCaches();
  clearActivityRecordsCache();
}
