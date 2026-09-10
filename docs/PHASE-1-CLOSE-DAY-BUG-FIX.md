# PHASE 1 CLOSE-DAY BUG FIX REPORT

**STATUS: PASS**

## BUG A — BUSINESS DATE ROLLOVER

**BEFORE:** Close Day used a fresh `getTodayISO()` (client) and the client-supplied `input.date` for open/closed checks. After midnight, the calendar date advanced (e.g. `2026-09-11`) while the persisted open `DayClosing.date` remained the prior business day (`2026-09-10`). Client pre-checks failed with "Start today's shift before closing the day."

**AFTER:** Both client and server resolve the active open business day from PostgreSQL-backed records. Close Day uses `getActiveOpenDayRecord()` / `resolveOpenBusinessDateForClose()` to determine the persisted `DayClosing.date` being closed. Calendar date may differ; business date does not.

**BUSINESS DATE SOURCE:** Earliest open `DayClosing` for the authorized branch (`status=open` with `openedAt` or `reopenedAt`), from PostgreSQL on the server and from the API-refreshed closings cache on the client.

**AFTER-MIDNIGHT BEHAVIOR:** Open `2019-06-20`, close with hint `2019-06-21` → closes `2019-06-20`. No spurious `2019-06-21` DayClosing created. Verified in `npm run verify:close-day-date` checks 7–8.

## BUG B — POST-CLOSE DUPLICATE WRITE

**BEFORE:** After successful `closeDayApi()`, the client called `upsertEntry(buildClosedDayDailyOperationEntry(...))`. Server had already synced the completed DailyOperation inside `closeDay()` → `syncClosedDayDailyOperation()`. The redundant write hit `assertBranchDayOpenForWrite()` → 409 `day_closed` → UI reported failure despite PostgreSQL showing the day closed.

**AFTER:** On `closeDayApi()` success, client refreshes closings and entries only. No post-close `upsertEntry()`. Server remains sole authority for the completed DailyOperation.

**SERVER CLOSE RESULT:** `closeDay()` calls `syncClosedDayDailyOperation()` then sets `DayClosing.status = "closed"`.

**CLIENT CLOSE RESULT:** `closeDayApi()` → `refreshClosingsFromApi()` → `refreshEntries()` → success.

## STAFF PAYOUT SEQUENCING

Preserved Fix #3 order: validate → `recordStaffPayment()` for selected payouts → `closeDayApi()` → refresh → success. Payouts use resolved `businessDate`, not calendar date.

## BRANCH ISOLATION

Preserved. `getBranchIdForSession()` authorizes branch on server close. Salaama cannot close Kansanga's day (403). Kansanga cannot close Salaama's day (403). Verified checks 14–15.

## POSTGRESQL AUTHORITY

Preserved from Fix #9. No localStorage authority. Client cache refreshed from API; server resolves open business date from PostgreSQL.

## SAME-DAY TEST

Open `2019-06-10`, close `2019-06-10` → `2019-06-10` CLOSED. Check 6 PASS.

## AFTER-MIDNIGHT TEST

Open `2019-06-20`, close hint `2019-06-21` → `2019-06-20` CLOSED, no `2019-06-21` record. Checks 7–8 PASS.

## POST-CLOSE WRITE TEST

Close succeeds; server persists completed DailyOperation; redundant daily-operations POST correctly rejected 409; client flow has no post-close `upsertEntry`. Checks 3, 10–12 PASS.

## FAILURE TEST

Close without open → 400 failure; day remains unopened. Check 13 PASS.

## FILES CHANGED

- `lib/day-closing/business-date.ts` (new)
- `lib/day-closing/storage.ts`
- `lib/server/services/day-closings-service.ts`
- `context/day-closing-context.tsx`
- `components/operations/close-day-workspace.tsx`
- `hooks/use-staff-close-day.ts`
- `scripts/verify-close-day-date-consistency.ts` (new)
- `package.json`
- `docs/PHASE-1-CLOSE-DAY-BUG-FIX.md`

**SCHEMA CHANGED: NO**

**MIGRATIONS CHANGED: NO**

**PRODUCTION DATA TOUCHED: NO**

**TYPESCRIPT: PASS**

**BUILD: PASS**

**ESLINT: PASS (with pre-existing warnings only on changed files — `set-state-in-effect` in auth logout path and branch-switch reset; not introduced by this fix)**

## TEST RESULTS

```
npm run verify:close-day-date — 16/16 PASS
npx tsc --noEmit — PASS
npm run build — PASS
```

## FINAL RESULT

**PASS**
