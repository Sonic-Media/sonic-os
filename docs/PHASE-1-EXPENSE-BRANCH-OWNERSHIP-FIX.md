# Phase 1 Fix #5 — Expense Update/Delete Branch Ownership

**Audit finding:** High #8  
**Status:** PASS  
**Branch:** `cursor/expense-branch-ownership-b6e7`  
**PR:** https://github.com/Sonic-Media/sonic-os/pull/13  
**Date:** 2026-09-10

---

## Executive Summary

Expense update and delete operations loaded a record by ID but did not verify that the **existing** record's branch belonged to the authenticated session's authorized scope. A staff user who knew a foreign expense ID could potentially modify or soft-delete records outside their branch.

This fix adds a server-side branch ownership check on the persisted record **before** any update or delete proceeds. It reuses the existing `assertSessionCanAccessBranchCode` helper — no new authorization system was introduced.

**Production data touched: NO** (authorization logic change only)

---

## Problem (Before)

| Operation | Vulnerability |
|-----------|---------------|
| `updateExpense` | Authorized writes using client-supplied `input.branch` only. Did not verify `existing.branchId` before modifying the record. A Salaama staff member could supply a Kansanga expense ID with `input.branch: "salaama"` and potentially alter or reassign the record. |
| `deleteExpense` | Loaded the expense by ID and checked day-open status, but performed **no branch scope check** on the existing record. A staff member could soft-delete an expense from another branch by ID alone. |

---

## Solution (After)

Both functions now call `assertSessionCanAccessBranchCode(session, existingBranchCode)` using the **persisted branch on the loaded record**, before validation completes or any write occurs.

| Function | Existing branch source | Check location |
|----------|------------------------|----------------|
| `updateExpense` | `existing.branch.code` (from Prisma include) | After session/role check, before input validation and write |
| `deleteExpense` | `getBranchCodeById(existing.branchId)` | After session/role/destructive guards, before soft-delete |

**Not changed:** expense creation, validation rules, calculations, audit logging, soft-delete mechanism, Prisma schema, or unrelated modules.

---

## Authorization Change

```
Load existing expense by ID
        ↓
Require authenticated session + operational role
        ↓
assertSessionCanAccessBranchCode(session, existingBranchCode)   ← NEW
        ↓
Existing validation (input, category, day-open, etc.)
        ↓
Write (update or soft-delete)
```

**Owner behavior:** Owners bypass branch checks via existing helper logic (`session.role === "owner"` returns early). Cross-branch authorization scope is preserved.

**Staff behavior:** Staff receive `403 branch_forbidden` with the generic message *"You can only access your assigned branch."* No foreign record details are leaked.

**Client-supplied branch:** `input.branch` on update is still used to resolve the **target** branch for the write (via `getBranchIdForSession`), but it is **not** used to authorize access to the existing record.

---

## Update Behavior

1. Load existing expense (with branch include)
2. Reject if not found or staff-payment expense
3. Require session; assert operational role
4. **Verify existing branch is in session scope**
5. Validate input and category
6. Assert branch day is open for write
7. Resolve target `branchId` via `getBranchIdForSession(session, input.branch)`
8. Persist update inside transaction; record audit

Foreign-branch update: rejected at step 4. Record is not modified.

---

## Delete Behavior

1. Load existing expense by ID
2. Reject if not found or staff-payment expense
3. Require session; assert operational role and destructive-ops guard
4. Resolve existing branch code
5. **Verify existing branch is in session scope**
6. Assert branch day is open for write
7. Soft-delete: set `deletedAt` on the record
8. Record delete audit

Foreign-branch delete: rejected at step 5. Record is not modified or soft-deleted.

---

## Soft-Delete Behavior

**Unchanged.** Authorized deletes still set `deletedAt` via `prisma.expenseRecord.update`. The Prisma soft-delete extension continues to hide soft-deleted records from `findUnique` / list queries. Foreign-branch delete attempts leave `deletedAt` null.

---

## Foreign-Branch Test Results

| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| A | Owner authorized for Kansanga (`main`) | Pass branch check | **PASS** |
| B | Owner authorized for Salaama | Pass branch check | **PASS** |
| C | Kansanga staff updates own Kansanga expense | 200, amount updated | **PASS** |
| D | Salaama staff updates Kansanga expense by ID | 403, record unchanged | **PASS** |
| E | Kansanga staff deletes Salaama expense by ID | 403 | **PASS** |
| F | Foreign delete leaves record intact | `deletedAt` null, amount unchanged | **PASS** |
| G | Authorized soft-delete still works | 200, `deletedAt` set, hidden from queries | **PASS** |
| H | Validation still rejects invalid input | 400 on negative amount | **PASS** |

---

## Files Changed

| File | Purpose |
|------|---------|
| `lib/server/services/expenses-service.ts` | Branch ownership checks in `updateExpense` and `deleteExpense` |
| `scripts/verify-expense-branch-ownership.ts` | Focused verification script (8 checks) |
| `package.json` | Added `verify:expense-branch-ownership` npm script |
| `docs/PHASE-1-EXPENSE-BRANCH-OWNERSHIP-FIX.md` | This document |

---

## Tests Run

```bash
npm run verify:expense-branch-ownership   # 8/8 PASS
npx tsc --noEmit                          # PASS
npm run build                             # PASS
npx eslint lib/server/services/expenses-service.ts \
         scripts/verify-expense-branch-ownership.ts   # PASS
```

Re-run verification:

```bash
npm run verify:expense-branch-ownership
```

Requires a running dev server at `http://localhost:3000` (or set `VERIFY_BASE_URL`).

---

## Out of Scope (Not Modified)

- Expense creation
- Prisma schema / migrations
- Backup, restore, reports, dashboard
- Branch-switch refetching, historical operations, day closing
- Sales, purchasing, staff payments, unrelated features

---

## Phase 1 Fix #5 Result

**PASS**

---

## Phase 1 Milestone Progress

| Fix | Finding | Status |
|-----|---------|--------|
| #1 | Server-side branch authorization | PASS |
| #2 | Historical save persistence | PASS |
| #3 | Close-day payout sequencing | PASS |
| #4 | Fire-and-forget mutations | PASS |
| **#5** | **Expense update/delete branch ownership** | **PASS** |
