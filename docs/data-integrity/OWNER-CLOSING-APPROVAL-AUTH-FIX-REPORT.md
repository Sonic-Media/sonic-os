# Owner Closing Request Approval Authorization Fix

**Branch:** `cursor/owner-closing-approval-auth-b6e7`  
**Date:** 2026-09-14  
**Base branch:** `main`

---

## Problem

Staff could submit closing requests successfully, and owners could view pending requests in Mission Control and open the Review Closing Request modal. When the owner clicked **Approve & Close Day**, the UI showed:

> You don't have permission to perform this closing action.

This blocked the intended two-step close workflow at the management approval step.

---

## Root cause

Approval authorization (`assertCanApproveAndClose`) was **correct** — owners are allowed to approve.

The failure occurred **after** that check, during `approveAndCloseDay()` → `syncClosedDayDailyOperation()` → `upsertDailyOperation()`.

`upsertDailyOperation()` unconditionally called:

```typescript
assertOwnerCannotEditTodayOperations(session, entry.date);
```

That guard blocks owners from mutating operational records when `entry.date === getTodayISO()`. Approving a closing request for **today's open business day** triggers a closed-day daily operation sync on that same date, so owners were rejected with:

> Owners cannot edit today's operational records. (`403 forbidden`)

This was mapped client-side to the generic permission message.

**Not the cause:** role detection, branch selection in UI, or `canApproveAndClose` — all were correct. The bug was applying the **staff operational edit guard** to the **management close-sync path**.

---

## Exact fix (minimal)

1. **`lib/server/services/daily-operations-service.ts`**  
   Added optional flag `allowOwnerManagementClose` to `upsertDailyOperation()`. When set, skip `assertOwnerCannotEditTodayOperations()`.

2. **`lib/day-closing/sync-daily-operation.ts`**  
   Pass `allowOwnerManagementClose: true` when syncing the closed-day daily operation during approve-close.

**Unchanged:**
- `assertCanApproveAndClose()` — still requires owner or branch-manager
- Staff still cannot approve (`403 forbidden`)
- Owner still cannot directly edit today's operational records via `/api/daily-operations`
- Financial calculations, close-request submission, branch isolation

---

## Security considerations

| Action | Owner | Staff |
|--------|-------|-------|
| Submit close request | Blocked (by design) | Allowed |
| Approve & close pending request | **Allowed (fixed)** | Blocked |
| Direct edit today's daily operation | Blocked (unchanged) | Allowed (branch rules) |

The bypass applies **only** to the closed-day sync invoked from approve-close, not to general daily operation writes.

---

## Schema / production data

**Schema changes:** None  
**Production data touched:** No

---

## Files changed

| File | Change |
|------|--------|
| `lib/server/services/daily-operations-service.ts` | `allowOwnerManagementClose` option |
| `lib/day-closing/sync-daily-operation.ts` | Enable flag for close sync |
| `scripts/verify-owner-closing-approval-auth.ts` | Owner approval auth regression tests |
| `package.json` | `verify:owner-closing-approval-auth` script |
| `docs/data-integrity/OWNER-CLOSING-APPROVAL-AUTH-FIX-REPORT.md` | This report |
| `docs/data-integrity/OWNER-CLOSING-APPROVAL-AUTH-FIX-REPORT.docx` | DOCX export |

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:owner-closing-approval-auth` | **PASS** (A, B, C/D, E, F, H, I, security) |
| `npm run verify:close-request-workflow` | **PASS** (24 checks) |
| `npm run verify:close-day-date` | **PASS** (16 checks) |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** (10 checks) |
| `npm run verify:close-day-payouts` | **PASS** |

## Test matrix (owner approval verifier)

| Case | Result |
|------|--------|
| A. Owner + Kansanga → approve | **PASS** |
| B. Owner + Salaama → approve | **PASS** |
| C/D. Owner approves using request branch (not UI branch) | **PASS** |
| E. Staff submit request | **PASS** |
| F. Staff approve → rejected | **PASS** |
| H. Already-closed → rejected | **PASS** |
| I. Non-pending open day → rejected | **PASS** |
| Security: owner direct daily-op edit today → rejected | **PASS** |

## Tests not run

| Test | Reason |
|------|--------|
| Production Preview browser E2E with Kevin (owner) | Not executed in this agent run |

---

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS** (all required verifiers run in this session)
