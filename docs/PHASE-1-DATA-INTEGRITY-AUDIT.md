# Sonic OS — Phase 1: Database Source of Truth Audit

**Date:** 10 September 2026  
**Milestone:** Data Integrity (Phase 1)  
**Mode:** Inspection only — no code, schema, migrations, or database data was modified.

---

## Executive Summary

Sonic OS is designed as an **API-first application**. Business modules load data through `loadFromApi` / `runOnApi` (`lib/data-source/context-api.ts`), which requires `NEXT_PUBLIC_USE_API=true` and a live database connection (`/api/health`). React context holds an **in-memory cache** of API responses. **PostgreSQL is the intended authority**; the browser is not.

This audit inspected the full repository for places where client state, localStorage, cached data, or unvalidated API inputs could undermine PostgreSQL as the single source of truth.

---

## Phase 1 Result: **FAIL**

There are **CRITICAL** server-side branch-validation gaps and **HIGH** client write paths that can report success before PostgreSQL confirms persistence. PostgreSQL is the design intent and works for most happy paths, but integrity is **not guaranteed end-to-end** under adversarial requests or race conditions.

---

## Critical Findings

### 1. Daily operations accept client branch without session validation

| | |
|---|---|
| **File** | `lib/server/services/daily-operations-service.ts` |
| **Functions** | `upsertDailyOperation`, `importDailyOperations`, `deleteDailyOperation`, `removeDailyOperationsByIds` |
| **Current behavior** | Uses `getBranchIdByCode(entry.branch)` with no `getBranchIdForSession` / `assertSessionCanAccessBranchCode`. Deletes by ID with no branch ownership check. Bulk delete has no branch filter. |
| **Risk** | Staff can create, update, or delete daily operations for another branch by spoofing `branch` in the API body. |
| **Recommended fix** | Use `getBranchIdForSession` on writes; assert record `branchId` on update/delete; scope bulk delete to owner + branch filter. |
| **Production data impact** | Authorization-only fix; no migration or data rewrite. |

### 2. Day closing operations accept client branch without session validation

| | |
|---|---|
| **File** | `lib/server/services/day-closings-service.ts` |
| **Functions** | `openDay`, `closeDay`, `reopenDay`, `ensureDailyOperationDraft` |
| **Current behavior** | Resolves branch via `getBranchIdByCode(parsed.branch)` only. |
| **Risk** | Staff can open, close, or reopen another branch’s day state via direct API calls. |
| **Recommended fix** | Replace with `getBranchIdForSession(session, parsed.branch)`. |
| **Production data impact** | Authorization-only fix. |

### 3. Attendance accepts client branch without access check

| | |
|---|---|
| **File** | `lib/server/services/attendance-service.ts` |
| **Functions** | `recordAttendanceAction`, `assertBranchDayOpen` |
| **Current behavior** | Client `branch` is used for day-open checks and audit writes; no branch access validation. |
| **Risk** | Cross-branch attendance and audit records. |
| **Recommended fix** | Validate branch via `getBranchIdForSession` before any write. |
| **Production data impact** | Authorization-only fix. |

### 4. Historical save does not await PostgreSQL persistence

| | |
|---|---|
| **File** | `hooks/use-entry-form.ts` |
| **Functions** | `handleSave`, `promoteToCompletedSync` |
| **Current behavior** | Calls `upsertEntry()` and `promoteToCompletedSync()` **without `await`**, then immediately `router.push()`. (`upsertEntry` does persist via API when awaited.) |
| **Risk** | User navigates away believing save succeeded while the API may still be in flight or may have failed; completed status may never reach PostgreSQL; autosave race can overwrite. |
| **Recommended fix** | `await upsertEntry(completed)` before navigation; surface API errors to the user. |
| **Production data impact** | No schema change; prevents silent data loss going forward. |

### 5. Bulk delete of historical operations is not owner-only

| | |
|---|---|
| **Files** | `app/api/daily-operations/bulk-delete/route.ts`, `lib/server/security/permissions.ts` |
| **Current behavior** | Route is not in `OWNER_ONLY_PREFIXES`; any user with operations module access can bulk-delete by ID across all branches. |
| **Risk** | Destructive cross-branch deletion of financial history. |
| **Recommended fix** | Add to owner-only paths; add branch scoping for non-owners. |
| **Production data impact** | Authorization-only fix. |

---

## High Findings

### 6. Close-day pays staff before confirming PostgreSQL success

