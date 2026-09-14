# Staff Movie Revenue Input — End of Day UX Fix

**Branch:** `cursor/staff-movie-revenue-eod-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `main`

---

## Problem

Staff **Today's Operations** correctly calculated and displayed Movie Revenue in Today's Revenue, Cash Summary, and End of Day totals, but staff had **no UI control** to enter movie revenue for the open business day. Only accessory sales could be recorded through the sales flow.

Movie revenue and accessory revenue are separate Sonic OS revenue streams. Movie revenue must be manually entered per branch per business day; accessory revenue comes from completed accessory sales.

---

## Root cause

The backend and data model already supported movie revenue:

| Layer | Source of truth |
|-------|-----------------|
| Database | `DailyOperation.sales` (`Int`, default 0), unique on `(branchId, date)` |
| Client model | `Entry.sales` / `EntryFormData.sales` |
| API | `POST /api/daily-operations` → `upsertDailyOperation()` |
| Client save | `useEntryForm` → `updateField("sales", …)` → `upsertEntry()` (autosave + close submit) |

Today's Revenue and Cash Summary already read `movieRevenue = parseAmount(form.sales)` from `useEntryForm`. The gap was **UI wiring only**: the Staff End of Day card had Daily Notes and a checklist but no movie revenue input, and no explicit save path for staff to record `sales` before closing.

---

## Schema changes

**None.** Reused existing `DailyOperation.sales` / `Entry.sales`.

---

## Production data / environment

**Not touched.** No production database writes, no production environment variable changes, no destructive resets.

---

## Implementation

### 1. `components/operations/staff/staff-end-of-day-card.tsx`

Added a **Movie Revenue** section in the End of Day card workflow, ordered as:

1. Daily Notes  
2. **Movie Revenue input** (new)  
3. Day Checklist  
4. Submit for Closing  

Features:

- Premium dark Sonic OS styling (violet accent, UGX prefix, thousands preview via `formatCurrency`)
- Helper text: "Enter the total amount collected from movie sales today."
- **UGX 0 valid** via `validateMoneyInput(..., { allowZero: true })`
- Save / Update button persists through parent callback
- Gated when shop closed, day closed, or close request pending
- Checklist item **Movie Revenue**: `Recorded — UGX X` or `Not entered` (empty `form.sales` = not entered; `"0"` = recorded zero)
- **Sales** checklist now reflects accessory sales only (not combined total)

### 2. `components/operations/staff/staff-operations-workspace.tsx`

Wired End of Day save props:

- `onSaveMovieRevenue={(amount) => handleSubmitRequest({ sales: amount })}`
- `isSavingMovieRevenue={isSaving}`
- `movieRevenueError={saveError}`

Revenue cards (`StaffRevenueCard`, `StaffCashSummaryCard`) unchanged — they already consume `movieRevenue` from `useEntryForm`.

### 3. `hooks/use-entry-form.ts`

Extended `handleSubmitRequest(overrides?: Partial<EntryFormData>)` to accept optional overrides (e.g. `{ sales: amount }`), merge into form state, and persist via `formToEntry(effectiveForm, …)` → `upsertEntry()`. Reuses existing branch + business-day scoping and `assertBranchDayOpenForWrite()` server rules.

### 4. `scripts/verify-staff-movie-revenue-eod.ts`

Focused static + formula regression verifier. npm script: `verify:staff-movie-revenue-eod`.

---

## Business-day behavior

- Movie revenue persists against **`form.branch`** and **`form.date`** (open business day from `DayClosing`, not browser calendar alone).
- Staff workspace receives `businessDate` / entry date from the server-resolved open day.
- After-midnight activity remains on the open business day via existing day-closing semantics (unchanged).
- Close-day and zero-revenue rules unchanged; UGX 0 movie revenue does not block closing (`verify:close-request-workflow` check 17).

---

## Branch isolation

- Persistence uses existing `DailyOperation` unique `(branchId, date)` constraint and server branch authorization on `POST /api/daily-operations`.
- `npm run verify:branch-isolation` **PASS** — Kansanga and Salaama product scopes remain isolated.
- No client-side localStorage source of truth for movie revenue.

---

## Expected scenario (Kansanga, open business day)

| Input | Expected display |
|-------|------------------|
| Movie Revenue = UGX 50,000 | Movie Revenue = UGX 50,000 |
| Accessory Revenue = UGX 20,000 (from sales) | Accessory Revenue = UGX 20,000 |
| Total Revenue | UGX 70,000 |
| Cash Summary | Existing formula: movie + accessory − expenses − daily wage (− savings allocation in close flow) |

| Input | Expected |
|-------|----------|
| Movie Revenue = UGX 0 (explicit save) | Valid; day can still close per existing rules |

---

## Files changed

| File | Change |
|------|--------|
| `components/operations/staff/staff-end-of-day-card.tsx` | Movie Revenue input + checklist |
| `components/operations/staff/staff-operations-workspace.tsx` | Save wiring |
| `hooks/use-entry-form.ts` | `handleSubmitRequest` overrides |
| `scripts/verify-staff-movie-revenue-eod.ts` | New regression verifier |
| `package.json` | `verify:staff-movie-revenue-eod` script |
| `docs/data-integrity/STAFF-MOVIE-REVENUE-INPUT-FIX-REPORT.md` | This report |
| `docs/data-integrity/STAFF-MOVIE-REVENUE-INPUT-FIX-REPORT.docx` | DOCX export |

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:staff-movie-revenue-eod` | **PASS** (9 checks) |
| `npm run verify:branch-authorization` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:close-request-workflow` | **PASS** (24 checks, incl. zero-revenue close) |

## Tests with environment / fixture failures

| Command | Result |
|---------|--------|
| `npm run verify:close-day-date` | **PARTIAL** — static checks 1–5 **PASS**; live cashier bootstrap **FAIL** (`Authentication required.`) |
| `npm run verify:operations` | **FAIL** — `Authentication required.` (fixture bootstrap) |
| `npm run verify:roles` | **FAIL** — nav label assertion mismatch (`Today`/`Sales` vs expected `Today's Operations`/`Accessory Sales`); unrelated to this change; movie revenue API check (12) not reached |

## Tests not run

| Test | Reason |
|------|--------|
| Browser E2E on Staff Today's Operations (Kansanga UGX 50,000 + accessory UGX 20,000) | Not executed in this agent run; logic covered by existing `useEntryForm` + API path and static verifier |
| Production deployment verification | Out of scope |

---

## CODE PASS/FAIL

**CODE PASS** — TypeScript clean; movie revenue input wired to existing `DailyOperation.sales` persistence in End of Day workflow.

## TEST PASS/FAIL

**TEST PASS (targeted)** — `verify:staff-movie-revenue-eod`, branch authorization, branch isolation, close-request workflow.  
**TEST FAIL (environment / unrelated)** — `verify:operations`, `verify:close-day-date` live auth; `verify:roles` nav label drift.
