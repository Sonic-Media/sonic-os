# Staff Movie Revenue Input — End of Day UX Restore

**Branch:** `cursor/staff-movie-revenue-eod-b6e7`  
**Date:** 2026-09-15  
**Base branch:** `main`

---

## Problem

Staff **Today's Operations** End of Day card showed Daily Notes, Sales, Expenses, Daily Wage, Ready to Close, and Submit for Closing — but the **Movie Revenue input was missing**. Movie revenue could not be entered from the closing review workflow despite existing persistence via `DailyOperation.sales` / `Entry.sales`.

---

## Root cause

The backend and data model already supported movie revenue:

| Layer | Source of truth |
|-------|-----------------|
| Database | `DailyOperation.sales` (`Int`, default 0), unique on `(branchId, date)` |
| Client model | `Entry.sales` / `EntryFormData.sales` |
| API | `POST /api/daily-operations` → `upsertDailyOperation()` |
| Client save | `useEntryForm` → `updateField("sales", …)` → `upsertEntry()` |

Today's Revenue and Cash Summary already read `movieRevenue = parseAmount(form.sales)`. The Staff End of Day redesign removed the input UI while leaving the data path intact. Accessory revenue continued through the sales module separately.

---

## Schema / production data

- **No schema changes**
- **No migrations**
- **No production data modified**

---

## Code changes (actual)

| File | Change |
|------|--------|
| `components/operations/staff/staff-end-of-day-card.tsx` | Restored Movie Revenue section with UGX input, save button, checklist item; two-column layout (notes + movie revenue left, checklist right) |
| `components/operations/staff/staff-operations-workspace.tsx` | Wired `onSaveMovieRevenue`, `isSavingMovieRevenue`, `movieRevenueError` |
| `hooks/use-entry-form.ts` | `handleSubmitRequest(overrides?)` for explicit movie revenue save via existing upsert |
| `scripts/verify-staff-movie-revenue-eod.ts` | Focused regression verifier |
| `package.json` | Added `verify:staff-movie-revenue-eod` script |

**Unchanged:** DayClosing persistence, close-request workflow, business date logic, branch isolation, forgotten-close guard, staff authorization, payout sequencing, zero-revenue close rules, server validation.

---

## Behavior restored

- Movie Revenue input inside End of Day card (violet accent, UGX prefix, `formatCurrency` preview with thousands separators)
- **UGX 0 valid** (`validateMoneyInput` with `allowZero: true`)
- **Not blocking for close** — Submit for Closing remains enabled without movie revenue entered
- Checklist: Movie Revenue → `Pending` or `Recorded — UGX X`; Sales → accessory sales only
- Persists through existing daily operation upsert (`form.sales` → `DailyOperation.sales`)
- Locked when day closed or close request pending

---

## Tests run and results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (after clearing stale `.next/dev/types`) | **PASS** |
| `npm run verify:staff-movie-revenue-eod` | **PASS** (9/9) |
| `npm run verify:close-request-workflow` | **PASS** (24/24, includes zero-revenue close) |
| `npm run verify:closing-request-approval-flow` | **PASS** (includes zero-revenue submit/approve) |

---

## Manual verification

| Step | Result |
|------|--------|
| A. Open Today's Operations as staff | See manual verification section below |
| B–J. End of Day movie revenue UI | See manual verification section below |

Manual browser verification was attempted in the Cloud Agent environment. Results are recorded in the manual verification subsection once complete.

---

## Remaining concerns

- None identified from automated verification.
- Manual UI confirmation depends on staff login and an open business day in the connected dev database.

---

## Distinction: code vs environment

- All automated checks above ran successfully against the repository and local dev database.
- Any manual UI failure due to missing open business day, auth, or stale dev server state would be an **environment/fixture** issue, not a regression in the restored input wiring.