| | |
|---|---|
| **Files** | `context/day-closing-context.tsx` → `recordStaffPayment` in `context/staff-payments-context.tsx` |
| **Current behavior** | `closeDay` calls synchronous `recordStaffPayment()`, which returns `{ success: true }` immediately via `void (async () => ...)` while the API runs in the background. `closeDayApi` is awaited afterward. |
| **Risk** | Staff payments may persist while day close fails → partial close, cash reconciliation mismatch, duplicate payouts on retry. |
| **Recommended fix** | Use existing `recordStaffPaymentAsync` and await all payouts before `closeDayApi`. |
| **Production data impact** | Behavior fix only. |

### 7. Widespread fire-and-forget mutations return success before server confirms

| | |
|---|---|
| **Files** | `context/expenses-module-context.tsx`, `context/sales-context.tsx` (customers), `context/purchasing-context.tsx` (suppliers), `context/staff-payments-context.tsx`, `context/staff-context.tsx`, `context/branch-context.tsx`, `context/auth-context.tsx`, `context/settings-context.tsx`, `context/expense-templates-context.tsx` |
| **Current behavior** | Pattern: `return createValidationResult({})` then `void (async () => { await runOnApi(...) })`. |
| **Risk** | UI reports success while PostgreSQL write may fail; stale React cache is shown as truth. |
| **Recommended fix** | Standardize on await + error propagation (like `completeSale`, `upsertEntry` when awaited). |
| **Production data impact** | UX/consistency only. |

### 8. Expense update/delete lack branch ownership enforcement

| | |
|---|---|
| **File** | `lib/server/services/expenses-service.ts` |
| **Functions** | `updateExpense`, `deleteExpense` |
| **Current behavior** | Loads record by ID; uses `getBranchIdForSession` for new branch on update but never verifies the existing record belongs to the session’s allowed branches. |
| **Risk** | Staff with a foreign expense UUID can edit or delete another branch’s expense. |
| **Recommended fix** | Assert `existing.branchId` is in session scope before mutate. |
| **Production data impact** | Authorization-only fix. |

### 9. No data refresh on branch switch (except stock)

| | |
|---|---|
| **Files** | `context/sales-context.tsx`, `context/expenses-module-context.tsx`, `context/purchasing-context.tsx`, `context/staff-payments-context.tsx`, `context/entries-context.tsx` |
| **Current behavior** | Load once per auth session; hooks filter cached arrays by `activeBranch` client-side. Only `context/stock-context.tsx` refetches on branch change. |
| **Risk** | After owner switches branch, UI shows stale data from initial load until full page reload. Server list APIs **are** branch-scoped via session preference, but the client cache is not refreshed. |
| **Recommended fix** | Refetch module contexts on `activeBranch` change (or call a shared `refreshAll`). |
| **Production data impact** | None on DB; fixes display correctness. |

### 10. Import undo removes entries from UI before delete completes

| | |
|---|---|
| **Files** | `context/entries-context.tsx` (`removeEntriesByIds`), `hooks/use-historical-import.ts` |
| **Current behavior** | Optimistically filters local state, returns `removedCount` immediately; API delete runs asynchronously. |
| **Risk** | Undo reports success while PostgreSQL delete may fail. |
| **Recommended fix** | Await `bulkDeleteDailyOperationsApi` before updating state or returning success. |
| **Production data impact** | None on existing data. |

---

## Medium Findings

### 11. Day-closing gates use in-memory cache, not live DB

| | |
|---|---|
| **File** | `lib/day-closing/storage.ts` |
| **Functions** | `isBranchDayOpened`, `isBranchDayClosed`, `getClosedDayRecord` |
| **Current behavior** | Module-level `cachedClosings` array; synced from `day-closing-context` via `setDayClosingsCache`. |
| **Risk** | Sales, expenses, purchasing, and stock gate checks may disagree with PostgreSQL if cache is stale or load failed. |
| **Recommended fix** | Query day-closing state from refreshed context or enforce server-side guards on all gated writes. |
| **Production data impact** | None. |

### 12. Branch selection: localStorage is fallback; server is authoritative for writes

| | |
|---|---|
| **File** | `context/branch-context.tsx` |
| **Current behavior** | Owner preference stored in `UserPreference.activeBranchCode` (server) plus `sonic-os-active-branch` (localStorage). `setActiveBranch` calls `setActiveBranchApi` **before** updating local state (correct). Staff are locked to `session.branch`. |
| **Risk** | On first load, localStorage can briefly disagree with server preference until `/api/auth/session` returns. Writes auto-inject branch via `mergeActiveBranchIntoBody` (`lib/api/branch-request.ts`). |
| **Recommended fix** | Prefer server preference exclusively on init; treat localStorage as display cache only. |
| **Production data impact** | None. |

