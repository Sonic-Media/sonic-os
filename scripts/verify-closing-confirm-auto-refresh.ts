/**
 * Regression checks for post-mutation UI refresh/revalidation after closing actions.
 * Static source analysis + audit cache behavior.
 */
import { readFile } from "node:fs/promises";
import { mergeStaffAuditRecords, getStaffAuditRecords } from "@/lib/staff/audit";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";

let passed = 0;
let failed = 0;

function recordCheck(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function readSource(path: string): Promise<string> {
  return readFile(path, "utf8");
}

async function main(): Promise<void> {
  console.log("Closing confirmation auto-refresh verification\n");

  const panelSource = await readSource(
    "components/dashboard/closing-requests/closing-requests-panel.tsx"
  );
  const branchStateSource = await readSource("hooks/use-branch-state.ts");
  const staffRefreshSource = await readSource(
    "hooks/use-staff-operations-refresh.ts"
  );
  const staffWorkspaceSource = await readSource(
    "components/operations/staff/staff-operations-workspace.tsx"
  );
  const auditSource = await readSource("lib/staff/audit.ts");
  const closeWorkspaceSource = await readSource(
    "components/operations/close-day-workspace.tsx"
  );
  const welcomeSource = await readSource(
    "components/operations/staff/staff-welcome-card.tsx"
  );

  recordCheck(
    "Owner pending list recomputes when closings change",
    panelSource.includes("closings") &&
      /\[closings,\s*getCloseRequestedRecords\]/.test(panelSource),
    "closing-requests-panel useMemo deps"
  );

  recordCheck(
    "Owner approve success triggers dashboard refresh",
    panelSource.includes("await refreshAll()") &&
      panelSource.includes("if (result.success)"),
    "handleConfirmApprove"
  );

  recordCheck(
    "Owner branch state recomputes when closings change",
    branchStateSource.includes("closings,") &&
      branchStateSource.includes("const {\n    closings,"),
    "use-branch-state useMemo deps"
  );

  recordCheck(
    "Staff operations refresh exports refreshAll",
    staffRefreshSource.includes("return { refreshAll }") &&
      staffRefreshSource.includes("refreshAuditLog"),
    "use-staff-operations-refresh"
  );

  recordCheck(
    "Staff submit close request refreshes after success",
    staffWorkspaceSource.includes("refreshStaffOperations()") &&
      staffWorkspaceSource.includes("if (result.success)") &&
      !staffWorkspaceSource.includes("refreshBranchStaffOnShift()"),
    "handleCloseDay"
  );

  recordCheck(
    "Staff audit cache merge notifies attendance listeners",
    auditSource.includes("mergeStaffAuditRecords") &&
      auditSource.includes("AUDIT_LOG_UPDATED_EVENT"),
    "lib/staff/audit.ts"
  );

  recordCheck(
    "Legacy close workspace refreshes after successful approve",
    closeWorkspaceSource.includes("await refreshAll()") &&
      closeWorkspaceSource.includes("if (result.record)"),
    "close-day-workspace handleCloseDay"
  );

  recordCheck(
    "Staff welcome card uses business date for attendance",
    welcomeSource.includes("useStaffAttendance(resolvedDate)"),
    "staff-welcome-card"
  );

  const listeners = new Map<string, Set<() => void>>();
  const mockWindow = {
    addEventListener(type: string, listener: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: { type: string }) {
      listeners.get(event.type)?.forEach((listener) => listener());
      return true;
    },
  };

  const globalWindow = globalThis as typeof globalThis & {
    window?: typeof mockWindow;
  };
  globalWindow.window = mockWindow;

  let eventFired = false;
  function onAuditUpdated() {
    eventFired = true;
  }
  mockWindow.addEventListener(AUDIT_LOG_UPDATED_EVENT, onAuditUpdated);

  mergeStaffAuditRecords([
    {
      id: "refresh-test-clock-in",
      timestamp: new Date().toISOString(),
      staffId: "staff-test",
      staffName: "Test Staff",
      role: "cashier",
      branch: "main",
      action: "Clock In",
      module: "attendance",
    },
  ]);

  mockWindow.removeEventListener(AUDIT_LOG_UPDATED_EVENT, onAuditUpdated);

  recordCheck(
    "mergeStaffAuditRecords dispatches audit update event",
    eventFired && getStaffAuditRecords().some((r) => r.id === "refresh-test-clock-in"),
    "runtime event dispatch"
  );

  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed, ${passed} passed.`);
    process.exit(1);
  }

  console.log(`All ${passed} closing confirmation auto-refresh checks passed.`);
}

void main();
