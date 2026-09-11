# SONIC OS — PHASE 1 CLOSE-DAY BUG FIX REPORT

**Date:** 2026-09-10 (UTC)  
**Milestone:** Data Integrity — Close Day  
**Branch:** `cursor/close-day-date-fix-b6e7`  
**Pull Request:** https://github.com/Sonic-Media/sonic-os/pull/20  
**Prior diagnostic:** `docs/CLOSE-DAY-BUG-DIAGNOSTIC.md`

---

## PHASE 1 CLOSE-DAY BUG FIX REPORT (CERTIFICATION FORMAT)

**STATUS:** PASS

### BUG A — BUSINESS DATE ROLLOVER

**BEFORE:** Open Day stored `DayClosing.date` via `getTodayISO()`. Close Day called `getTodayISO()` again independently. After midnight (e.g. Uganda), browser date became `2026-09-11` while open record remained `2026-09-10` → *"Start today's shift before closing the day."*

**AFTER:** Client and server resolve the active open business day from PostgreSQL. Close uses persisted `DayClosing.date`, not a fresh calendar date.

**BUSINESS DATE SOURCE:** Earliest open `DayClosing` for the authorized branch (`status=open`, `openedAt`/`reopenedAt` set). Server: `resolveOpenBusinessDateForClose()`. Client: `getActiveOpenDayRecord()`. Client date is hint only.

**AFTER-MIDNIGHT BEHAVIOR:** Open `2019-06-20`, close hint `2019-06-21` → closes `2019-06-20`. No spurious `2019-06-21` DayClosing created.

### BUG B — POST-CLOSE DUPLICATE WRITE

**BEFORE:** After successful `closeDayApi()`, client called `upsertEntry(buildClosedDayDailyOperationEntry(...))`. Server had already synced DailyOperation in `closeDay()` → 409 `day_closed` → UI reported failure despite PostgreSQL CLOSED.

**AFTER:** On success: `closeDayApi()` → `refreshClosingsFromApi()` → `refreshEntries()` → success. No redundant post-close write.

**SERVER CLOSE RESULT:** `closeDay()` → `syncClosedDayDailyOperation()` → `DayClosing.status = "closed"`.

**CLIENT CLOSE RESULT:** Success when API succeeds; no follow-up upsert.

**STAFF PAYOUT SEQUENCING:** Preserved Fix #3 — validate → payouts → `closeDayApi()` → refresh → success. Payouts use `businessDate`.

**BRANCH ISOLATION:** Preserved. Salaama cannot close Kansanga (403). Kansanga cannot close Salaama (403). Owner switching and staff branch restriction unchanged.

**POSTGRESQL AUTHORITY:** Preserved from Fix #9. Server resolves from PostgreSQL; client cache refreshed from API only. `assertBranchDayOpenForWrite` not weakened.

**SAME-DAY TEST:** Open `2019-06-10`, close `2019-06-10` → CLOSED. PASS.

**AFTER-MIDNIGHT TEST:** Open `2019-06-20`, close hint `2019-06-21` → `2019-06-20` CLOSED, no next-day record. PASS.

**POST-CLOSE WRITE TEST:** Close succeeds; server DailyOperation synced; redundant write 409; no client upsert after close. PASS.

**FAILURE TEST:** Close without open → 400 failure; day remains unopened. PASS.

**FILES CHANGED:** `lib/day-closing/business-date.ts`, `lib/day-closing/storage.ts`, `lib/server/services/day-closings-service.ts`, `context/day-closing-context.tsx`, `components/operations/close-day-workspace.tsx`, `hooks/use-staff-close-day.ts`, `scripts/verify-close-day-date-consistency.ts`, `package.json`, `docs/PHASE-1-CLOSE-DAY-BUG-FIX.md`

**SCHEMA CHANGED:** NO  
**MIGRATIONS CHANGED:** NO  
**PRODUCTION DATA TOUCHED:** NO  
**TYPESCRIPT:** PASS  
**BUILD:** PASS  
**ESLINT:** FAIL (pre-existing `set-state-in-effect` only; no new issues from this fix)

**TEST RESULTS:** `npm run verify:close-day-date` — 16/16 PASS | `npx tsc --noEmit` — PASS | `npm run build` — PASS