### 13. Owner dashboard may double-count operating expenses

| | |
|---|---|
| **File** | `hooks/use-branch-state.ts` |
| **Current behavior** | `operatingExpenses = moduleOperatingExpenses + entryOperatingExpenses` (expense records plus daily-operation expense lines). |
| **Risk** | If the same costs exist in both modules, owner KPIs overstate expenses. Display issue, not write integrity. |
| **Recommended fix** | Document single source per expense type or deduplicate in calculation. |
| **Production data impact** | Display only. |

### 14. Reports page bypasses server reports API

| | |
|---|---|
| **Files** | `app/reports/page.tsx`, `hooks/use-reports.ts` vs `app/api/reports/summary/route.ts` |
| **Current behavior** | UI aggregates from `EntriesContext` client-side; `/api/reports/summary` exists but is only used in verify scripts. |
| **Risk** | Stale client cache can produce wrong report totals; server path is fresher. |
| **Recommended fix** | Fetch from `/api/reports/summary` or refetch entries before reporting. |
| **Production data impact** | None. |

### 15. Legacy localStorage keys not fully purged on login

| | |
|---|---|
| **File** | `lib/auth-storage.ts` → `clearSession()` |
| **Current behavior** | Clears many legacy keys on login but **not** all constants (e.g. `SALES_CUSTOMERS_STORAGE_KEY`, `STOCK_PRODUCTS_STORAGE_KEY`, `EXPENSES_CATEGORIES_STORAGE_KEY` in `lib/constants.ts`). |
| **Risk** | Pre-migration installs may retain old financial data in the browser (not read by current app, but data-at-rest exposure on shared devices). |
| **Recommended fix** | Expand `clearSession()` to all legacy `*_STORAGE_KEY` constants. |
| **Production data impact** | Browser-only cleanup. |

### 16. Historical import undo metadata in localStorage

