# Phase 1 Fix #6 — Branch-Switch Data Refresh

**Audit finding:** High #9 — Module data does not refresh when the owner switches branches.

**Status:** PASS

**Branch:** `cursor/branch-switch-refresh-b6e7`

---

## Problem

Sales, expenses, purchasing, staff payments, and entries contexts loaded data once per authentication session. When an owner switched between Kansanga and Salaama, cached arrays from the previous branch could remain visible until a full page reload.

Stock already refetched on `activeBranch` change; other operational modules did not.

---

## Solution

Each affected context now follows the stock-context pattern:

1. Track `lastFetchedBranch` alongside `hasLoaded`
2. Include `activeBranch` in the load `useEffect` dependency array
3. On branch change: **clear branch-scoped cached state**, set `isLoaded` false, refetch from API
4. On fetch failure: **clear cached records** and surface `loadError` (never present previous-branch data as current)

Shared helpers in `lib/context/branch-scoped-load.ts` coordinate skip/fetch/reset logic.

Server-side branch filtering (`resolveBranchListFilter` + owner active-branch preference) is unchanged — refetching after `setActiveBranchApi` returns the correct PostgreSQL-backed data.

---

## Modules Now Refreshing on Branch Switch

| Context | Branch-scoped data refetched |
|---------|------------------------------|
| `sales-context.tsx` | Sales (purchases refetch includes global suppliers) |
| `expenses-module-context.tsx` | Expenses (categories refetched; global config) |
| `purchasing-context.tsx` | Purchases |
| `staff-payments-context.tsx` | Staff payments |
| `entries-context.tsx` | Daily operations entries |

**Already correct:** `stock-context.tsx` (unchanged)

**Intentionally unchanged:** Product catalog (global/shared per existing design)

---

## Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Owner Kansanga → Salaama | Cached Kansanga sales/expenses still visible | Cache cleared; Salaama data fetched from API |
| Owner Salaama → Kansanga | Stale Salaama data until reload | Kansanga data refetched |
| Staff session | Locked to assigned branch (unchanged) | No spurious refetch; same branch |
| API refresh failure | Previous branch data could remain visible | Arrays cleared; error shown |

---

## Stale Data Protection

- Branch change clears in-memory arrays **before** the new fetch starts
- Failed fetch clears arrays and sets `loadError`
- No client-side `filterByActiveBranch`-only refresh for operational module lists

---

## Loading / Error Behavior

- `isLoaded` set to `false` when branch changes until the new fetch completes
- `loadError` populated on failure; stale records not retained

---

## Staff vs Owner Behavior

| Role | Behavior |
|------|----------|
| **Owner** | Can switch branches; each switch triggers API refetch for operational modules |
| **Staff** | `setActiveBranch` remains a no-op for non-switchable roles; data scoped to assigned branch |

---

## Files Changed

- `lib/context/branch-scoped-load.ts` (new)
- `context/sales-context.tsx`
- `context/expenses-module-context.tsx`
- `context/purchasing-context.tsx`
- `context/staff-payments-context.tsx`
- `context/entries-context.tsx`
- `scripts/verify-branch-switch-refresh.ts`
- `package.json`
- `docs/PHASE-1-BRANCH-SWITCH-REFRESH-FIX.md`

---

## Verification

```bash
npm run verify:branch-switch-refresh
npx tsc --noEmit
npm run build
```

**Production data touched: NO**