**FINAL RESULT:** PASS

---

## Executive Summary

Two confirmed Close Day bugs were fixed with a minimal, targeted change set. No schema, migration, or production data changes were made.

| Bug | Symptom | Root cause | Fix |
|-----|---------|------------|-----|
| **A — Business date rollover** | After local midnight, Close Day fails with *"Start today's shift before closing the day."* even though the shop is open | Client used fresh `getTodayISO()` instead of the persisted open `DayClosing.date` | Resolve active open business day from PostgreSQL (server) and API-refreshed closings (client) |
| **B — Post-close duplicate write** | PostgreSQL shows day CLOSED but UI reports Close Day failed | Client called `upsertEntry()` after server had already synced the completed DailyOperation inside `closeDay()` → 409 `day_closed` | Remove redundant post-close client write; refresh state only on success |

---

## BUG A — BUSINESS DATE ROLLOVER

### BEFORE

- Open Day stored `DayClosing.date` using `getTodayISO()` at open time.
- Close Day independently called `getTodayISO()` again for validation and API input.
- **Example (Uganda / Africa-Kampala):**
  - Shop opened: `2026-09-10`
  - After midnight, browser date: `2026-09-11`
  - Close Day searched for: `2026-09-11`
  - Actual open record: `2026-09-10`
  - Result: *"Start today's shift before closing the day."* (incorrect)

### AFTER

- Close Day resolves the **active open `DayClosing`** for the authenticated branch.
- Uses persisted `DayClosing.date` as the business date being closed.
- Client may display current calendar date/time, but does not invent a new business date for the close operation.
- Server remains authoritative.

### BUSINESS DATE SOURCE

Earliest open `DayClosing` for the authorized branch where `status = open` and (`openedAt` or `reopenedAt` is set):

- **Server:** `resolveOpenBusinessDateForClose()` in `lib/server/services/day-closings-service.ts`
- **Client:** `getActiveOpenDayRecord()` in `lib/day-closing/business-date.ts`

Client-supplied date is accepted as a **hint only**; server verifies it against the currently open authorized branch day.

### AFTER-MIDNIGHT BEHAVIOR

| Step | Value |
|------|-------|
| Open | `2019-06-20` |
| Close request (calendar hint) | `2019-06-21` |
| **Closed record** | `2019-06-20` |
| Spurious next-day record created? | **No** |

Verified: `npm run verify:close-day-date` checks 7–8.

---

## BUG B — POST-CLOSE DUPLICATE WRITE

### BEFORE

```
closeDayApi()  → 201 success (PostgreSQL: CLOSED)
       ↓
upsertEntry(buildClosedDayDailyOperationEntry(...))
       ↓
409 day_closed ("This branch day is closed. Records cannot be changed.")
       ↓
UI reports Close Day FAILED (incorrect)
```

Server `closeDay()` already called `syncClosedDayDailyOperation()` and persisted the completed DailyOperation **before** setting `DayClosing.status = "closed"`.

### AFTER

```
closeDayApi()  → success
       ↓
refreshClosingsFromApi()
       ↓
refreshEntries()
       ↓
UI reports success (correct)
```

No redundant `upsertEntry()` after successful close.

### SERVER CLOSE RESULT

`closeDay()` → `syncClosedDayDailyOperation()` → `DayClosing.status = "closed"`.

### CLIENT CLOSE RESULT

Success when `closeDayApi()` succeeds. No follow-up business-data write after closure.

---

## STAFF PAYOUT SEQUENCING

