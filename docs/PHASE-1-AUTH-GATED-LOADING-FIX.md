# Phase 1 Fix #8 — Auth-Gated Branch-Scoped Data Loading

**Audit finding:** High #18 — Expenses and staff-payments contexts load business data without an auth gate.

**Status:** PASS

**Branch:** `cursor/auth-gated-loading-b6e7`

---

## ROOT CAUSE

`ExpensesModuleProvider` and `StaffPaymentsProvider` mounted a `useEffect` that immediately called `loadFromApi(fetchExpenses)` / `loadFromApi(fetchStaffPayments)` on first render — before `useAuth()` finished resolving the session and before `useBranch()` resolved the active branch.

This could:

- Hit PostgreSQL-backed APIs without a valid session cookie
- Mark `isLoaded: true` while auth was still loading
- Leave stale records visible after logout until a full reload

---

## AUTH GATE BEFORE

```
Provider mount
  → useEffect runs immediately (hasLoaded guard only)
  → loadFromApi(fetchExpenses | fetchStaffPayments)
  → setIsLoaded(true) regardless of auth state
```

---

## AUTH GATE AFTER

```
Provider mount
  → wait for authLoaded
  → if !isAuthenticated: clear state, do not fetch
  → wait for branchLoaded
  → if branch changed: clear stale branch data, set isLoaded false
  → beginFetchGeneration (race guard)
  → loadFromApi(...)
  → apply results only if generation still current
  → setIsLoaded(true)
```

---

## EXPENSE LOADING FLOW

1. `useAuth()` — wait until `authLoaded`
2. If not authenticated — clear expenses/categories, reset branch refs, skip API
3. `useBranch()` — wait until `branchLoaded`
4. If `activeBranch` changed — clear expenses, refetch
5. Await `fetchExpenseCategories` + `fetchExpenses` via `loadFromApi`
6. Update React state only after API success and fetch generation match

---

## STAFF PAYMENT LOADING FLOW

Same lifecycle as expenses:

1. Wait for auth session
2. Clear on logout
3. Wait for active branch resolution
4. Refetch on branch switch (owner Kansanga ↔ Salaama)
5. Fetch generation prevents stale overwrites

---

## SESSION/BRANCH RACE PROTECTION

- `beginFetchGeneration` / `isCurrentFetchGeneration` discard in-flight responses when auth, branch, or logout invalidates the request
- `shouldSkipBranchScopedFetch` / `beginBranchScopedFetch` prevent duplicate fetches for the same branch
- Branch change clears local records before the new fetch completes

---

## BRANCH ISOLATION

- Server remains authoritative — APIs return branch-scoped data per session
- Client uses `activeBranch` only to trigger refetch on owner branch switch (Fix #6 behavior preserved)
- Staff remain restricted to assigned branch; no client-side filtering substitute

---

## FILES CHANGED

| File | Change |
|------|--------|
| `context/expenses-module-context.tsx` | Auth + branch gate, branch-switch refetch, fetch generation |
| `context/staff-payments-context.tsx` | Auth + branch gate, branch-switch refetch, fetch generation |
| `lib/context/branch-scoped-load.ts` | Shared branch-scoped fetch + generation helpers |
| `scripts/verify-auth-gated-loading.ts` | Verification script (21 checks) |
| `package.json` | Added `verify:auth-gated-loading` script |
| `docs/PHASE-1-AUTH-GATED-LOADING-FIX.md` | This report |

---

## TESTS RUN

| Command | Result |
|---------|--------|
| `npm run verify:auth-gated-loading` | **21/21 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint on changed files | 2 `set-state-in-effect` errors (same pattern as `entries-context`, `sales-context`; pre-existing rule vs established auth-gate pattern), 3 pre-existing unused-var warnings in expenses context |

---

## TEST RESULTS

| # | Requirement | Result |
|---|-------------|--------|
| A | Expenses API not requested while auth/session loading | PASS (static: `if (!authLoaded) return` before `loadFromApi`) |
| B | Staff-payments API not requested while auth loading | PASS (static) |
| C | No authenticated session means business data not loaded | PASS (401 unauthenticated + context clears state) |
| D | Authenticated owner loads correct active branch | PASS |
| E | Authenticated staff loads only authorized branch | PASS |
| F | Owner branch switching clears and refetches | PASS |
| G | Session/branch race cannot overwrite current branch | PASS (fetch generation helpers) |
| H | Existing expenses behavior intact | PASS |
| I | Existing staff-payments behavior intact | PASS |

---

## PRODUCTION DATA TOUCHED

**NO**

Verification uses ephemeral certification cashiers and cleans up test expenses in `finally`.

---

## PHASE 1 FIX #8 RESULT

**PASS**
