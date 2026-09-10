# Phase 1 Fix #5 — Expense Update/Delete Branch Ownership

**Finding:** High #8 — Expense update/delete must verify the existing record belongs to an authorized branch.

**Status:** PASS

**Branch:** `cursor/expense-branch-ownership-b6e7`

---

## Problem

`updateExpense` and `deleteExpense` loaded an expense by ID but authorized writes using the client-supplied branch (update) or only checked day-open status (delete). A staff user who knew a foreign expense ID could modify or soft-delete records outside their branch scope.

## Solution

After loading the existing expense and establishing the session, both functions now call `assertSessionCanAccessBranchCode(session, existingBranchCode)` using the **persisted** branch on the record (`existing.branch.code` for update, `getBranchCodeById(existing.branchId)` for delete).

This reuses the existing branch authorization helper — no parallel authorization system.

---

## Authorization Change

| Function | Before | After |
|----------|--------|-------|
| `updateExpense` | Authorized via `input.branch` only | Verifies `existing.branch.code` before any write |
| `deleteExpense` | No branch scope check on existing record | Verifies existing branch before soft-delete |

Owners bypass branch checks (existing `assertSessionCanAccessBranchCode` behavior).

Staff receive `403 branch_forbidden` with a generic message — no foreign record details leaked.

---

## Files Changed

- `lib/server/services/expenses-service.ts`
- `scripts/verify-expense-branch-ownership.ts`
- `package.json` (`verify:expense-branch-ownership`)
- `docs/PHASE-1-EXPENSE-BRANCH-OWNERSHIP-FIX.md`

---

## Verification

```bash
npm run verify:expense-branch-ownership
npx tsc --noEmit
npm run build
```

**Production data touched: NO**
