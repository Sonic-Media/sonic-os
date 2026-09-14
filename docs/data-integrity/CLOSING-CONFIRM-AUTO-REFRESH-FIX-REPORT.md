# Closing Confirmation Auto-Refresh Fix

**Branch:** `cursor/closing-confirm-auto-refresh-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `cursor/owner-closing-approval-auth-b6e7`

---

## Problem

After a successful owner **Approve & Close Day** action (and some staff Today's Operations actions), the underlying mutation succeeded but the UI could remain stale until a manual browser reload. Examples included:

- Pending closing requests still visible on Home/Mission Control
- Branch status / KPI cards still showing `close_requested`
- Staff header still showing **On Shift: Yes** after clock out
- Stale shift / closing messages such as "Today's shift has already been completed."

---

## Root cause

Two separate issues:

### 1. Stale derived UI from incorrect `useMemo` dependencies

`ClosingRequestsPanel` and `useBranchState` memoized lists/state using stable getter callbacks (`getCloseRequestedRecords`, `getActiveOpenRecord`, etc.) **without** including the `closings` context array in dependency arrays.

Those getters read `closingsRef.current`, so when `refreshClosings()` updated context state after a successful approve-close, React re-rendered consumers but **`useMemo` returned cached values**. The UI appeared unchanged until a full remount/reload.

### 2. Missing post-success revalidation and attendance event dispatch

- Owner approve success closed the modal but did not trigger a consolidated dashboard refresh beyond what `approveAndClose()` already did internally (closings + entries only).
- Staff clock out called `mergeStaffAuditRecords()` which updated the in-memory cache **without** dispatching `AUDIT_LOG_UPDATED_EVENT`, so `useStaffAttendance` did not recompute until a refetch or reload.
- Staff submit closing request succeeded at the API layer but did not explicitly revalidate Today's Operations views after success (relying on eventual 12s polling).

---

## Exact fix (minimal)

| File | Change |
|------|--------|
| `components/dashboard/closing-requests/closing-requests-panel.tsx` | Add `closings` to pending-list `useMemo` deps; call `useAppDataRefresh().refreshAll()` **after** successful approve |
| `hooks/use-branch-state.ts` | Add `closings` to branch-state `useMemo` deps |
| `lib/staff/audit.ts` | Dispatch `AUDIT_LOG_UPDATED_EVENT` from `mergeStaffAuditRecords()` |
| `hooks/use-staff-operations-refresh.ts` | Export `refreshAll`; include audit/sales/payments in staff refresh bundle |
| `components/operations/staff/staff-operations-workspace.tsx` | Call `refreshStaffOperations()` after successful close-request submit and daily-wage record |
| `components/operations/staff/staff-welcome-card.tsx` | Use business `resolvedDate` for `useStaffAttendance` |
| `components/operations/close-day-workspace.tsx` | Call `refreshAll()` after successful legacy approve-close |
| `scripts/verify-closing-confirm-auto-refresh.ts` | Static + runtime regression verifier |
| `package.json` | `verify:closing-confirm-auto-refresh` script |

**Mechanism:** Existing context `refresh*` methods (`refreshClosings`, `refreshEntries`, `refreshAuditLog`, etc.) via `useAppDataRefresh` / `useStaffOperationsRefresh`. No new global state, no `setTimeout` fake refresh, no full page reload. Refresh runs **only after confirmed mutation success**.

**Unchanged:** closing business logic, authorization, financial calculations, branch isolation, business-date semantics, schema.

---

## Flows covered

| Flow | Post-success refresh |
|------|---------------------|
| Owner Approve & Close Day (Mission Control) | `refreshAll()` + fixed pending-list memo |
| Owner Approve & Close Day (legacy workspace) | `refreshAll()` |
| Staff Submit Closing Request | `refreshStaffOperations()` |
| Staff Clock Out | `AUDIT_LOG_UPDATED_EVENT` via `mergeStaffAuditRecords` |
| Staff Record Daily Wage | `refreshStaffOperations()` on `onRecorded` |
| Staff Record Sale | Existing `completeSale()` → `refreshSales` (unchanged) |
| Staff Add Expense / Movie Revenue | Existing entry autosave → entries context (unchanged) |

---

## Security / data

**Schema changes:** None  
**Production data modified:** No

---

## Tests run

| Command | Result | Notes |
|---------|--------|-------|
| `npx tsc --noEmit` | **PASS** | |
| `npm run verify:closing-confirm-auto-refresh` | **PASS** | 9 checks |
| `npm run verify:close-request-workflow` | **PASS** | 24 checks |
| `npm run verify:close-day-date` | **PASS** | 16 checks |
| `npm run verify:final-open-day-guard` | **PASS** | 10 checks |
| `npm run verify:branch-isolation` | **PASS** | |
| `npm run verify:owner-closing-approval-auth` | **PASS** | |
| `npm run verify:audit-cache-integrity` | **PASS** | |
| `npm run verify:close-day-payouts` | **PASS** | |
| `npm run verify:attendance` | **FAIL** | **Environment/fixture** — `previous_business_day_open` blocked open-day setup in local DB |

## Tests not run

| Test | Reason |
|------|--------|
| Manual browser E2E on Preview/production | Not executed in this agent run |

---

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS** (all code verifiers; one environment/fixture failure on `verify:attendance`)
