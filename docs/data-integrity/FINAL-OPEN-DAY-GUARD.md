# Final Open-Day Guard

**Date:** 2026-09-12  
**Branch:** `cursor/final-open-day-guard-b6e7`  
**Final result:** **PASS**

---

## Observed Issue

The Open/Close Shop audit identified a forgotten-close scenario:

```
Monday business day remains OPEN
        ↓
Tuesday morning → Open Shop
        ↓
App allowed Tuesday to open while Monday was still open
```

This violated the Sonic Media business rule: **one open business day per branch at a time**.

---

## Root Cause

`openDay` and `openWithShift` in `lib/server/services/day-closings-service.ts` only checked the **requested calendar date's** `DayClosing` row. They did not inspect whether **another date** for the same branch was already open with `openedAt` / `reopenedAt`.

Close Day already used a branch-wide open lookup via `resolveOpenBusinessDateForClose`; Open Shop did not reuse that guard.

---

## Implementation

**File:** `lib/server/services/day-closings-service.ts`

1. Extracted shared query `findActiveOpenBusinessDays(branchId)` — same criteria as close-day resolution (`status: "open"` with `openedAt` or `reopenedAt`).
2. Added `assertCanOpenRequestedBusinessDay(branchId, requestedDate)` — throws `409` with code `previous_business_day_open` when any **other** date is still open.
3. Called the guard in:
   - `openDay`
   - `openWithShift`
   - `reopenDay` (prevents reopening one date while another remains open)

**Error message example:**

> Previous business day still open. Close Monday's business day before opening Tuesday.

**File:** `lib/ux/staff-messages.ts`

- Passes through `previous_business_day_open` messages to staff UI without generic masking.

**Verifier updates:**

- `scripts/verify-final-open-day-guard.ts` (new)
- `scripts/verify-close-day-date-consistency.ts` — stale-day cleanup before tests; close open days before reopen check

---

## Tests and Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Final open-day guard | `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| Close-day / midnight behavior | `npm run verify:close-day-date` | **PASS** (16/16) |
| Branch selection / authorization | `npm run verify:branch-selection` | **PASS** |

### Cases verified (live API)

1. No open business day → open allowed  
2. Previous business day still open → open rejected (`previous_business_day_open`)  
3. Previous day closed → next day can open  
4. Same-day duplicate open → rejected (`day_already_open`)  
5. Branch isolation → Kansanga open does not block Salaama  
6. Staff cannot open foreign branch → 403  
7. After-midnight close still closes actual open business day (unchanged)  
8. Reopen works when no other business day is open (unchanged)

---

## Production Impact

- **Code change required:** Yes  
- **Schema changes:** None  
- **Production data mutations:** None  
- **prisma db push:** Not run  
- Server now rejects overlapping open business days per branch  
- Midnight auto-close **not** introduced  
- Close Day business-date resolution **unchanged**

---

## Intentionally Left Unchanged

- Client-side gate hints (`needsShopOpening`, etc.) — server remains authoritative  
- Automatic close of forgotten days  
- Silent business-date rollover on open  
- Broader data-integrity / historical verification suites  
- Mission Control and attendance flows

---

## Code Change Required?

**Yes.** Server-side guard added in `day-closings-service.ts` and staff message handling in `staff-messages.ts`.
