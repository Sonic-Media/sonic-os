# Close Shop — Time Restriction Audit & Close Failure Diagnostic Fix

**Date:** 2026-09-12 (UTC)  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**PR:** #39 (OPEN — not merged)  
**Prior UX commit:** `962b21924c168c326b14383743b37969056c84d6`

---

## Executive Summary

Live Preview Close Day could reach **Ready to Close** with correct confirmation data (branch, business date, totals) yet fail with the generic message:

> We couldn't close the business day. Check your connection and try again.

Tracing the full close path found **no server-side time-of-day restriction on closing a business day**. `SHOP_CLOSE_HOUR` / opening-hours logic applies only to **Open Shop**, not Close Day.

The generic error was caused by **error-handling defects** that masked real server/business-rule failures, plus one server bug in the staff-on-shift guard date.

---

## Root Cause (Exact)

### 1. Error masking → generic “connection” fallback (primary)

| Layer | Issue |
|-------|-------|
| `lib/data-source/context-api.ts` | `loadFromApi()` wrapped all `ApiError` instances in `DataSourceUnavailableError`, **discarding `error.code`**. |
| `context/day-closing-context.tsx` | Catch blocks used `getDataSourceErrorMessage(error)` + `toStaffFacingError(message)` — **code never reached `mapCloseDayError`**. |
| `components/operations/staff/staff-operations-workspace.tsx` | `handleCloseDay` read stale React `saveError` state after `handleSubmitRequest()` returned `false`, often falling through to the connection fallback. |
| `context/day-closing-context.tsx` | After a **successful** `closeDayApi`, failures in `refreshClosingsFromApi()` or `refreshEntries()` were caught by the outer catch and reported as close failure (Path B variant from prior diagnostic). |

Any server 500 (`Unexpected server error.`), empty message, or interrupted pre-close save therefore surfaced as the connection fallback even when the business day was valid to close.

### 2. Staff-on-shift guard used client hint date (secondary)

`closeDay()` in `lib/server/services/day-closings-service.ts` called:

```typescript
getStaffOnShiftAtBranch(branch, parsed.date)
```

instead of the **resolved `businessDate`** from PostgreSQL. After midnight or with a stale client hint, attendance could be evaluated against the wrong date.

### 3. Time-of-day restriction audit

**No close-time restriction exists** in:

- `lib/server/services/day-closings-service.ts` (`closeDay`)
- `context/day-closing-context.tsx`
- `hooks/use-staff-close-day.ts`
- Close Day UI components

`lib/operations/opening-hours.ts` (`SHOP_CLOSE_HOUR = 23`) is imported only by **Open Shop** UI (`open-shop-page.tsx`, `shop-schedule-countdown.tsx`). It does **not** gate Close Day.

**Nothing removed** from close path — there was no close-time rule to delete. Policy confirmed: **close allowed at any clock time** when the business day is open, user is authorized, and other business rules pass.

---

## Close Day Path (Traced)

```
StaffEndOfDayCard → staff-operations-workspace.handleCloseDay
  → handleSubmitRequest (upsert draft entry)
  → useStaffCloseDay.closeStaffDay
  → day-closing-context.closeDay
    → persistCloseDayStaffPayouts (client)
    → closeDayApi → POST /api/day-closings
  → day-closings-service.closeDay
    → assertCanCloseDay
    → resolveOpenBusinessDateForClose
    → getStaffOnShiftAtBranch (businessDate)
    → syncClosedDayDailyOperation → upsertDailyOperation
    → prisma.dayClosing.upsert (status closed, closedAt = now)
```

---

## Files Changed

| File | Change |
|------|--------|
| `lib/data-source/context-api.ts` | Preserve `ApiError` through `loadFromApi` (do not wrap) |
| `lib/ux/close-day-messages.ts` | `validation_error` mapping; `toCloseDayFacingError` uses codes |
| `lib/ux/staff-messages.ts` | Close-day context delegates to `toCloseDayFacingError` for unknown errors |
| `context/day-closing-context.tsx` | Use `toCloseDayFacingError`; post-close refresh failures non-fatal |
| `hooks/use-entry-form.ts` | `SubmitRequestResult` returns `{ success, error? }`; no stale saveError |
| `components/operations/staff/staff-operations-workspace.tsx` | Use returned save error in close flow |
| `components/operations/operations-workspace.tsx` | Adapt to `SubmitRequestResult` |
| `lib/server/services/day-closings-service.ts` | Staff-on-shift check uses `businessDate` |
| `scripts/verify-close-time-flexibility.ts` | New certification script (24 checks) |
| `package.json` | `verify:close-time-flexibility` script |
| `docs/data-integrity/CLOSE-SHOP-TIME-AND-DIAGNOSTIC-FIX.md` | This report |
| `docs/data-integrity/CLOSE-SHOP-TIME-AND-DIAGNOSTIC-FIX.docx` | Matching Word report |

---

## Time Restriction Removed

**None on Close Day** — audit confirmed no close-hour gate existed. Opening-hours (`9:00 AM – 11:00 PM`) remains **open-shop only** and was not modified for this fix.

---

## Protections Intentionally Preserved

- Branch authorization / isolation
- One open business day per branch
- `previous_business_day_open` guard
- Closed-day mutation protection
- Persisted business-date resolution (`resolveOpenBusinessDateForClose`, `getActiveOpenDayRecord`)
- After-midnight closing behavior (business date = open date; `closedAt` = actual timestamp)
- Staff authorization / permissions (`assertCanCloseDay`)
- Payout sequencing (`persistCloseDayStaffPayouts`)
- Server-side validation
- Transaction persistence
- Zero-revenue closing
- No automatic midnight close
- No Prisma schema changes
- No migrations / `db push`
- No production data or environment variable changes

---

## Tests Run (this session)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:close-time-flexibility` | **PASS** (24/24) |
| `npm run verify:close-day-date` | **PASS** (16/16) |
| `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:close-day-payouts` | **PASS** |

### Close-time certification coverage

1. Close at normal evening time → **PASS**
2. Close at 12:30 AM (after-midnight hint) → **PASS**
3. Close at 2:00 AM / 5:00 AM — no server hour gate (static + same API path) → **PASS**
4. Closing uses persisted business date → **PASS**
5. Previous-business-day-open guard → **PASS**
6. Branch isolation → **PASS**
7. Unauthorized close (owner) → **PASS**
8. Already-closed day → **PASS** (400 `shop_not_opened` — no open day to close)
9. Zero-revenue close → **PASS**
10. Error code preservation (`staff_on_shift`, `previous_business_day_open`) → **PASS**

---

## Deployment / Commit

- **Branch:** `cursor/close-shop-ux-fix-b6e7`
- **Fix commit:** `74c5c62` (diagnostic + error propagation)
- **Prior UX commit:** `962b219` (Close Shop UI)
- **PR #39:** Updated, remains **OPEN — not merged**
- **Preview:** Vercel Preview from branch push (unchanged merge policy)

---

## Production Safety Confirmation

| Item | Status |
|------|--------|
| Database schema changed | **NO** |
| Migration created | **NO** |
| `prisma db push` | **NO** |
| Production data modified | **NO** |
| Production env vars modified | **NO** |
| PR #39 merged | **NO** |
