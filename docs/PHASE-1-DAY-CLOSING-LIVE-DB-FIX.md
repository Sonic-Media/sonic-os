# PHASE 1 FIX #9 REPORT

**Medium Finding #11 — Day-Closing Gates Rely on In-Memory Cache Instead of Live PostgreSQL State**

| Field | Value |
|-------|-------|
| **STATUS** | **PASS** |
| **Branch** | `cursor/day-closing-live-db-b6e7` |
| **PR** | https://github.com/Sonic-Media/sonic-os/pull/17 |
| **Production data touched** | **NO** |

---

## ROOT CAUSE

`lib/day-closing/storage.ts` maintained a module-level in-memory array (`cachedClosings`) used as the default source for `isBranchDayOpened`, `isBranchDayClosed`, and related helpers. Client contexts imported these functions without always passing explicit records, so the in-memory cache acted as authoritative business state for UI gating.

Server-side `assertBranchDayOpenForWrite` only checked whether a day was **closed** via PostgreSQL; it did not verify the shop was **opened** for today's writes. After a server restart, cold start, or stale client cache, Sonic OS could disagree with PostgreSQL about whether a branch day was open or closed.

`DayClosingProvider` also updated the in-memory cache via local upsert after mutations without always re-fetching from PostgreSQL first.

---

## AUTHORITATIVE DATABASE STATE

PostgreSQL `DayClosing` model (`@@unique([branchId, date])`):

| Field | Meaning |
|-------|---------|
| `status` | `"open"` or `"closed"` |
| `openedAt` / `openedBy` | Shop opened for the business date |
| `reopenedAt` / `reopenedBy` | Owner/manager reopened a closed day |
| `closedAt` / `closedBy` | Day closed |
| `branchId` + `date` | Branch-scoped business date (not "latest DailyOperation") |

Derived states via `getBranchDayState(branch, date)`:

| State | PostgreSQL condition |
|-------|---------------------|
| `closed` | `status === "closed"` |
| `open` | `status === "open"` AND (`openedAt` OR `reopenedAt`) |
| `waiting` | No row, or open without opened/reopened timestamp |

---

## BEFORE

```
Client contexts → lib/day-closing/storage.ts (cachedClosings default = authority)
Server write gates → isBranchDayClosed() only (PostgreSQL, closed check only)
DayClosingProvider → local upsert after open/close/reopen (stale cache risk)
```

---

## AFTER

```
Server write gates → getBranchDayState() (PostgreSQL, every request)
  → closed: reject (409 day_closed)
  → today + not open: reject (409 shop_not_opened)
Client UI → uiDayClosingsCache (explicitly non-authoritative UX mirror)
DayClosingProvider → refreshClosingsFromApi() before/after mutations
```

---

## DAY OPEN CHECK

**Server (authoritative):** `getBranchDayState(branch, date) === "open"` queries `prisma.dayClosing.findUnique({ branchId_date })`.

**Client (UX only):** `DayClosingProvider` reads from `closingsRef.current` synced from `/api/day-closings` (PostgreSQL-backed API). `storage.ts` helpers default to `uiDayClosingsCache` with explicit documentation that they are UI hints only.

---

## DAY CLOSED CHECK

**Server (authoritative):** `getBranchDayState(branch, date) === "closed"` or `isBranchDayClosed()` delegating to PostgreSQL.

**Client (UX only):** Same refreshed closings list; never used for server authorization.

---

## OPEN DAY FLOW

1. `DayClosingProvider.openDay` calls `refreshClosingsFromApi()` (PostgreSQL via API)
2. Pre-checks use refreshed UI cache (non-authoritative)
3. `openDayApi` → `day-closings-service.openDay` → `prisma.dayClosing.upsert`
4. On success: `refreshClosingsFromApi()` again
5. On failure: no cache update; API error returned

---

## CLOSE DAY FLOW

1. Refresh closings from PostgreSQL
2. Pre-check open/closed state in UI cache
3. Fix #3 payout sequencing unchanged (staff payments recorded before `closeDayApi`)
4. `closeDayApi` → PostgreSQL persist
5. Refresh closings from PostgreSQL on success

---

## REOPEN DAY FLOW

1. Refresh closings from PostgreSQL
2. Verify closed in refreshed state
3. `reopenDayApi` → owner/branch-manager authorization unchanged → PostgreSQL update
4. Refresh closings from PostgreSQL on success

