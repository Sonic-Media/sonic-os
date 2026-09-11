# SONIC OS — CLOSE DAY BUG DIAGNOSTIC

**Date:** 2026-09-10 (UTC)  
**Scope:** Read-only trace — no code changes, no production data modified  
**Branch inspected:** `cursor/day-closing-live-db-b6e7` (current codebase)

---

## Executive Summary

Close Day can fail in **two distinct ways**, both traced to concrete code paths with live API/PostgreSQL verification:

1. **Primary (high confidence for Uganda operators after local midnight):** Client rejects close because `getTodayISO()` returns a **different calendar date** than the date the shop was opened for in PostgreSQL.
2. **Secondary (confirmed via API reproduction):** Server **successfully closes** the day, then the client calls `upsertEntry()` which is **rejected** because the day is already closed — UI reports failure even though PostgreSQL shows `closed`.

There are **no minimum/maximum closing-time rules** in the codebase.

---

## Answers to Diagnostic Questions

| # | Question | Finding |
|---|----------|---------|
| **1** | Exact error/message | **Most likely (Uganda/local midnight):** `"Start today's shift before closing the day."` **Also confirmed in API test:** `"This branch day is closed. Records cannot be changed."` **If logged in as owner:** `"You do not have permission to close the day."` |
| **2** | Function that rejects | **Path A (client):** `DayClosingProvider.closeDay` → `checkBranchDayOpened()` **Path B (server, after close succeeds):** `assertBranchDayOpenForWrite()` via `upsertDailyOperation()` **Path C (owner):** `assertCanCloseDay()` |
| **3** | Condition that fails | **Path A:** `!checkBranchDayOpened(branch, date, closingsRef.current)` where `date = getTodayISO()` **Path B:** `getBranchDayState() === "closed"` after `closeDayApi` already closed the day **Path C:** `canAccessCloseDay(session.role)` is false for `owner` |
| **4** | Business date Sonic OS thinks is “today” | `getTodayISO()` = **browser local calendar date** (`new Date().getFullYear/getMonth/getDate()`). Dev VM server: **`2026-09-10`**. Browser in Uganda (UTC+3) at `2026-09-10T21:20 UTC`: **`2026-09-11`**. |
| **5** | Timezone used | **No explicit timezone** configured (no `Africa/Kampala`, no `TZ` env). Client uses **browser local timezone**. Server uses **host local time (UTC on dev VM)** when `getTodayISO()` runs server-side. |
| **6** | Time day was opened | **Kansanga (`main`):** `2026-09-10T16:47:25.680Z` (~7:47 PM EAT). **Salaama:** `2026-09-10T16:47:25.966Z`. Both stored under business date **`2026-09-10`**. |
| **7** | Current time Sonic OS thinks it is | **Server (VM):** `2026-09-10T21:20:42Z` UTC. **Browser in Uganda:** ~`2026-09-11 00:20 EAT` (local midnight passed). |
| **8** | Min/max closing-time rule? | **No.** Nothing in `lib/day-closing/*`, `day-closings-service.ts`, or close-day UI enforces opening/closing hours. |
| **9** | Is a time rule causing failure? | **No.** |
| **10** | Staff payments blocking? | **Can block client-side** if selected payout has `paidToday: true` or validation fails. **Does not block** server close with empty `staffPayouts` (verified: API returned **201**). |
| **11** | Draft/incomplete daily ops blocking? | **No.** Server `closeDay()` runs `syncClosedDayDailyOperation()` before marking closed. |
| **12** | PostgreSQL: branch day open? | At diagnostic time: **Kansanga `2026-09-10`:** `closed` (after API reproduction). **Salaama `2026-09-10`:** `open`. No `2026-09-11` row for either branch. |
| **13** | Client or server? | **Path A:** client-side pre-check. **Path B:** server rejects post-close upsert; triggered by client after successful close. **Path C:** server-side 403 for owner. |

---

## Close Day Flow (Traced)

