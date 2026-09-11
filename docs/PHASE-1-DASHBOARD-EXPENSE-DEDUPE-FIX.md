# Phase 1 Fix #10 — Owner Dashboard Expense Double-Counting

**Audit finding:** Medium #13 — Owner dashboard may double-count operating expenses.

**Status:** PASS

**Branch:** `cursor/dashboard-expense-dedupe-b6e7`

---

## ROOT CAUSE

`use-branch-state.ts` summed operating expenses from two sources:

1. Expense module records (`ExpenseRecord[]` from PostgreSQL)
2. Daily operation entry expense lines (`calculateExpenses(activeEntry)`)

After close-day sync, the completed daily operation entry contains an aggregated "Operating Expenses" line whose amount already reflects the module total. Adding both sources counted the same expenses twice.

The same pattern existed in `lib/branch/analytics.ts` (`computeTodayExpenses`), affecting Owner command-center All Branches totals.

---

## DUPLICATION PATH BEFORE

```
moduleOperatingExpenses = sum(expense module records for branch/date)
entryOperatingExpenses  = calculateExpenses(daily operation entry)
operatingExpenses       = moduleOperatingExpenses + entryOperatingExpenses  ← double count
```

---

## CALCULATION FLOW AFTER

```
computeDashboardOperatingExpenses(branch, date, expenses, entries)
  → if any expense module records exist for branch/date:
       return sum(module records, excluding staff payments)
  → else:
       return sum(entry operating expense lines)  ← legacy/historical fallback only
```

---

## FILES CHANGED

| File | Change |
|------|--------|
| `lib/dashboard/operating-expenses.ts` | New deduplicated dashboard operating expense helper |
| `hooks/use-branch-state.ts` | Uses `computeDashboardOperatingExpenses` |
| `lib/branch/analytics.ts` | Uses same helper for Owner branch comparison |
| `scripts/verify-dashboard-expense-dedupe.ts` | 13-check verification script |
| `package.json` | Added `verify:dashboard-expense-dedupe` |
| `docs/PHASE-1-DASHBOARD-EXPENSE-DEDUPE-FIX.md` | This report |

---

## TESTS RUN

| Command | Result |
|---------|--------|
| `npm run verify:dashboard-expense-dedupe` | **13/13 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint on changed files | **PASS** |

---

## PRODUCTION DATA TOUCHED

**NO**

---

## PHASE 1 FIX #10 RESULT

**PASS**
