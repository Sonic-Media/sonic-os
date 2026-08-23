"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { fetchStaffAttendance } from "@/lib/api/staff-attendance";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import { getTodayISO } from "@/lib/dates";
import {
  getActiveStaffAttendance,
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
  };
}

export function useStaffAttendance(dateISO: string = getTodayISO()) {
  const { activeBranch } = useActiveBranch();
  const { session, isAuthenticated } = useAuth();
  const { activeStaff } = useStaff();
  const [auditVersion, setAuditVersion] = useState(0);

  useEffect(() => {
    function handleAuditUpdated() {
      setAuditVersion((value) => value + 1);
    }

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
    return () =>
      window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !session?.staffId) return;

    let cancelled = false;

    void fetchStaffAttendance(dateISO)
      .then((records) => {
        if (cancelled) return;
        mergeStaffAuditRecords(records.map(mapAttendanceRecord));
        setAuditVersion((value) => value + 1);
      })
      .catch(() => {
        // Attendance can still work from in-session cache if the fetch fails.
      });

    return () => {
      cancelled = true;
    };
  }, [dateISO, isAuthenticated, session?.staffId]);

  const auditRecords = useMemo(
    () => getStaffAuditRecords(),
    [auditVersion]
  );

  const currentAttendance = useMemo(
    () => resolveCurrentStaffAttendance(activeBranch, dateISO, auditRecords),
    [activeBranch, auditRecords, dateISO]
  );

  const activeOnShift = useMemo(
    () => getActiveStaffAttendance(activeStaff, activeBranch, dateISO, auditRecords),
    [activeStaff, activeBranch, auditRecords, dateISO]
  );

  function getAttendanceForStaff(staffId: string): StaffAttendanceStatus | undefined {
    const member = activeStaff.find((item) => item.id === staffId);
    if (!member) return undefined;
    return getStaffAttendanceStatus(member, dateISO, auditRecords, activeBranch);
  }

  function checkStaffOnShift(staffId: string): boolean {
    return isStaffOnShift(staffId, activeBranch, dateISO, auditRecords);
  }

  return {
    currentAttendance,
    activeOnShift,
    getAttendanceForStaff,
    isStaffOnShift: checkStaffOnShift,
  };
}