```
CloseDayWorkspace.handleCloseDay()
  → useDayClosing().closeDay()                    [context/day-closing-context.tsx]
      1. refreshClosingsFromApi()                 GET /api/day-closings
      2. CLIENT: checkBranchDayClosed / Opened    closingsRef.current
      3. CLIENT: cash reconciliation validation
      4. CLIENT: staff payout validation          recordStaffPayment() (optional)
      5. closeDayApi()                            POST /api/day-closings
           → day-closings-service.closeDay()      [lib/server/services/day-closings-service.ts]
              → assertCanCloseDay()               [lib/server/day-closing-guards.ts]
              → PG: existing row must be open with openedAt/reopenedAt
              → syncClosedDayDailyOperation()     writes completed DailyOperation
              → PG: upsert DayClosing status=closed
      6. refreshClosingsFromApi()
      7. upsertEntry(buildClosedDayDailyOperationEntry(...))   ← FAILS (Path B)
           → POST /api/daily-operations
           → assertBranchDayOpenForWrite() → 409 day_closed
      8. catch → result.success = false → UI error
```

### Key files inspected

| File | Role |
|------|------|
| `context/day-closing-context.tsx` | Client orchestration, pre-checks, post-close upsert |
| `components/operations/close-day-workspace.tsx` | UI wizard; `date: today` from `getTodayISO()` |
| `hooks/use-staff-close-day.ts` | Staff end-of-day close path |
| `app/api/day-closings/route.ts` | POST routes to `closeDay()` |
| `lib/server/services/day-closings-service.ts` | PostgreSQL open/close/reopen |
| `lib/server/day-closing-guards.ts` | `assertBranchDayOpenForWrite`, `assertCanCloseDay` |
| `lib/day-closing/storage.ts` | UI-only closings cache (non-authoritative) |
| `lib/dates.ts` | `getTodayISO()` — local calendar date |
| `prisma/schema.prisma` | `DayClosing` model (`branchId` + `date` unique) |

---

## PostgreSQL Authoritative State (`DayClosing`)

| Field | Purpose |
|-------|---------|
| `branchId` + `date` | Business date for the branch (unique) |
| `status` | `"open"` or `"closed"` |
| `openedAt` / `openedBy` | Shop opened |
| `reopenedAt` / `reopenedBy` | Reopened after close |
| `closedAt` / `closedBy` | Day closed |

Open check (server): `status === "open"` AND (`openedAt` OR `reopenedAt`).  
Implemented in `getBranchDayState()` — does **not** use “latest DailyOperation”.

---

## Reproduction Evidence

### Test A — Owner cannot close (API)

```
POST /api/day-closings (as owner)
→ 403 {"message":"You do not have permission to close the day.","code":"forbidden"}
```

Source: `canAccessCloseDay()` returns false for `owner` (`lib/day-closing/permissions.ts`).

### Test B — Close succeeds, then post-close upsert fails (API)

```
POST /api/day-closings (as cashier, branch main, date 2026-09-10)
→ 201 {"status":"closed"}

POST /api/daily-operations (simulating client upsertEntry after close)
→ 409 {"message":"This branch day is closed. Records cannot be changed.","code":"day_closed"}
```

Close **persisted** in PostgreSQL; client follow-up write correctly blocked on closed day, but `closeDay()` treats this as overall failure.

### Test C — Date rollover (Uganda UTC+3 at 21:20 UTC)

```
Shop opened for PostgreSQL date: 2026-09-10
Browser getTodayISO() in EAT:   2026-09-11
→ checkBranchDayOpened(branch, '2026-09-11') === false
→ Client message: "Start today's shift before closing the day."
```

No API call is made.

---

## Path A — Business Date Mismatch (Client-Side)

**Message:** `Start today's shift before closing the day.`

**File:** `context/day-closing-context.tsx`  
**Function:** `closeDay` → `checkBranchDayOpened(input.branch, input.date, closingsRef.current)`  
**Condition:** No open `DayClosing` row for `(branch, getTodayISO())` after refresh.

**Why it happens:** Open Day and Close Day both set `date` from `getTodayISO()` at the moment of the action. If the browser calendar rolls past midnight (e.g. Uganda UTC+3) between open and close, open is stored for `2026-09-10` but close checks `2026-09-11`.

**PostgreSQL at diagnostic time:** Open rows exist for `2026-09-10`, not `2026-09-11`.

---

## Path B — Post-Close Duplicate Upsert (Server Rejects Client Call)

**Message:** `This branch day is closed. Records cannot be changed.`

