# Sonic OS — Closing Request Submit Debug Report

**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Date:** 2026-09-13  
**PR:** [#39](https://github.com/Sonic-Media/sonic-os/pull/39) — **OPEN, NOT MERGED**  
**Schema changed:** No  
**Production touched:** No  

---

## Executive Summary

Preview manual testing showed staff **Submit for Closing** failing with a generic connection error while management saw no pending requests. Root cause: **client-side implementation bug** — cashiers cannot access `GET /api/branches`, so `activeBranches` stayed empty and `useStaffCloseDay` aborted before calling the API. Server path and management query were correct. Fixed by resolving branch metrics without the full branches catalog and seeding an assigned-branch fallback in branch context.

---

## Manual Reproduction (Preview — Before Fix)

| Step | Observation |
|------|-------------|
| Staff (Kansanga, Aug 24 2026, OPEN) | End of Day checklist shows Ready |
| Submit for Closing | Confirmation dialog appears |
| After submit | **"We couldn't submit the closing request. Check your connection and try again."** |
| Owner Home | **No closing requests pending** |

**Conclusion:** Request never reached PostgreSQL; failure was pre-API on the client.

---

## Root Cause

### Exact failure point

`hooks/use-staff-close-day.ts` computed closing metrics with:

```typescript
const branchEntity = activeBranches.find((item) => item.code === activeBranch);
if (!branchEntity) return null; // → generic submit error, NO POST
```

### Why `activeBranches` was empty for staff

1. Cashier role modules: `["operations", "sales"]` — **no `branches` module**
2. `GET /api/branches` returns **403 Forbidden** for cashiers
3. `BranchProvider` left `branches = []` after failed fetch
4. UI still showed **Kansanga** via `getBranchName()` default settings fallback
5. Checklist/sales/expenses worked (operations/sales APIs allowed)
6. Submit aborted at metrics gate — **POST `/api/day-closings` never fired**

### Why automated tests passed (false confidence)

Verify scripts call `POST /api/day-closings` directly with authenticated HTTP clients. They never exercised the browser hook's dependency on `activeBranches`. Server lifecycle was always correct.

### Management query

`ClosingRequestsPanel` → `getCloseRequestedRecords()` → `GET /api/day-closings`. Owner receives all branches. Empty panel was correct because no `close_requested` record existed.

---

## Fix

| File | Change |
|------|--------|
| `lib/branch/resolve-branch-entity.ts` | **New** — `resolveBranchEntityForMetrics`, assigned-branch fallback |
| `context/branch-context.tsx` | On branches fetch failure for staff, seed assigned branch fallback |
| `hooks/use-staff-close-day.ts` | Use metrics resolver; remove pre-API abort |
| `hooks/use-management-approve-close.ts` | Same resolver (branch managers also lack branches module) |
| `context/day-closing-context.tsx` | Dev console logging on submit failure |
| `lib/server/services/day-closings-service.ts` | Non-prod info log at submit start |
| `lib/ux/close-day-messages.ts` | Less misleading generic fallback copy |
| `scripts/verify-close-request-staff-catalog.ts` | **New** — reproduces cashier 403 + full lifecycle |

Close-day metrics only need `branch.code` for scoping; synthetic fallback entity is safe.

---

## Submission Path (After Fix)

```
StaffEndOfDayCard → handleCloseDay → useStaffCloseDay
  → resolveBranchEntityForMetrics (works without /api/branches)
  → day-closing-context submitCloseRequest
  → POST /api/day-closings { action: "submit-close-request", branch, date, metrics, ... }
  → submitCloseRequest() → DayClosing status = close_requested
  → Owner GET /api/day-closings → ClosingRequestsPanel
```

---

## Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:close-request-staff-catalog` | **PASS (9/9)** — cashier 403 + submit + management + approve |
| `npm run verify:closing-request-approval-flow` | **PASS (A–J)** |
| `npm run verify:close-request-workflow` | **PASS (24/24)** |
| `npm run verify:close-time-flexibility` | **PASS (24/24)** |
| `npm run verify:close-day-date` | **PASS (16/16)** |
| `npm run verify:final-open-day-guard` | **PASS (10/10)** |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:close-day-payouts` | **PASS** |

### Lifecycle (local)

| Test | Result |
|------|--------|
| A — Open business day | **PASS** |
| B — Staff submit → close_requested | **PASS** |
| C — Management query returns request | **PASS** |
| D — Management approves | **PASS** |
| E — DayClosing closed | **PASS** |
| F — Next day opens | **PASS** |
| G — Forgotten close blocked | **PASS** |
| H — After-midnight business date | **PASS** |
| I — Branch isolation | **PASS** |
| J — Zero revenue | **PASS** |

---

## Preview / Production

| Item | Status |
|------|--------|
| Local lifecycle | **PASS** |
| Preview manual retest after fix | **NOT RUN** |
| Production touched | **NO** |
| PR #39 merged | **NO** |

---

## PR #39 Safe to Merge?

**NO** — Preview manual lifecycle must be re-verified after this fix is deployed to Preview.

---

## Recommendation

1. Deploy fix to Vercel Preview
2. Re-test: staff cashier Submit for Closing → Closing Request Sent → owner Review → Approve & Close
3. Merge PR #39 only after Preview sign-off
