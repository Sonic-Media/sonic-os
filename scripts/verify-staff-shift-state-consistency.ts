#!/usr/bin/env tsx
/**
 * Staff shift state consistency — header vs close-day guard alignment.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { resolveStaffAttendanceDateISO } from "@/lib/staff/attendance-date";
import {
  getActiveStaffAttendance,
  getStaffAttendanceStatus,
} from "@/lib/staff/attendance";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import type { Branch } from "@/types";
import type { Staff } from "@/types";
import type { StaffAuditRecord } from "@/types/staff-audit";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function makeStaff(
  overrides: Partial<Staff> & Pick<Staff, "id" | "name" | "branch">
): Staff {
  return {
    active: true,
    role: "cashier",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAudit(
  overrides: Partial<StaffAuditRecord> &
    Pick<StaffAuditRecord, "staffId" | "staffName" | "branch" | "action">
): StaffAuditRecord {
  return {
    id: crypto.randomUUID(),
    timestamp: `${overrides.branch === "main" ? "2026-09-13" : "2026-09-13"}T09:00:00.000Z`,
    role: "cashier",
    module: "operations",
    ...overrides,
  };
}

function headerShiftState(
  staff: Staff,
  branch: Branch,
  attendanceDate: string,
  auditRecords: StaffAuditRecord[]
) {
  const status = getStaffAttendanceStatus(
    staff,
    attendanceDate,
    auditRecords,
    branch
  );
  return {
    onShift: status.presence === "on-shift",
    shiftStart: status.lastClockInAt,
  };
}

function closeGuardActiveStaff(
  staff: Staff[],
  branch: Branch,
  businessDate: string,
  auditRecords: StaffAuditRecord[]
) {
  return getActiveStaffAttendance(staff, branch, businessDate, auditRecords);
}

async function main() {
  console.log("Staff shift state consistency verification\n");

  const welcomeCard = readRepo("components/operations/staff/staff-welcome-card.tsx");
  const todayPage = readRepo("app/operations/today/page.tsx");
  const attendanceService = readRepo("lib/server/services/attendance-service.ts");

  recordCheck(
    "A-static: Welcome card resolves attendance from business date",
    welcomeCard.includes("resolveStaffAttendanceDateISO") &&
      welcomeCard.includes("useStaffAttendance(attendanceDate)") &&
      !welcomeCard.includes("useStaffAttendance(today)")
  );

  recordCheck(
    "A-static: Welcome card clock-out uses attendance business date",
    welcomeCard.includes("date: attendanceDate")
  );

  recordCheck(
    "F-static: Today page uses businessDate for attendance hook",
    todayPage.includes("useStaffAttendance(businessDate)")
  );

  recordCheck(
    "C-static: Server branch attendance query expands branch aliases",
    attendanceService.includes("getEquivalentBranchCodes") &&
      attendanceService.includes("branchCode: { in: branchCodes }")
  );

  recordCheck(
    "E-static: Clock-out defaults to open business date when date omitted",
    attendanceService.includes("resolveActiveBusinessDateForBranch")
  );

  const tony = makeStaff({
    id: "tony-id",
    name: "Tony",
    branch: "main",
  });
  const pat = makeStaff({
    id: "pat-id",
    name: "Pat",
    branch: "branch2",
  });
  const businessDate = "2026-09-13";
  const calendarDate = "2026-09-14";

  recordCheck(
    "Attendance date helper prefers business date over calendar date",
    resolveStaffAttendanceDateISO(businessDate, calendarDate) === businessDate
  );

  // A — no active Tony shift
  const noShiftAudit: StaffAuditRecord[] = [
    makeAudit({
      staffId: tony.id,
      staffName: tony.name,
      branch: "main",
      action: AUDIT_ACTIONS.START_SHIFT,
      timestamp: `${businessDate}T08:00:00.000Z`,
    }),
    makeAudit({
      staffId: tony.id,
      staffName: tony.name,
      branch: "main",
      action: AUDIT_ACTIONS.CLOCK_OUT,
      timestamp: `${businessDate}T17:00:00.000Z`,
    }),
  ];

  const headerOff = headerShiftState(tony, "main", businessDate, noShiftAudit);
  const closeOff = closeGuardActiveStaff([tony], "main", businessDate, noShiftAudit);
  recordCheck(
    "A: No active Tony shift — header off shift",
    !headerOff.onShift && headerOff.shiftStart !== null
  );
  recordCheck(
    "A: No active Tony shift — close guard empty",
    closeOff.length === 0
  );

  // B — active Tony shift
  const activeAudit: StaffAuditRecord[] = [
    makeAudit({
      staffId: tony.id,
      staffName: tony.name,
      branch: "kansanga",
      action: AUDIT_ACTIONS.START_SHIFT,
      timestamp: `${businessDate}T08:00:00.000Z`,
    }),
  ];

  const headerOn = headerShiftState(tony, "main", businessDate, activeAudit);
  const closeOn = closeGuardActiveStaff([tony], "main", businessDate, activeAudit);
  recordCheck(
    "B: Active Tony shift — header on shift with start time",
    headerOn.onShift && headerOn.shiftStart?.includes("T08:00:00")
  );
  recordCheck(
    "B: Active Tony shift — close guard lists Tony",
    closeOn.length === 1 && closeOn[0]?.staffName === "Tony"
  );

  // Calendar vs business date mismatch (root cause regression)
  const headerWrongDate = headerShiftState(
    tony,
    "main",
    calendarDate,
    activeAudit
  );
  const attendanceDate = resolveStaffAttendanceDateISO(businessDate, calendarDate);
  const headerFixedDate = headerShiftState(
    tony,
    "main",
    attendanceDate,
    activeAudit
  );
  recordCheck(
    "Root-cause: calendar date alone hides active business-day shift",
    !headerWrongDate.onShift
  );
  recordCheck(
    "Fix: business-date attendance matches close guard",
    headerFixedDate.onShift && closeOn.length === 1
  );

  // C — branch isolation
  const salaamaActiveAudit: StaffAuditRecord[] = [
    makeAudit({
      staffId: pat.id,
      staffName: pat.name,
      branch: "salaama",
      action: AUDIT_ACTIONS.CLOCK_IN,
      timestamp: `${businessDate}T09:30:00.000Z`,
    }),
  ];
  const kansangaClose = closeGuardActiveStaff(
    [tony, pat],
    "main",
    businessDate,
    salaamaActiveAudit
  );
  const salaamaClose = closeGuardActiveStaff(
    [tony, pat],
    "branch2",
    businessDate,
    salaamaActiveAudit
  );
  recordCheck(
    "C: Active Salaama shift does not block Kansanga closing",
    kansangaClose.every((member) => member.staffName !== "Pat")
  );
  recordCheck(
    "C: Active Salaama shift blocks Salaama closing",
    salaamaClose.some((member) => member.staffName === "Pat")
  );
  recordCheck(
    "C: Branch alias codes include kansanga/main pair",
    getEquivalentBranchCodes("main").includes("kansanga")
  );

  // D — business-date isolation
  const historicalAudit: StaffAuditRecord[] = [
    makeAudit({
      staffId: tony.id,
      staffName: tony.name,
      branch: "main",
      action: AUDIT_ACTIONS.START_SHIFT,
      timestamp: "2026-09-10T08:00:00.000Z",
    }),
  ];
  const todayClose = closeGuardActiveStaff(
    [tony],
    "main",
    calendarDate,
    historicalAudit
  );
  recordCheck(
    "D: Historical shift does not block today's closing",
    todayClose.length === 0
  );

  // E — clock-out alignment
  const afterClockOut: StaffAuditRecord[] = [
    ...activeAudit,
    makeAudit({
      staffId: tony.id,
      staffName: tony.name,
      branch: "main",
      action: AUDIT_ACTIONS.CLOCK_OUT,
      timestamp: `${businessDate}T18:00:00.000Z`,
    }),
  ];
  const headerAfterOut = headerShiftState(
    tony,
    "main",
    businessDate,
    afterClockOut
  );
  const closeAfterOut = closeGuardActiveStaff(
    [tony],
    "main",
    businessDate,
    afterClockOut
  );
  recordCheck(
    "E: After Tony clocks out both surfaces agree off shift",
    !headerAfterOut.onShift && closeAfterOut.length === 0
  );

  console.log("\nAll staff shift state consistency checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
