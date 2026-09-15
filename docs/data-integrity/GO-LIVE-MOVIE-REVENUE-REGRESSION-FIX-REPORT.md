# Go-Live Movie Revenue Regression Fix Report

**Branch:** `cursor/go-live-movie-revenue-regression-b6e7`  
**Date:** 2026-09-15  
**Scope:** Restore Staff Movie Revenue input regression; confirm production branch codes unchanged.

---

## Issue 1 — Movie Revenue Input Disappeared (REGRESSION)

### Root cause

PR #51 (`cursor/day-close-state-sync-b6e7`) merged to `main` on 2026-09-15. That branch contained End of Day UX and state-sync fixes but **did not include** the Movie Revenue input restoration from `cursor/staff-movie-revenue-eod-b6e7`. Merge overwrote `StaffEndOfDayCard` with a version that only had Daily Notes and checklist — **no Movie Revenue section, no save handler, no `onSaveMovieRevenue` wiring**.

The intentional removal of the **> 0 gate before closing** was preserved on `main` (`readyToClose` does not depend on movie revenue). Only the **input UI and explicit save path** were lost.

### Why the input disappeared

Git merge/replace during day-close state sync landed a slimmer `staff-end-of-day-card.tsx` without the movie revenue block added in commits `dba55a0` and `b5a3c1a` (staff-movie-revenue-eod branch).

### Movie Revenue persistence path (unchanged architecture)

| Step | Component / function | Field |
|------|---------------------|-------|
| 1 | `StaffEndOfDayCard` → Save button | User enters amount (UGX 0 allowed) |
| 2 | `onSaveMovieRevenue` → `handleSubmitRequest({ sales: amount })` | `EntryFormData.sales` |
| 3 | `use-entry-form` → `formToEntry` → `upsertEntry` | `Entry.sales` (number) |
| 4 | `upsertDailyOperationApi` → server | `DailyOperation.sales` (PostgreSQL) |
| 5 | Reload / metrics | `parseAmount(form.sales)`; `computeTodayRevenueByBranch` adds `entry.sales` |

No duplicate schema, API, or parallel storage was introduced.

### Files changed

| File | Change |
|------|--------|
| `components/operations/staff/staff-end-of-day-card.tsx` | Restored Movie Revenue section, UGX input, save button, checklist |
| `components/operations/staff/staff-operations-workspace.tsx` | Wired `onSaveMovieRevenue`, error/loading props |
| `hooks/use-entry-form.ts` | `handleSubmitRequest(overrides?)` for explicit movie revenue save |
| `components/dashboard/closing-requests/review-closing-request-dialog.tsx` | Show **Movie revenue** from persisted `DailyOperation.sales` |
| `scripts/verify-staff-movie-revenue-eod.ts` | Extended regression checks (14 assertions) |
| `package.json` | `verify:staff-movie-revenue-eod` script |

### Behavior restored

1. Staff can enter Movie Revenue for active business date  
2. UGX 0 is valid  
3. Value persists to `DailyOperation.sales`  
4. Page refresh shows saved value (via entries context reload)  
5. Dashboard/revenue uses same `entry.sales` source  
6. EOD cash calculations unchanged  
7. Closing **not** blocked when movie revenue is 0 or unset  
8. Owner review dialog shows persisted Movie Revenue  
9. Branch isolation intact (`branchCodesReferToSameInventory` on lookup)

---

## Issue 2 — Salaama Database Code

### Action taken: **NO migration**

Production authoritative codes remain:

| Branch | DB code |
|--------|---------|
| Kansanga | `main` |
| Salaama | `branch2` |

`lib/branch/codes.ts` keeps UI alias `salaama` → `branch2`. No `branch2` → `salaama` rename. No production branch record changes. No migration scripts run.

Verified by `verify:reports-branch-code-alignment` and static check in `verify:staff-movie-revenue-eod`.

---

## Tests run (actual results)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:staff-movie-revenue-eod` | **PASS** (14/14) |
| `npm run verify:close-request-workflow` | **PASS** (24/24) — includes zero-revenue close (check 17) |
| `npm run verify:closing-request-approval-flow` | **PASS** (A–J) — includes zero-revenue approve (J) |
| `npm run verify:reports-branch-code-alignment` | **PASS** (10/10) — main/branch2 confirmed |

### Tests not run

- Manual browser walkthrough (no staff session with open business day in this agent run)
- Live save + hard browser reload E2E (covered by static persistence-path checks + close workflow API tests)

### Unrelated failures

None in executed suite.

---

## Safety confirmation

- No schema changes  
- No production data changes  
- No database reset or migration  
- No authorization weakening  
- No branch ID changes  
- No business-day or closing-approval logic changes (except owner review display of movie revenue)  
- Movie revenue > 0 **not** reintroduced as close blocker
