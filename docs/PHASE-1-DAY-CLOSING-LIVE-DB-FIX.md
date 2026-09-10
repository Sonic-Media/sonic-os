# Phase 1 Fix #9 — Day-Closing Gates Must Use Live Database State

**Audit finding:** Medium #11 — Day-closing gates rely on an in-memory cache.

**Status:** PASS

**Branch:** `cursor/day-closing-live-db-b6e7`

---

## ROOT CAUSE

`lib/day-closing/storage.ts` maintained a module-level `cachedClosings` array used as the default source for `isBranchDayOpened`, `isBranchDayClosed`, and related helpers. Client contexts imported these without always passing explicit records, making the in-memory cache appear authoritative for UI gating.

Server-side `assertBranchDayOpenForWrite` only checked whether a day was closed (via PostgreSQL) but did not verify the shop was opened for today's writes.

`DayClosingProvider` updated the UI cache via local upsert after mutations without always re-fetching from PostgreSQL first.

---

## CURRENT DAY-STATE AUTHORITY BEFORE

```
Client contexts → lib/day-closing/storage.ts (cachedClosings default)
Server write gates → isBranchDayClosed() only (PostgreSQL, closed check only)
DayClosingProvider → local upsert after open/close/reopen
```

---

## CURRENT DAY-STATE AUTHORITY AFTER

```
Server write gates → getBranchDayState() (PostgreSQL, every request)
  → closed: reject
  → today + not open: reject (shop_not_opened)
Client UI → storage.ts uiDayClosingsCache (explicitly non-authoritative)
DayClosingProvider → refreshClosingsFromApi() before/after mutations
```

---

## OPEN-DAY FLOW

1. `DayClosingProvider.openDay` refreshes closings from `/api/day-closings` (PostgreSQL)
2. Pre-checks use refreshed UI cache (non-authoritative UX only)
3. `openDayApi` → `day-closings-service.openDay` → `prisma.dayClosing.upsert`
4. On success: refresh closings from API again (sync UI cache from PostgreSQL)
5. On failure: no cache update

---

## CLOSE-DAY FLOW

Same pattern: refresh → pre-check → API persist → refresh from PostgreSQL.

---

## REOPEN-DAY FLOW

Same pattern: refresh → verify closed in DB → API persist → refresh from PostgreSQL.

---

## POSTGRESQL AUTHORITY

- New `getBranchDayState(branch, date)` queries `prisma.dayClosing` directly
- `assertBranchDayOpenForWrite` uses live PostgreSQL state for all mutation gates
- UI cache in `storage.ts` is documented and named `uiDayClosingsCache` — never used on server

---

## BRANCH ISOLATION

- Day state keyed by `branchId_date` in PostgreSQL
- Verified: main and salaama independent; owner branch switch does not cross-contaminate
- Staff API returns only authorized branch closings

---

## CONCURRENCY / RACE PROTECTION

- Each write gate re-queries PostgreSQL at request time (no stale in-process authority)
- Sequential close-then-write test confirms 409 rejection after close persists
- **Limitation:** True multi-process concurrent race testing not practical in verify script; no giant transaction rewrite attempted per requirements

---

## FAILURE BEHAVIOR

- Duplicate open returns 409; PostgreSQL row count unchanged
- API failures do not update UI cache (refresh only on success path after mutation)
- Closed-day expense write returns 409 from live PostgreSQL check

---

## FILES CHANGED

| File | Change |
|------|--------|
| `lib/day-closing/storage.ts` | UI cache explicitly non-authoritative; renamed to `uiDayClosingsCache` |
| `lib/server/day-closing-guards.ts` | `assertBranchDayOpenForWrite` uses `getBranchDayState` |
| `lib/server/services/day-closings-service.ts` | Added `getBranchDayState`, `findDayClosingRow` |
| `context/day-closing-context.tsx` | Refresh from API before/after open/close/reopen |
| `scripts/verify-day-closing-live-db.ts` | 15-check verification script |
| `package.json` | Added `verify:day-closing-live-db` |
| `docs/PHASE-1-DAY-CLOSING-LIVE-DB-FIX.md` | This report |

---

## TESTS RUN

| Command | Result |
|---------|--------|
| `npm run verify:day-closing-live-db` | **15/15 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint on changed files | 1 pre-existing `set-state-in-effect` in day-closing-context; 4 pre-existing unused-var warnings |

---

## PRODUCTION DATA TOUCHED

**NO**

Verification uses random 2019 dates and cleans up test day-closing rows in `finally`.

---

## PHASE 1 FIX #9 RESULT

**PASS**
