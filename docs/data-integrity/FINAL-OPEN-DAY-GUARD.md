# Final Open-Day Guard

**Date:** 2026-09-12  
**Branch:** `cursor/final-open-day-guard-b6e7`  
**PR:** #37  
**Final result:** **PASS**

---

## Merge Reconciliation (PR #36 + PR #37)

- **PR #36** (*Targeted Go-Live UX: All Branches + Reports date picker*) was **merged into `main`** before this branch was updated.
- **PR #37** (*Final Open-Day Guard*) was **reconciled against current `main`** on branch `cursor/final-open-day-guard-b6e7`.
- **Merge conflict:** `package.json` only — resolved by keeping **both** verify scripts:
  - `verify:targeted-go-live-ux` (from PR #36)
  - `verify:final-open-day-guard` (from PR #37)
- **Additional fix after merge:** `lib/server/branch-lookup.ts` now tries all equivalent branch codes (`salaama` / `branch2`) when resolving DB branch IDs, so PR #36 alias compatibility works in environments where PostgreSQL stores either code.

**Preserved from PR #36 (now on main):**
- Owner Reports: All Branches / Kansanga / Salaama
- Reports exact business-date calendar picker
- `salaama` → `branch2` alias in `lib/branch/codes.ts`
- Clock-in clarity messaging

**Preserved from PR #37 (this PR):**
- One open business day per branch
- `previous_business_day_open` guard on `openDay`, `openWithShift`, `reopenDay`
- Branch isolation; no midnight auto-close

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

`openDay` and `openWithShift` only checked the **requested calendar date's** `DayClosing` row. They did not inspect whether **another date** for the same branch was already open with `openedAt` / `reopenedAt`.

Close Day already used a branch-wide open lookup via `resolveOpenBusinessDateForClose`; Open Shop did not reuse that guard.

---

## Implementation

**File:** `lib/server/services/day-closings-service.ts`

1. `findActiveOpenBusinessDays(branchId)` — shared query (same criteria as close-day resolution)
2. `assertCanOpenRequestedBusinessDay(branchId, requestedDate)` — throws `409` / `previous_business_day_open` when another date is still open
3. Guard applied to `openDay`, `openWithShift`, and `reopenDay`

**Error message example:**

> Previous business day still open. Close Monday's business day before opening Tuesday.

**File:** `lib/ux/staff-messages.ts` — passes through `previous_business_day_open` to staff UI

**File:** `lib/server/branch-lookup.ts` — equivalent-code fallback for `salaama` / `branch2` DB codes (post-merge)

**Verifiers:**
- `scripts/verify-final-open-day-guard.ts` (new)
- `scripts/verify-close-day-date-consistency.ts` — stale-day cleanup adjustments

---

## Tests and Results (after merge reconciliation)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| `npm run verify:close-day-date` | **PASS** (16/16) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:reports-branch-code-alignment` | **PASS** (10/10) |
| `npm run verify:reports` | **PASS** (6/6) |
| `npm run verify:targeted-go-live-ux` | **PASS** (11/11) |

---

## Production Impact

- **Code change required:** Yes  
- **Schema changes:** None  
- **Production data mutations:** None  
- **prisma db push:** Not run  
- **PR #37 not merged or deployed** — branch updated and ready for review only

---

## Intentionally Left Unchanged

- Midnight auto-close behavior  
- Close Day business-date resolution logic  
- Broader data-integrity suites  
- Mission Control and attendance flows

---

## Code Change Required?

**Yes.** Open-day guard in `day-closings-service.ts`, staff messages, branch-lookup equivalent-code fallback, and merge conflict resolution in `package.json`.
