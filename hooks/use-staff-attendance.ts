"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { fetchStaffAttendance } from "@/lib/api/staff-attendance";
import { apiGet } from "@/lib/api/client";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import { getTodayISO } from "@/lib/dates";
import {
  getCurrentShopSessionStaff,
  getStaffAttendanceStatus,
  isStaffOnShift,
  resolveCurrentStaffAttendance,
} from "@/lib/staff/attendance";
import {
  getStaffAuditRecords,
  mergeStaffAuditRecords,
} from "@/lib/staff/audit";
import { useStaff } from "@/context/staff-context";
import type { StaffAttendanceStatus } from "@/types/staff-attendance";
import type { StaffAuditRecord } from "@/types/staff-audit";

function mapAttendanceRecord(record: {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  branch: string;
  action: string;
  module: string;
  recordId?: string;
}): StaffAuditRecord {
  return {
    id: record.id,
    timestamp: record.timestamp,
    staffId: record.userId,
    staffName: record.userName,
    role: record.role as StaffAuditRecord["role"],
    branch: record.branch as StaffAuditRecord["branch"],
    action: record.action,
    module: record.module as StaffAuditRecord["module"],
    recordId: record.recordId,
  };
}

export function useStaffAttendance(dateISO: string = getTodayISO()) {
  const { activeBranch } = useActiveBranch();
  const { session, isAuthenticated } = useAuth();
  const { activeStaff } = useStaff();
  const { getActiveOpenRecord, isLoaded: closingLoaded } = useDayClosing();
  const [auditVersion, setAuditVersion] = useState(0);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [serverOnShiftIds, setServerOnShiftIds] = useState<Set<string>>(
    () => new Set()
  );

  const activeOpenRecord = getActiveOpenRecord(activeBranch);
  const shopSessionOpen = Boolean(
    closingLoaded &&
      activeOpenRecord &&
      activeOpenRecord.date === dateISO &&
      (activeOpenRecord.status === "open" ||
        activeOpenRecord.status === "close_requested")
  );

  function resolveSessionDate(branch: typeof activeBranch): string | null {
    if (!closingLoaded) return null;
    const record = getActiveOpenRecord(branch);
    if (
      !record ||
      (record.status !== "open" && record.status !== "close_requested")
    ) {
      return null;
    }
    return record.date;
  }

  function isShopSessionOpenFor(branch: typeof activeBranch): boolean {
    return resolveSessionDate(branch) !== null;
  }

  useEffect(() => {
    function handleAuditUpdated() {
      setAuditVersion((value) => value + 1);
    }

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
    return () =>
      window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setServerOnShiftIds(new Set());
      setAttendanceLoaded(true);
      return;
    }

    let cancelled = false;
    setAttendanceLoaded(false);

    void (async () => {
      try {
        if (session?.staffId) {
          const records = await fetchStaffAttendance(dateISO);
          if (cancelled) return;
          mergeStaffAuditRecords(records.map(mapAttendanceRecord));
          setAuditVersion((value) => value + 1);
        }

        const onShift = await apiGet<
          Array<{ staffId: string; staffName: string }>
        >(
          `/api/staff/attendance/on-shift?branch=${encodeURIComponent(activeBranch)}&date=${encodeURIComponent(dateISO)}`
        );
        if (cancelled) return;
        setServerOnShiftIds(new Set(onShift.map((member) => member.staffId)));
      } catch {
        // Attendance can still work from in-session cache if the fetch fails.
      } finally {
        if (!cancelled) {
          setAttendanceLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBranch, dateISO, isAuthenticated, session?.staffId]);

  const auditRecords = useMemo(
    () => getStaffAuditRecords(),
    [auditVersion]
  );

  const activeOnShift = useMemo(() => {
    if (!shopSessionOpen) {
      return [];
    }

    const fromAudit = getCurrentShopSessionStaff(
      activeStaff,
      activeBranch,
      dateISO,
      auditRecords,
      true
    );

    if (fromAudit.length > 0 || serverOnShiftIds.size === 0) {
      return fromAudit;
    }

    // Server on-shift is authoritative when local audit cache is incomplete
    // (e.g. owner without personal attendance feed yet).
    return activeStaff
      .filter((member) => serverOnShiftIds.has(member.id))
      .map((member) =>
        getStaffAttendanceStatus(member, dateISO, auditRecords, activeBranch)
      )
      .map((status) =>
        status.presence === "on-shift"
          ? status
          : {
              ...status,
              presence: "on-shift" as const,
              lastClockInAt: status.lastClockInAt ?? `${dateISO}T00:00:00.000Z`,
              shiftStartedAt:
                status.shiftStartedAt ?? `${dateISO}T00:00:00.000Z`,
            }
      )
      .sort((left, right) =>
        (left.shiftStartedAt ?? "").localeCompare(right.shiftStartedAt ?? "")
      );
  }, [
    activeBranch,
    activeStaff,
    auditRecords,
    dateISO,
    serverOnShiftIds,
    shopSessionOpen,
  ]);

  const currentAttendance = useMemo(() => {
    const status = resolveCurrentStaffAttendance(
      activeBranch,
      dateISO,
      auditRecords
    );
    if (!status) {
      if (
        shopSessionOpen &&
        session?.staffId &&
        serverOnShiftIds.has(session.staffId)
      ) {
        const member = activeStaff.find((item) => item.id === session.staffId);
        if (member) {
          return {
            ...getStaffAttendanceStatus(
              member,
              dateISO,
              auditRecords,
              activeBranch
            ),
            presence: "on-shift" as const,
          };
        }
      }
      return null;
    }

    if (!shopSessionOpen) {
      return { ...status, presence: "off-shift" as const };
    }

    if (
      status.presence === "off-shift" &&
      session?.staffId &&
      serverOnShiftIds.has(session.staffId)
    ) {
      return { ...status, presence: "on-shift" as const };
    }

    return status;
  }, [
    activeBranch,
    activeStaff,
    auditRecords,
    dateISO,
    serverOnShiftIds,
    session?.staffId,
    shopSessionOpen,
  ]);

  function getAttendanceForStaff(
    staffId: string,
    branch = activeBranch
  ): StaffAttendanceStatus | undefined {
    const member = activeStaff.find((item) => item.id === staffId);
    if (!member) return undefined;
    const sessionDate = resolveSessionDate(branch) ?? dateISO;
    const status = getStaffAttendanceStatus(
      member,
      sessionDate,
      auditRecords,
      branch
    );
    if (!isShopSessionOpenFor(branch)) {
      return { ...status, presence: "off-shift" };
    }
    if (
      status.presence === "off-shift" &&
      serverOnShiftIds.has(staffId) &&
      branch === activeBranch &&
      sessionDate === dateISO
    ) {
      return { ...status, presence: "on-shift" };
    }
    return status;
  }

  function checkStaffOnShift(staffId: string, branch = activeBranch): boolean {
    const sessionDate = resolveSessionDate(branch);
    if (!sessionDate) return false;
    if (isStaffOnShift(staffId, branch, sessionDate, auditRecords)) return true;
    return (
      branch === activeBranch &&
      sessionDate === dateISO &&
      serverOnShiftIds.has(staffId)
    );
  }

  return {
    currentAttendance,
    activeOnShift,
    getAttendanceForStaff,
    isStaffOnShift: checkStaffOnShift,
    isLoaded: attendanceLoaded && closingLoaded,
    shopSessionOpen,
  };
}