**Preserved (Phase 1 Fix #3):**

1. Validate
2. Await staff payouts (`recordStaffPayment()`)
3. Only if payouts succeed → `closeDayApi()`
4. Close day
5. Refresh state
6. Report success

Payouts now use resolved `businessDate`, not calendar date. Payouts were **not** moved after close.

---

## BRANCH ISOLATION

**Preserved.** No changes to opening/closing permissions.

| Scenario | Result |
|----------|--------|
| Salaama tries to close Kansanga open day | 403 — day stays open |
| Kansanga tries to close Salaama open day | 403 — day stays open |
| Owner branch switching | Unchanged |
| Staff assigned-branch restriction | Unchanged |

Verified: checks 14–15 in `verify:close-day-date`.

---

## POSTGRESQL AUTHORITY

**Preserved** from Phase 1 Fix #9 (live DB gates).

- PostgreSQL remains authoritative for day state.
- Client UI cache is refreshed from API only — not used for server write gates.
- `assertBranchDayOpenForWrite` was **not** weakened.
- Writes to closed days remain blocked.

---

## TEST RESULTS

### Automated verification (`npm run verify:close-day-date`)

| # | Test | Result |
|---|------|--------|
| 1 | Client resolves active open business day | PASS |
| 2 | Server resolves via `resolveOpenBusinessDateForClose` | PASS |
| 3 | No redundant post-close `upsertEntry` in client flow | PASS |
| 4 | `getTodayISO()` not globally replaced | PASS |
| 5 | Business-date helper returns earliest open day | PASS |
| 6 | Same-day close | PASS |
| 7 | After-midnight close closes actual open day | PASS |
| 8 | No spurious next-day DayClosing created | PASS |
| 9 | `getActiveOpenDayRecord` unit resolution | PASS |
| 10 | Successful close + PostgreSQL closed state | PASS |
| 11 | Server syncs completed DailyOperation on close | PASS |
| 12 | Post-close redundant write correctly rejected (409) | PASS |
| 13 | Failed close leaves day unopened | PASS |
| 14 | Salaama cannot close Kansanga | PASS |
| 15 | Kansanga cannot close Salaama | PASS |
| 16 | Reopen behavior preserved | PASS |

**Total: 16/16 PASS**

### Build pipeline

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| ESLint (changed files) | FAIL — pre-existing `set-state-in-effect` only; no new issues from this fix |

### Scenario summary

| Scenario | Expected | Verified |
|----------|----------|----------|
| Same-day close | Open `2019-06-10`, close `2019-06-10` → CLOSED | PASS |
| After-midnight close | Open `2019-06-20`, close hint `2019-06-21` → `2019-06-20` CLOSED | PASS |
| Post-close write | Close succeeds; no client upsert; UI success | PASS |
| Failure semantics | Close without open → failure; day stays open | PASS |

---

## SCOPE — WHAT WAS NOT CHANGED

The following were intentionally **not** modified:

- Database schema or migrations
- Production data
- Global `getTodayISO()` behavior
- Reports, dashboard, inventory, sales, purchasing, expenses (except payout date resolution in close flow)
- Authentication or branch authorization rules
- Historical import, backup/restore
- Day-opening permissions or reopen permissions
- `assertBranchDayOpenForWrite` logic

---

## FILES CHANGED

| File | Change |
|------|--------|
| `lib/day-closing/business-date.ts` | **New** — `getActiveOpenDayRecord()` helper |
| `lib/day-closing/storage.ts` | Export active-open-day helper for UI cache |
| `lib/server/services/day-closings-service.ts` | `resolveOpenBusinessDateForClose()`; close uses persisted business date |
| `context/day-closing-context.tsx` | Resolve business date; remove post-close upsert; expose `getActiveOpenRecord` |
| `components/operations/close-day-workspace.tsx` | Metrics/payouts/close use business date |
| `hooks/use-staff-close-day.ts` | Staff close uses active open business date |
| `scripts/verify-close-day-date-consistency.ts` | **New** — 16-check verification script |
| `package.json` | Added `verify:close-day-date` script |

---

## COMPLIANCE CHECKLIST

| Requirement | Status |
|-------------|--------|
| SCHEMA CHANGED | **NO** |
| MIGRATIONS CHANGED | **NO** |
| PRODUCTION DATA TOUCHED | **NO** |
| TYPESCRIPT | **PASS** |
| BUILD | **PASS** |
| ESLINT | **FAIL** (pre-existing only) |

---

## FINAL RESULT

**PASS**

Both confirmed Close Day bugs are fixed. Close Day now reliably closes the actual business day that was opened (including after midnight), and a successful server close is reported as success in the UI without a redundant post-close write failure.

---

*For the pre-fix diagnostic trace, see `docs/CLOSE-DAY-BUG-DIAGNOSTIC.md`.*
