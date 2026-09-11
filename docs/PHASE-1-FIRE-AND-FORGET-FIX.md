# Phase 1 Fix #4 — Fire-and-Forget Mutations

**Finding:** High #7 — Widespread fire-and-forget mutations that report success before PostgreSQL confirms persistence.

**Status:** PASS

**Branch:** `cursor/fire-and-forget-mutations-b6e7`

---

## Problem

Multiple React context providers returned `{ success: true }` immediately, then persisted data in a detached `void (async () => runOnApi(...))()` block. The UI could show success while the PostgreSQL write was still in flight or had failed.

## Solution

For business-critical mutations in the scoped contexts:

1. **Await** the API/server operation via `runOnApi`.
2. Return success **only after** the API confirms persistence.
3. Propagate API/database errors to callers.
4. Update local React state **after** server confirmation (via refresh from API).
5. Preserve validation, permissions, branch authorization, and in-flight guards.

A shared helper `lib/data-source/awaited-mutation.ts` provides `runAwaitedMutation()` for consistent error wrapping where useful.

---

## Files Changed

| Area | File |
|------|------|
| Helper | `lib/data-source/awaited-mutation.ts` |
| Sales | `context/sales-context.tsx` |
| Purchasing | `context/purchasing-context.tsx` |
| Staff payments | `context/staff-payments-context.tsx` |
| Expenses | `context/expenses-module-context.tsx` |
| Staff | `context/staff-context.tsx` |
| Branches | `context/branch-context.tsx` |
| Auth | `context/auth-context.tsx` |
| Settings | `context/settings-context.tsx` |
| Expense templates | `context/expense-templates-context.tsx` |
| Close-day compatibility | `context/day-closing-context.tsx` (await `recordStaffPayment`) |
| UI callers | Dialogs/pages under `components/` and `app/` |
| Verification | `scripts/verify-awaited-mutations.ts` |
| Docs | `docs/PHASE-1-FIRE-AND-FORGET-FIX.md` |

---

## Mutations Fixed (Category A)

| Context | Mutations |
|---------|-----------|
| **Sales** | `addCustomer`, `updateCustomer`, `deleteCustomer`, `completeSale` (already awaited; guard preserved) |
| **Purchasing** | `addSupplier`, `updateSupplier`, `deleteSupplier`, `completePurchase` (already awaited; guard preserved) |
| **Staff payments** | `recordStaffPayment`, `recordStaffPaymentAsync` |
| **Expenses** | `addExpense`, `updateExpense`, `deleteExpense`, `addCategory`, `updateCategory`, `deleteCategory` |
| **Staff** | `updateStaff`, `linkStaffAccount`, `unlinkStaffAccount`, `deactivateStaff` |
| **Branches** | `addBranch`, `updateBranch`, `deactivateBranch`, `reactivateBranch` |
| **Auth** | `updateUser`, `disableUser`, `enableUser`, `logout`, `lock` |
| **Settings** | `updateSettings` (with epoch guard against stale overwrites) |
| **Expense templates** | `addTemplate`, `updateTemplate`, `deleteTemplate`, `deactivateTemplate` |

---

## Mutations Intentionally Left as Background (Category B)

| Pattern | Reason |
|---------|--------|
| Initial `useEffect` data loads (`void (async () => loadFromApi(...))`) | Read path, not a business mutation |
| `recordStaffAction` / `recordActivity` after confirmed writes | Audit logging; non-blocking by design |
| Branch preference hydration from session (`branch-context.tsx`) | UI/session bootstrap, not persisted business record mutation |
| `stock-context.tsx`, `entries-context.tsx` delete | Out of Fix #4 scope per audit instructions |

---

## Before vs After Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Create customer | UI gets `success: true` immediately; DB write may fail silently | UI waits for API; `success: true` only after PostgreSQL confirms |
| API/network failure | Caller often unaware; local state may look saved | Caller receives `{ success: false, error }` or validation errors |
| Settings typing | Each keystroke fired background save with immediate success | Each save awaits API; stale concurrent saves rejected by epoch guard |
| Close-day staff payout | Sync check on Promise object (broken after async change) | Awaits `recordStaffPayment` before proceeding |

---

## Error Propagation

- API failures are caught and returned as `{ success: false, error: string }` or existing validation result shapes (`errors.form`, etc.).
- Errors are **not** silently swallowed.
- `logout`/`lock` log to console on failure but still clear/retain session state appropriately (session endpoints, not business record CRUD).

---

## Concurrency / Duplicate-Submission Protection

| Guard | Location | Behavior |
|-------|----------|----------|
| `saleInFlight` | `sales-context.tsx` | Blocks second `completeSale` while first is in flight |
| `purchaseInFlight` | `purchasing-context.tsx` | Blocks second `completePurchase` while first is in flight |
| `settingsUpdateEpoch` | `settings-context.tsx` | Rejects stale settings save if a newer update started |

---

## Tests

```bash
npm run verify:awaited-mutations
npx tsc --noEmit
npm run build
npx eslint <changed files>
```

Verification script checks:

- No fire-and-forget success patterns in scoped contexts
- Representative mutations await API calls
- Success only after API completion
- Failure propagation
- Validation blocks API when invalid
- In-flight and epoch guards

---

## Production Data Touched

**NO** — Code and verification script only.
