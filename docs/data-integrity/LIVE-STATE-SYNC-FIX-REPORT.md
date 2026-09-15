# Live State Synchronization Fix Report

**Branch:** `cursor/live-state-sync-fixes-b6e7`  
**Date:** 2026-09-15  
**Scope:** Targeted bug fixes only — no UI redesign, business rule changes, schema changes, production data changes, or weakened authorization.

---

## Summary

Fixed three production-like state synchronization bugs while preserving the Staff End of Day Movie Revenue input (UGX 0 valid, non-blocking for close).

| Bug | Symptom | Root cause | Fix |
|-----|---------|------------|-----|
| **1 — Clock Out** | UI stayed On Shift = Yes after successful clock out | Clock out merged audit cache but did not re-fetch authoritative attendance; `mergeStaffAuditRecords` did not notify listeners; branch on-shift state not revalidated | Re-fetch attendance after clock out; dispatch `AUDIT_LOG_UPDATED_EVENT`; revalidate branch on-shift via new API/hook; refresh staff operations |
| **2 — Owner approval** | "You don't have permission to perform this closing action" on Approve & Close Day | `upsertDailyOperation` always called `assertOwnerCannotEditTodayOperations`, blocking owner during approve-close daily operation sync | Add `allowOwnerManagementClose` option; pass from `syncClosedDayDailyOperation`; refresh dashboard after approve |
| **3 — Branch switch** | Branch-scoped data stale until browser refresh | Sales, entries, and purchasing contexts fetched before `branchLoaded` resolved and lacked fetch-generation guards | Gate on `branchLoaded`; add `beginFetchGeneration` / `isCurrentFetchGeneration` pattern (matching expenses module) |

---

## Bug 1 — Staff Clock Out

### Root cause

1. `StaffWelcomeCard.handleClockOut` called `clockOutApi` and `mergeStaffAuditRecords` but did not re-fetch server attendance afterward.
2. `useStaffAttendance` listens to `AUDIT_LOG_UPDATED_EVENT`, but `mergeStaffAuditRecords` previously did not dispatch that event.
3. End of Day close guard uses server `getStaffOnShiftAtBranch`; staff UI had no read path to that authoritative state after clock out.
4. Stale `staff_on_shift` close-flow errors were not cleared when server state changed.

### Files changed

| File | Change |
|------|--------|
| `components/operations/staff/staff-welcome-card.tsx` | Use business date; re-fetch attendance after clock out; `onClockOutComplete` callback |
| `components/operations/staff/staff-operations-workspace.tsx` | Wire `handleClockOutComplete`; revalidate branch on-shift; clear stale close errors |
| `components/operations/staff-attendance-bar.tsx` | Re-fetch attendance after clock out |
| `lib/staff/audit.ts` | Dispatch `AUDIT_LOG_UPDATED_EVENT` from `mergeStaffAuditRecords` |
| `lib/api/staff-attendance.ts` | Add `fetchBranchStaffOnShiftApi` |
| `app/api/staff/attendance/on-shift/route.ts` | **New** read-only on-shift endpoint using existing server guard logic |
| `hooks/use-branch-staff-on-shift.ts` | **New** hook for authoritative branch on-shift list |
| `hooks/use-staff-operations-refresh.ts` | Export `refreshAll`; call after clock out / close request |
| `lib/ux/stale-close-error.ts` | **New** helper to clear stale `staff_on_shift` errors |
| `hooks/use-branch-state.ts` | Use active business date for owner attendance KPIs |

### Expected behavior after fix

- Clock Out succeeds → On Shift changes to No without refresh
- Clock Out button hides
- End of Day sees user as clocked out immediately
- Server remains source of truth (re-fetch after mutation)

---

## Bug 2 — Owner Closing Request Approval

### Root cause

When owner clicks **Approve & Close Day**, the server runs `syncClosedDayDailyOperation` → `upsertDailyOperation`. That function unconditionally called `assertOwnerCannotEditTodayOperations(session, entry.date)`, which rejects owner writes to today's operational records — even during the authorized approve-close sync path.

