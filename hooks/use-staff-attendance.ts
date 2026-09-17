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
  isShopSessionOpener,
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

  function resolveOpenRecord(branch: typeof activeBranch) {
    if (!closingLoaded) return null;
    const record = getActiveOpenRecord(branch);
    if (
      !record ||
      (record.status !== "open" && record.status !== "close_requested")
    ) {
      return null;
    }
    return record;
  }

  function resolveSessionDate(branch: typeof activeBranch): string | null {
    return resolveOpenRecord(branch)?.date ?? null;
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
        // Attendance can still work from shop-session + in-session cache.
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
    if (!shopSessionOpen || !activeOpenRecord) {
      return [];
    }

    const fromSession = getCurrentShopSessionStaff(
      activeStaff,
      activeBranch,
      dateISO,
      auditRecords,
      true,
      activeOpenRecord
    );

    if (fromSession.length > 0 || serverOnShiftIds.size === 0) {
      return fromSession;
    }

    // Server on-shift is authoritative when local caches are incomplete.
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
    activeOpenRecord,
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

    const member =
      (session?.staffId
        ? activeStaff.find((item) => item.id === session.staffId)
        : undefined) ?? null;

    const isOpener =
      shopSessionOpen &&
      Boolean(
        activeOpenRecord &&
          ((session?.userId &&
            (activeOpenRecord.openedBy === session.userId ||
              activeOpenRecord.openedBy === session.staffId)) ||
            (member && isShopSessionOpener(member, activeOpenRecord)))
      );

    if (!status) {
      if (
        shopSessionOpen &&
        (isOpener ||
          (session?.staffId && serverOnShiftIds.has(session.staffId))) &&
        member
      ) {
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
      return null;
    }

    if (!shopSessionOpen) {
      return { ...status, presence: "off-shift" as const };
    }

    if (
      status.presence === "off-shift" &&
      (isOpener ||
        (session?.staffId && serverOnShiftIds.has(session.staffId)))
    ) {
      return { ...status, presence: "on-shift" as const };
    }

    return status;
  }, [
    activeBranch,
    activeOpenRecord,
    activeStaff,
    auditRecords,
    dateISO,
    serverOnShiftIds,
    session?.staffId,
    session?.userId,
    shopSessionOpen,
  ]);

  function getAttendanceForStaff(
    staffId: string,
    branch = activeBranch
  ): StaffAttendanceStatus | undefined {
    const member = activeStaff.find((item) => item.id === staffId);
    if (!member) return undefined;
    const openRecord = resolveOpenRecord(branch);
    const sessionDate = openRecord?.date ?? dateISO;
    const status = getStaffAttendanceStatus(
      member,
      sessionDate,
      auditRecords,
      branch
    );
    if (!openRecord) {
      return { ...status, presence: "off-shift" };
    }
    if (
      status.presence === "off-shift" &&
      (isShopSessionOpener(member, openRecord) ||
        (serverOnShiftIds.has(staffId) &&
          branch === activeBranch &&
          sessionDate === dateISO))
    ) {
      return { ...status, presence: "on-shift" };
    }
    return status;
  }

  function checkStaffOnShift(staffId: string, branch = activeBranch): boolean {
    const openRecord = resolveOpenRecord(branch);
    if (!openRecord) return false;
    const sessionDate = openRecord.date;
    const member = activeStaff.find((item) => item.id === staffId);
    if (member && isShopSessionOpener(member, openRecord)) return true;
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
