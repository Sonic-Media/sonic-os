# Day Close / Clock Out State Synchronization Fix

**Branch:** `cursor/day-close-state-sync-b6e7`  
**Date:** 2026-09-14  
**Scope:** Targeted mutation → revalidation fix only (no business logic, schema, or production data changes)

---

## Problem

After successful operational mutations, different UI surfaces could show contradictory state without a manual browser refresh.

**Observed evidence (manual testing on active business day):**

1. Staff **Clock Out** succeeded; header showed **On Shift: No**.
2. End of Day still displayed stale error: *"Cannot submit closing while staff are still on shift: Fazil"*.
3. Owner **Approve & Close Day** succeeded but Mission Control did not always reflect post-close state until reload.

Manual reproduction is currently blocked because the test business day is already closed. Fix is based on observed evidence plus code-path analysis.

---

## Root cause

Three separate stale-state mechanisms:

### 1. Stale close-flow error banner (primary Clock Out / EOD mismatch)

`closeFlowError` in `StaffOperationsWorkspace` was set when a prior close-request attempt failed with the server’s `staff_on_shift` message. **Clock Out did not revalidate branch on-shift state or clear that error**, so the End of Day banner could contradict the header even after the server no longer blocked closing.

### 2. Header vs close-guard data sources diverged

- Header **On Shift** used client attendance cache (`useStaffAttendance` / `mergeStaffAuditRecords`).
- Close guard uses **`getStaffOnShiftAtBranch()`** on the server (all branch staff, authoritative DB audit).

Staff UI had no read path to the same server function the close guard uses.

### 3. Owner dashboard attendance date + memo staleness

- `useBranchState` called `useStaffAttendance(today)` instead of the **active business date**, so staff KPIs could lag after close/after midnight.
- (Previously fixed) `ClosingRequestsPanel` / `useBranchState` memo deps omitted `closings`; owner approve refresh was added but attendance date remained wrong.

---

## Investigation findings

| Flow | Mutation | Data source | Gap |
|------|----------|-------------|-----|
| Clock Out | `POST /api/staff/attendance` | Self attendance cache | No branch on-shift revalidation; stale `closeFlowError` |
| Submit close request | `submitCloseRequest` | Day closing context | Refresh existed; error clearing incomplete |
| Owner approve | `approveAndClose` | Context + dashboard hooks | Needed `refreshAll()` + `closings` memo deps + business-date attendance |

Existing mechanisms reused: context `refresh*` methods, `useAppDataRefresh().refreshAll()`, `fetchStaffAttendance`, `AUDIT_LOG_UPDATED_EVENT`.

---

## Exact fix

| File | Change |
|------|--------|
| `app/api/staff/attendance/on-shift/route.ts` | **New** read-only GET using existing `getStaffOnShiftAtBranch` + branch auth |
| `lib/api/staff-attendance.ts` | `fetchBranchStaffOnShiftApi` |
| `hooks/use-branch-staff-on-shift.ts` | **New** hook — authoritative branch on-shift list |
| `lib/ux/stale-close-error.ts` | **New** helper to clear stale `staff_on_shift` errors when server list empty |
| `components/operations/staff/staff-welcome-card.tsx` | Clock out uses business date; re-fetch self attendance; `onClockOutComplete` callback |
| `components/operations/staff/staff-operations-workspace.tsx` | Revalidate on clock out / close submit; clear stale errors from server on-shift state |
| `components/operations/staff-attendance-bar.tsx` | Re-fetch self attendance after clock out |
| `hooks/use-branch-state.ts` | Use active **business date** for attendance KPIs |
| `scripts/verify-day-close-state-sync.ts` | **New** regression verifier |
| `scripts/verify-closing-confirm-auto-refresh.ts` | Updated close-submit refresh assertion |

**Unchanged:** DayClosing rules, close guards, authorization, financial calculations, schema, production data.

---

## Revalidation mechanism

| Event | Revalidation |
|-------|----------------|
| Clock Out success | `fetchStaffAttendance(businessDate)` → `mergeStaffAuditRecords`; `refreshStaffOperations()`; `refreshBranchStaffOnShift()`; clear stale `staff_on_shift` error when server list empty |
| Submit closing request success | `refreshStaffOperations()` + `refreshBranchStaffOnShift()` |
| Owner approve success | Existing `refreshAll()` after success + `closings` in memo deps |

No new global state library. Server/database remains authoritative.

---

## Behavior by flow

### A. Staff Clock Out

Persists clock-out unchanged. Then revalidates self attendance + branch on-shift API (same logic as close guard). Stale “staff still on shift” banner clears when server reports zero on-shift staff.

### B. Closing request submission

On success, refreshes closings/entries/audit/sales/payments and branch on-shift list.

### C. Owner Approve & Close Day

On success, `refreshAll()` refreshes closings, entries, audit, expenses, sales, purchases, payments; pending list recomputes via `closings` dependency; branch KPIs use business-date attendance.

---

## Automated tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:day-close-state-sync` | **PASS** (5 static); live flow **SKIP** (fixture date/audit alignment) |
| `npm run verify:closing-confirm-auto-refresh` | **PASS** (9) |
| `npm run verify:close-request-workflow` | **PASS** (24) |
| `npm run verify:close-day-date` | **PASS** (16) |
| `npm run verify:final-open-day-guard` | **PASS** (10) |
| `npm run verify:owner-closing-approval-auth` | **PASS** |

## Manual tests

| Test | Status |
|------|--------|
| TEST 1–6 (user manual plan) | **NOT RUN** — active business day already closed; no production data mutation |

---

## Limitations

- Live verifier open-day fixture did not align historical business dates with attendance audit timestamps in this environment (live block skipped, static + other live suites pass).
- If another branch staff member remains genuinely on shift, the server error correctly persists until they clock out.

---

## Confirmations

- **Business logic changed:** No  
- **Schema/migrations changed:** No  
- **Production data modified:** No  

---

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS** (automated); manual tests **NOT RUN**