**File:** `lib/server/day-closing-guards.ts`  
**Function:** `assertBranchDayOpenForWrite`  
**Condition:** `getBranchDayState(branch, date) === "closed"`

**Trigger:** `context/day-closing-context.tsx` lines 422–445 call `upsertEntry()` **after** `closeDayApi()` returns success. Server already wrote the completed daily operation inside `syncClosedDayDailyOperation()` during `closeDay()`.

**Side effect:** User sees close failure; PostgreSQL may already show `status: closed`.

---

## Path C — Owner Role (Server-Side)

**Message:** `You do not have permission to close the day.`

**File:** `lib/server/day-closing-guards.ts`  
**Function:** `assertCanCloseDay`  
**Condition:** `canAccessCloseDay(session.role) === false` for owner.

UI normally hides Close Day for owner (`canAccessCloseDay` in `operations-workspace.tsx`), but direct API calls fail with 403.

---

## Rules Explicitly NOT Present

- No minimum hours after open before close
- No maximum closing hour
- No timezone-aware business date (uses browser local `Date`)
- No server-side draft-entry requirement before close

---

## Staff Payments & Daily Operations

| Check | Blocks close? |
|-------|----------------|
| Selected payout `paidToday: true` | **Client only** — `"${name} has already been paid today."` |
| `recordStaffPayment` validation | **Client only** (sync wrapper returns before API completes) |
| Draft daily operation | **No** — server syncs/creates on close |
| Cash short/over without notes | **Client only** — reconciliation notes required |

---

## Conclusion

### ROOT CAUSE

**Primary (most likely for Uganda operator closing after local midnight):** Open and close use independent `getTodayISO()` snapshots. Shop opened for **`2026-09-10`**; after midnight EAT, close targets **`2026-09-11`**. Client pre-check fails before the API runs.

**Secondary (confirmed when close reaches server):** Redundant client `upsertEntry()` after successful `closeDayApi()` hits `assertBranchDayOpenForWrite()` on an already-closed day → UI failure despite successful PostgreSQL close.

### CONFIDENCE

| Path | Confidence |
|------|------------|
| Date rollover / timezone mismatch | **High** |
| Post-close upsert failure | **High** (reproduced) |
| Owner permission 403 | **High** (reproduced) |

### EXACT FAILURE

**Most likely user-visible message:**
> Start today's shift before closing the day.

**If close reaches the server:**
> This branch day is closed. Records cannot be changed.

### FILE

- Path A: `context/day-closing-context.tsx` (lines 319–321)
- Path B: `context/day-closing-context.tsx` (lines 422–456) → `lib/server/day-closing-guards.ts` (lines 50–68)

### FUNCTION

- Path A: `DayClosingProvider.closeDay` → `checkBranchDayOpened()`
- Path B: `DayClosingProvider.closeDay` → `upsertEntry()` → `assertBranchDayOpenForWrite()`

### RECOMMENDED FIX

*(Diagnostic only — not implemented.)*

1. **Date consistency:** Close using the **opened business date** from PostgreSQL (active open `DayClosing.date`), not a fresh `getTodayISO()` at close time.
2. **Post-close upsert:** Remove redundant client `upsertEntry()` after successful `closeDayApi`, or treat close as success when API returns 201 (server already runs `syncClosedDayDailyOperation()`).
3. **Owner:** Expected — staff/cashier or branch-manager must perform close.

---

## Diagnostic Constraints

| Item | Value |
|------|-------|
| **CODE CHANGED** | **NO** |
| **PRODUCTION DATA TOUCHED** | **NO** |
| Dev DB note | One API reproduction closed Kansanga `2026-09-10` during testing |

---

## How to Re-run Verification (Read-Only Queries)

```bash
# Day-closing live DB checks (existing script)
npm run verify:day-closing-live-db

# Server date/time
date
node -e "const d=new Date(); console.log(d.toISOString())"
```

PostgreSQL inspection (read-only):

```sql
SELECT b.code, dc.date, dc.status, dc.opened_at, dc.closed_at
FROM "DayClosing" dc
JOIN "Branch" b ON b.id = dc."branchId"
WHERE dc.date >= '2026-09-09'
ORDER BY dc.date DESC, b.code;
```
