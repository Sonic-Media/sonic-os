# Staff Shift State Consistency Fix

**Branch:** `cursor/staff-shift-state-fix-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `main`

---

## Problem

On Staff Today's Operations, the same staff member (Tony) could see contradictory shift state:

| Surface | Observed |
|---------|----------|
| **Header** (Staff Dashboard) | On Shift: **No**, Shift Start Time: **—** |
| **End of Day close submit** | Error: **Cannot submit closing while staff are still on shift: Tony** |

This blocked closing while the header implied Tony was off shift.

---

## Root cause

Header and close validation used **different date keys** for the same authoritative audit-log shift model.

| Surface | Date key | Scope |
|---------|----------|-------|
| Header (`StaffWelcomeCard`) | Calendar `getTodayISO()` | Current user via `GET /api/staff/me/attendance?date=` |
| Close guard (`getStaffOnShiftAtBranch`) | Resolved **open business date** from `DayClosing` | All active branch staff via branch audit query |

When a branch remains open past midnight (after-midnight business-day rule):

- Tony's `Start Shift` audit row belongs to the **open business date** (e.g. 2026-09-13).
- Header queried attendance for **calendar today** (e.g. 2026-09-14) → no events → **Off Shift**.
- Close guard queried the **business date** → open session without `Clock Out` → **Tony still on shift**.

Secondary issues:

1. **Clock-out** from the header also sent `date: today`, so Tony could not clear a stale session on the business date (`not_on_shift`).
2. **Server branch audit query** used exact `branchCode` only, while client matching expands aliases (`kansanga` ↔ `main`, `salaama` ↔ `branch2`), risking mismatches on Kansanga/Salaama.

Both surfaces already used the same pure functions (`getStaffAttendanceStatus`, `getActiveStaffAttendance`) and the same `AuditLogEntry` source of truth — the bug was **which date and branch filter** each path applied.

---

## Schema changes

**None.**

---

## Production data / environment

**Not touched.** No production database writes, no production environment variable changes.

---

## Exact fix

### 1. `lib/staff/attendance-date.ts` (new)

Shared helper `resolveStaffAttendanceDateISO(businessDate?, calendarDate?)` — prefers persisted open business date over browser calendar date.

### 2. `components/operations/staff/staff-welcome-card.tsx`

- `useStaffAttendance(attendanceDate)` where `attendanceDate = resolveStaffAttendanceDateISO(businessDate, today)`
- Clock-out API uses `date: attendanceDate` (same date close guard uses)

### 3. `app/operations/today/page.tsx`

- Compute `businessDate` before attendance hook
- `useStaffAttendance(businessDate)` so shift gate and workspace header agree

### 4. `lib/server/services/attendance-service.ts`

- `fetchBranchAttendanceAudit()` queries `branchCode IN getEquivalentBranchCodes(branch)` (alias-safe, matches client `matchesBranch()`)
- `recordAttendanceAction()` when `date` omitted: default to open business date via `resolveActiveBusinessDateForBranch()` before falling back to calendar today — fixes clock-out after midnight without explicit date

**Unchanged:** Close-day server guard (`getStaffOnShiftAtBranch` in `submitCloseRequest` / `approveAndCloseDay`) — still enforced server-side.

---

## Files changed

| File | Change |
|------|--------|
| `lib/staff/attendance-date.ts` | Shared business-date resolver for attendance |
| `components/operations/staff/staff-welcome-card.tsx` | Header + clock-out use business date |
| `app/operations/today/page.tsx` | Attendance hook uses `businessDate` |
| `lib/server/services/attendance-service.ts` | Branch alias audit query; business-date default for clock actions |
| `scripts/verify-staff-shift-state-consistency.ts` | Regression verifier (A–F scenarios) |
| `package.json` | `verify:staff-shift-state` script |
| `docs/data-integrity/STAFF-SHIFT-STATE-CONSISTENCY-FIX-REPORT.md` | This report |
| `docs/data-integrity/STAFF-SHIFT-STATE-CONSISTENCY-FIX-REPORT.docx` | DOCX export |

---

## Evidence header and End of Day now agree

Pure-function regression (same audit records, same `businessDate`):

| Scenario | Header (`getStaffAttendanceStatus`) | Close guard (`getActiveStaffAttendance`) |
|----------|--------------------------------------|------------------------------------------|
| Tony clocked out on business date | Off shift | Empty list |
| Tony active on business date | On shift + start time | Lists Tony |
| Calendar date only (bug repro) | Off shift (wrong) | Lists Tony |
| After fix with `resolveStaffAttendanceDateISO` | On shift | Lists Tony — **aligned** |
| Tony clocks out | Off shift | Empty — **aligned** |

Static checks confirm welcome card no longer calls `useStaffAttendance(today)`.

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:staff-shift-state` | **PASS** (17 checks: A–F + static + root-cause repro) |
| `npm run verify:close-request-workflow` | **PASS** (24 checks) |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:close-time-flexibility` | **PASS** (static checks 1–12) |
| `npm run verify:close-day-date` | **PASS** (16 checks) |

## Tests with environment / fixture failures

| Command | Result |
|---------|--------|
| `npm run verify:attendance` | **FAIL** — close submit returned 403 forbidden (cashier lacks approve-close permission); test expects 409 staff_on_shift. Pre-existing test/API mismatch, not caused by this fix. |

## Tests not run

| Test | Reason |
|------|--------|
| Browser E2E on Staff Today's Operations after midnight | Not executed in this agent run |
| Production deployment verification | Out of scope |

---

## CODE PASS/FAIL

**CODE PASS** — Header and clock-out now use the same business-date key as the close guard; server audit query is branch-alias safe.

## TEST PASS/FAIL

**TEST PASS (targeted)** — `verify:staff-shift-state`, close-request workflow, branch isolation, close-time static checks.  
**TEST FAIL (environment)** — `verify:attendance` permission mismatch on close submit endpoint.