---

## BRANCH ISOLATION

- Day state keyed by `branchId_date` in PostgreSQL — Kansanga never reads Salaama state
- Owner branch switch refreshes closings; active branch preference scopes API list filter
- Staff API returns only authorized branch closings

---

## SERVER RESTART / CACHE TEST

Verification clears `uiDayClosingsCache` via `setDayClosingsCache([])` and confirms `getBranchDayState()` still returns the correct PostgreSQL-derived answer. A fresh API request after open/close sees the same persisted state.

---

## CONCURRENCY / RACE PROTECTION

- Every server write gate re-queries PostgreSQL at request time (no in-process authority cache on server)
- Sequential close-then-write test confirms 409 rejection after close persists
- **Limitation:** True multi-process concurrent race testing is not practical in the verify script; no unrelated transaction redesign attempted

---

## FIX #3 PAYOUT SEQUENCING REGRESSION CHECK

Close-day flow in `DayClosingProvider` unchanged: `recordStaffPayment` for selected payouts runs **before** `closeDayApi`. Verification confirms close-day API and PostgreSQL persistence still work after open → close sequence.

---

## FILES CHANGED

| File | Change |
|------|--------|
| `lib/day-closing/storage.ts` | Renamed cache to `uiDayClosingsCache`; documented as UI-only, non-authoritative |
| `lib/server/day-closing-guards.ts` | `assertBranchDayOpenForWrite` uses `getBranchDayState` from PostgreSQL |
| `lib/server/services/day-closings-service.ts` | Added `getBranchDayState`, `findDayClosingRow`, `BranchDayState` type |
| `context/day-closing-context.tsx` | Refresh from API before/after open/close/reopen; removed local-only upsert authority |
| `scripts/verify-day-closing-live-db.ts` | 15-check verification script |
| `package.json` | Added `verify:day-closing-live-db` |
| `docs/PHASE-1-DAY-CLOSING-LIVE-DB-FIX.md` | This report |

---

## SCHEMA CHANGED: NO

Existing `DayClosing` model is sufficient. No Prisma schema or migration changes.

---

## MIGRATIONS CHANGED: NO

---

## TESTS RUN

| Command | Purpose |
|---------|---------|
| `npm run verify:day-closing-live-db` | Integration verification A–O |
| `npx tsc --noEmit` | TypeScript |
| `npm run build` | Production build |
| `npx eslint` on changed files | Lint |

---

## TEST RESULTS

| ID | Requirement | Result |
|----|-------------|--------|
| A | Day-open status from PostgreSQL | **PASS** |
| B | Day-closed status from PostgreSQL | **PASS** |
| C | Clearing in-memory cache does not change authoritative result | **PASS** |
| D | Kansanga state not used for Salaama | **PASS** |
| E | Salaama state not used for Kansanga | **PASS** |
| F | Closed-day mutation rejected | **PASS** (409) |
| G | Open-day authorized mutation allowed | **PASS** |
| H | Owner behavior correct | **PASS** |
| I | Staff branch restrictions correct | **PASS** |
| J | Open-day flow intact | **PASS** |
| K | Close-day flow intact | **PASS** |
| L | Reopen-day authorization intact | **PASS** |
| M | No contradictory authoritative state (sequential) | **PASS** |
| N | Fix #3 payout sequencing intact | **PASS** |
| O | No localStorage/client cache as server truth | **PASS** |

### Build toolchain

| Check | Result |
|-------|--------|
| **TYPESCRIPT** | **PASS** |
| **BUILD** | **PASS** |
| **ESLINT** | **PASS with pre-existing issues on changed files** |

Pre-existing ESLint on changed files (not introduced by this fix):

- `context/day-closing-context.tsx`: `react-hooks/set-state-in-effect` on logout path (line 139)
- `context/day-closing-context.tsx`: unused `computeDayClosingMetrics`, `computeExpectedCash`, `existing`
- `lib/day-closing/storage.ts`: unused `status` in `normalizeDayClosingRecord`

---

## PRODUCTION DATA TOUCHED: NO

Verification uses random 2019 dates and cleans up test `DayClosing` rows in `finally`.

---

## PHASE 1 FIX #9 RESULT

### **PASS**