| | |
|---|---|
| **File** | `lib/historical-import/undo-storage.ts` |
| **Current behavior** | Stores `{ entryIds, importedCount }` for one-shot undo of imported daily operations. |
| **Risk** | Stale undo snapshot could trigger bulk delete of wrong IDs on a shared machine (compounded by Critical #5). |
| **Recommended fix** | Store undo metadata server-side or scope to user/session; fix bulk-delete authorization first. |
| **Production data impact** | None if undo validates server-side. |

### 17. Staff payments: branch not validated against session

| | |
|---|---|
| **File** | `lib/server/services/staff-payments-service.ts` → `createStaffPayment` |
| **Current behavior** | Branch derived from target staff record; no check that session may access that staff’s branch. |
| **Risk** | Branch manager could pay staff from another branch if they know `staffId`. |
| **Recommended fix** | `assertSessionCanAccessBranchCode(session, staff.branch.code)`. |
| **Production data impact** | Authorization-only fix. |

### 18. Expenses and staff-payments contexts load without auth gate

| | |
|---|---|
| **Files** | `context/expenses-module-context.tsx`, `context/staff-payments-context.tsx` |
| **Current behavior** | Fetch on mount regardless of auth; `hasLoaded` prevents retry after login without remount. |
| **Risk** | Empty or stale cache after login until manual refresh. |
| **Recommended fix** | Gate load on `isAuthenticated` like `entries-context`. |
| **Production data impact** | None. |

---

## Low Findings

### 19. Activity log and staff audit use in-memory caches

| | |
|---|---|
| **Files** | `lib/activity-log.ts`, `lib/staff/audit.ts` |
| **Current behavior** | Append to module cache; persist via API fire-and-forget. |
| **Risk** | UI shows actions not yet (or never) in PostgreSQL audit tables. |
| **Recommended fix** | Await persistence or mark pending state in UI. |
| **Production data impact** | None. |

### 20. `DEFAULT_STAFF` dead constants

| | |
|---|---|
| **File** | `lib/constants.ts` |
| **Current behavior** | Sample staff array defined but never imported by runtime UI. |
| **Risk** | Confusing for audits; no production display path found. |
| **Recommended fix** | Remove or move to test fixtures only. |
| **Production data impact** | None. |

### 21. Default template amounts (not dashboard data)

| | |
|---|---|
| **Files** | `lib/constants.ts` (`defaultLunchAmount: 3000`), expense templates |
| **Current behavior** | Form prefill defaults only. |
| **Risk** | Low — not used in KPI calculations. |
| **Production data impact** | None. |

### 22. Verify/cert scripts use hardcoded financial assertions

| | |
|---|---|
| **Files** | `scripts/verify-*.ts` |
| **Current behavior** | Create `cert-*` records via API, assert against known totals, clean up. |
| **Risk** | None in production UI; some scripts refuse Neon by design. |
| **Production data impact** | None if not run against production. |

### 23. Documentation drift

| | |
|---|---|
| **File** | `docs/POSTGRES_MIGRATION.md` |
| **Current behavior** | May still describe localStorage paths for day closings. |
| **Risk** | Operational confusion only. |
| **Production data impact** | None. |

---

## Already Safe

| Area | Evidence |
|------|----------|
| **No active localStorage for business records** | Sales, expenses, stock, purchases, payments, entries, and closings load/save via API only. `lib/*-storage.ts` files are normalize/sort helpers. |
| **API required for business I/O** | `loadFromApi` throws if `NEXT_PUBLIC_USE_API` is false or DB is unavailable — no silent localStorage fallback. |
| **Session auth server-side** | HTTP cookie `sonic-os-session-token`; validated in DB (`lib/server/session.ts`). Not stored in localStorage. |
| **List reads branch-scoped server-side** | `resolveBranchListFilter` / `resolveOperationsListFilter` on GET routes for sales, purchases, expenses, stock, staff-payments, reports. |
| **Strong write validation (stock, sales, purchases, expense create)** | `getBranchIdForSession` / `resolveStockBranchIdForSession` in stock, sales, purchasing, and expense create paths. |
| **Stock cannot go negative** | `assertSufficientBranchStock` plus check in `lib/server/stock-transactions.ts`. |
| **Product branch enforced on stock writes** | `requireProductInActiveBranch` validates product belongs to active branch. |
| **Transactions for multi-step writes** | Daily op upsert, sales, purchases, expenses use `prisma.$transaction`. |
| **Soft deletes** | Products, sales, expenses use `deletedAt` — not hard-deleted from business tables. |
| **Branch FK restrict** | Schema prevents branch deletion while dependent records exist. |
| **Owner branch switch persists server-first** | `setActiveBranchApi` called before local state in `branch-context.tsx`. |
| **Awaited persistence paths** | `upsertEntry` (when awaited), `completeSale`, `completePurchase`, stock CRUD, `importEntries`. |
| **No mock financial data in dashboard UI** | KPIs derived from API-loaded context; placeholders show "—" or "Coming Soon", not fake UGX amounts. |
| **Login clears most legacy keys** | `clearSession()` on login/session restore in `auth-context.tsx`. |
| **Production guards** | Destructive ops require confirmation in production mode; business reset is owner-only. |

---

## Recommended Fix Order

1. **Server branch validation** — daily operations, day closings, attendance (Critical #1–3, #5)
2. **Historical save await** — `handleSave` must await PostgreSQL (Critical #4)
3. **Close-day payout sequencing** — await `recordStaffPaymentAsync` (High #6)
4. **Expense update/delete branch scope** (High #8)
5. **Bulk delete owner-only + branch filter** (Critical #5)
6. **Branch-switch refetch** for all module contexts (High #9)
7. **Standardize mutations** — remove fire-and-forget success returns (High #7)
8. **Day-closing cache vs DB alignment** (Medium #11)
9. **Expand legacy localStorage cleanup** (Medium #15)
10. **Reports API wiring / entry refetch** (Medium #14)
11. **Owner dashboard expense deduplication** (Medium #13)
12. **Low-priority cleanup** — dead constants, docs, audit cache behavior

---

## Pending Work Note

Fixes for several Critical and High items exist on branch `cursor/data-integrity-audit-b6e7` (PR #8) and backup fixes on PR #7. **This audit reflects the current main-branch codebase** where those gaps are still present unless those PRs have been merged. Review findings above before authorizing fixes or merges.

---

## Audit Constraints (Observed)

- No code was modified
- No PR was created for this audit
- No production data was modified, reset, or wiped
- No destructive commands were run
- No `prisma db push` or `prisma migrate reset`
- No schema or migration changes

---

## Shareable Summary

**Verdict:** Phase 1 **FAIL** — PostgreSQL is the architectural source of truth, but critical authorization gaps and client-side success reporting prevent calling the system production-safe for financial records until fixes are applied and verified.

**Top three blockers:**

1. Server APIs that accept client `branch` without session validation (daily ops, day closings, attendance)
2. Historical save navigation without awaiting PostgreSQL persistence
3. Fire-and-forget client mutations that report success before the database confirms

**Next step:** Review this document, authorize fixes in recommended order, then re-run Phase 1 verification after merge.
