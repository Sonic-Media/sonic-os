import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { getTodayISO } from "@/lib/dates";
import {
  getStaffAuditRecords,
  recordStaffAction,
  resolveStaffFromSession,
} from "@/lib/staff/audit";
import type { Branch } from "@/types";
import type { Staff } from "@/types";
import type {
  StaffAttendanceSession,
  StaffAttendanceStatus,
  StaffShiftPresence,
} from "@/types/staff-attendance";
import type { StaffAuditRecord } from "@/types/staff-audit";

const ATTENDANCE_ACTIONS = new Set<string>([
  AUDIT_ACTIONS.START_SHIFT,
  AUDIT_ACTIONS.CLOCK_IN,
  AUDIT_ACTIONS.CLOCK_OUT,
  AUDIT_ACTIONS.OPEN_DAY,
]);

function isSameDay(timestamp: string, dateISO: string): boolean {
  return timestamp.slice(0, 10) === dateISO;
}

function matchesBranch(recordBranch: Branch, branch: Branch): boolean {
  return branchCodesReferToSameInventory(recordBranch, branch);
}

function isAttendanceAction(action: string): boolean {
  return ATTENDANCE_ACTIONS.has(action);
}

function isClockInAction(action: string): boolean {
  return (
    action === AUDIT_ACTIONS.START_SHIFT ||
    action === AUDIT_ACTIONS.CLOCK_IN ||
    action === AUDIT_ACTIONS.OPEN_DAY
  );
}

function durationMinutes(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

function computeTotalHours(
  sessions: StaffAttendanceSession[],
  nowIso: string = new Date().toISOString()
): number {
  let totalMinutes = 0;

  for (const session of sessions) {
    const end = session.clockOutAt ?? nowIso;
    totalMinutes += durationMinutes(session.clockInAt, end);
  }

  return Math.round((totalMinutes / 60) * 10) / 10;
}

function buildSessionsFromAudit(
  staffId: string,
  staffName: string,
  branch: Branch,
  dateISO: string,
  auditRecords: StaffAuditRecord[]
): StaffAttendanceSession[] {
  const events = auditRecords
    .filter(
      (record) =>
        record.staffId === staffId &&
        matchesBranch(record.branch, branch) &&
        isSameDay(record.timestamp, dateISO) &&
        isAttendanceAction(record.action)
    )
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  const sessions: StaffAttendanceSession[] = [];
  let openSession: StaffAttendanceSession | null = null;

  for (const event of events) {
    if (isClockInAction(event.action)) {
      if (openSession && !openSession.clockOutAt) {
        openSession.clockOutAt = event.timestamp;
        sessions.push(openSession);
      }

      openSession = {
        id: event.id,
        staffId,
        staffName: event.staffName || staffName,
        branch,
        date: dateISO,
        clockInAt: event.timestamp,
        openedBranch:
          event.action === AUDIT_ACTIONS.START_SHIFT ||
          event.action === AUDIT_ACTIONS.OPEN_DAY,
      };
      continue;
    }

    if (event.action === AUDIT_ACTIONS.CLOCK_OUT && openSession) {
      openSession.clockOutAt = event.timestamp;
      sessions.push(openSession);
      openSession = null;
    }
  }

  if (openSession) {
    sessions.push(openSession);
  }

  return sessions;
}

export function getStaffAttendanceSessions(
  staffId: string,
  staffName: string,
  branch: Branch,
  dateISO: string = getTodayISO(),
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords()
): StaffAttendanceSession[] {
  return buildSessionsFromAudit(staffId, staffName, branch, dateISO, auditRecords);
}

export function getStaffAttendanceStatus(
  member: Pick<Staff, "id" | "name" | "branch">,
  dateISO: string = getTodayISO(),
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords(),
  branch: Branch = member.branch,
  nowIso: string = new Date().toISOString()
): StaffAttendanceStatus {
  const sessions = getStaffAttendanceSessions(
    member.id,
    member.name,
    branch,
    dateISO,
    auditRecords
  );

  const openSession = sessions.find((session) => !session.clockOutAt) ?? null;
  const lastCompleted = [...sessions].reverse().find((session) => session.clockOutAt);
  const firstSession = sessions[0] ?? null;
  const presence: StaffShiftPresence = openSession ? "on-shift" : "off-shift";

  return {
    staffId: member.id,
    staffName: member.name,
    branch: member.branch,
    date: dateISO,
    presence,
    openedBranchToday: sessions.some((session) => session.openedBranch),
    lastClockInAt: openSession?.clockInAt ?? lastCompleted?.clockInAt ?? null,
    lastClockOutAt: lastCompleted?.clockOutAt ?? null,
    shiftStartedAt: firstSession?.clockInAt ?? null,
    todayTotalHours: computeTotalHours(sessions, nowIso),
    currentSessionDurationMinutes: openSession
      ? durationMinutes(openSession.clockInAt, nowIso)
      : null,
    sessions,
  };
}

export function isStaffOnShift(
  staffId: string,
  branch: Branch,
  dateISO: string = getTodayISO(),
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords()
): boolean {
  const staffName =
    auditRecords.find((record) => record.staffId === staffId)?.staffName ?? "";

  const sessions = getStaffAttendanceSessions(
    staffId,
    staffName,
    branch,
    dateISO,
    auditRecords
  );

  return sessions.some((session) => !session.clockOutAt);
}

export function getActiveStaffAttendance(
  staff: Staff[],
  branch: Branch,
  dateISO: string = getTodayISO(),
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords()
): StaffAttendanceStatus[] {
  return staff
    .filter((member) => member.active)
    .map((member) =>
      getStaffAttendanceStatus(member, dateISO, auditRecords, branch)
    )
    .filter((status) => status.presence === "on-shift")
    .sort((left, right) =>
      (left.shiftStartedAt ?? "").localeCompare(right.shiftStartedAt ?? "")
    );
}

export function recordStaffStartShiftAttendance(branch: Branch): StaffAuditRecord | null {
  return recordStaffAction({
    branch,
    action: AUDIT_ACTIONS.START_SHIFT,
    module: "operations",
    detail: "Branch opened for the day",
  });
}

export function recordStaffClockIn(branch: Branch): StaffAuditRecord | null {
  return recordStaffAction({
    branch,
    action: AUDIT_ACTIONS.CLOCK_IN,
    module: "operations",
  });
}

export function recordStaffClockOut(branch: Branch): StaffAuditRecord | null {
  return recordStaffAction({
    branch,
    action: AUDIT_ACTIONS.CLOCK_OUT,
    module: "operations",
  });
}

export function resolveCurrentStaffAttendance(
  branch: Branch,
  dateISO: string = getTodayISO(),
  auditRecords: StaffAuditRecord[] = getStaffAuditRecords()
): StaffAttendanceStatus | null {
  const member = resolveStaffFromSession();
  if (!member) return null;
  return getStaffAttendanceStatus(member, dateISO, auditRecords, branch);
}

export function formatAttendanceHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export function formatClockTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