This is **not** a missing role check; the owner passed role authorization but was blocked by the today-operations edit guard on the wrong code path.

### Files changed

| File | Change |
|------|--------|
| `lib/server/services/daily-operations-service.ts` | Add `allowOwnerManagementClose?: boolean` to `upsertDailyOperation` |
| `lib/day-closing/sync-daily-operation.ts` | Pass `{ allowCloseRequested: true, allowOwnerManagementClose: true }` |
| `components/dashboard/closing-requests/closing-requests-panel.tsx` | Fix stale `useMemo` deps (`closings`); call `refreshAll()` after successful approve |

### Authorization preserved

- Staff still cannot approve (verified)
- Branch isolation preserved (Kansanga request closes Kansanga only)
- Owner still cannot edit today's operational records directly outside approve-close
- Server validates against persisted closing request, not client branch state alone

---

## Bug 3 — Global Branch Switcher

### Root cause

`BranchProvider` resolves authoritative branch asynchronously (`selectionLoaded`). Expenses and staff-payments contexts already waited for `branchLoaded` and used fetch-generation guards. **Sales, entries, and purchasing contexts did not**, so they could:

1. Fetch with default `main` before server preference resolved
2. Apply stale in-flight responses after a branch switch

### Files changed

| File | Change |
|------|--------|
| `context/sales-context.tsx` | Wait for `branchLoaded`; add fetch generation guards |
| `context/entries-context.tsx` | Wait for `branchLoaded`; add fetch generation guards |
| `context/purchasing-context.tsx` | Wait for `branchLoaded`; add fetch generation guards |

Existing branch-scoped load helpers (`lib/context/branch-scoped-load.ts`) and `useManagementDashboardRefresh` / `useAppDataRefresh` were reused — no full page reload.

---

## Movie Revenue preservation

Verified unchanged:

- Movie Revenue input present in Staff End of Day card
- UGX 0 valid
- Separate from accessory revenue
- Non-blocking for close workflow

---

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:staff-movie-revenue-eod` | **PASS** (9/9) |
| `npm run verify:owner-closing-approval-auth` | **PASS** (9/9) |
| `npm run verify:closing-confirm-auto-refresh` | **PASS** (9/9) |
| `npm run verify:day-close-state-sync` | **PASS** static (5/5); live clock-out check **SKIPPED** (fixture: on-shift count=0 before clock out) |
| `npm run verify:close-request-workflow` | **PASS** (24/24) |
| `npm run verify:closing-request-approval-flow` | **PASS** (A–J) |
| `npm run verify:branch-switch-refresh` | **PARTIAL** — checks 1–11 **PASS**; check 12 **FAIL** (pre-existing: `/api/stock/products` is branch-filtered by `branchId`, so product count can differ across branches; verifier assumes global catalog) |
| `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:auth-gated-loading` | **PASS** (21/21) |

---

## Manual tests

**Not performed** in this Cloud Agent session — no staff credentials with an active open business day for live clock-out UI walkthrough; no browser walkthrough of owner Mission Control after deploy.

### Manual test checklist (for owner after deploy)

1. Open Home — confirm branch displays immediately
2. Switch Kansanga → Salaama — all branch-scoped data updates without refresh
3. Switch Salaama → Kansanga — same
4. Find pending closing request → Review → Approve & Close Day — no permission error; request disappears; Home updates
5. Login as staff → On Shift = Yes → Clock Out → On Shift = No immediately
6. Staff Today's Operations → End of Day → Movie Revenue input present; UGX 0 accepted; does not block closing

---

## Remaining concerns

1. **Branch-switch verifier check 12** assertion may need update to compare product IDs or use a global catalog endpoint — current API filters products by active branch.
2. **Live clock-out E2E** skipped in `verify:day-close-state-sync` due to test fixture state; static/code-path checks passed.
3. **Production branch codes** remain `main` / `branch2` with UI alias `salaama` — no database branch record changes in this fix.

---

## Safety confirmation

- No schema changes
- No production data changes
- No authorization weakening
- No UI redesign
- Movie Revenue EOD fix preserved
