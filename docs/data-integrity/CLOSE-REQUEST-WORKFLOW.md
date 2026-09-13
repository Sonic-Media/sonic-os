# Close Request Workflow — Certification Report

**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Date:** 2026-09-13  
**PR:** #39 (OPEN — not merged)  
**Schema changed:** No  
**Migrations created:** No  

---

## Summary

Implemented the two-step business-day closing workflow:

1. **Staff** finish operations → **Submit for Closing** → `close_requested`
2. **Authorized management** review → **Approve & Close** → `closed`

Transactions remain real persisted records. Only the business-day closing state changes.

Also preserved: no time-of-day close restriction, business-date rules, previous-day guard, branch auth, error propagation from `74c5c62`, and login credential-hint removal from `04b6c90`.

---

## Previous Workflow

Staff (or management via Close Day workspace) could perform a **single-step final close** directly via `POST /api/day-closings` → `closeDay()` → immediate `closed` status.

---

## New Workflow

| Role | Action | Result |
|------|--------|--------|
| Cashier / branch-manager (staff) | Submit for Closing | `close_requested` |
| Owner / branch-manager (management) | Approve & Close | `closed` + `closedAt` server timestamp |

Business-day states: `open` → `close_requested` → `closed`

Close-request metadata stored in existing `summary` JSON (`closeRequest.submittedBy`, `submittedByName`, `submittedAt`) — no Prisma schema change.

---

## Files Changed

### Server / API
- `types/day-closing.ts` — added `close_requested` status
- `lib/day-closing/permissions.ts` — `canSubmitCloseRequest`, `canApproveAndClose`
- `lib/day-closing/close-request.ts` — **new** summary helpers
- `lib/day-closing/business-date.ts` — active day includes `close_requested`
- `lib/day-closing/storage.ts` — UI cache helpers for close-request state
- `lib/day-closing/sync-daily-operation.ts` — allow sync during approve
- `lib/server/day-closing-guards.ts` — submit/approve guards; `assertBranchDayNotClosedForWrite`
- `lib/server/services/day-closings-service.ts` — `submitCloseRequest`, `approveAndCloseDay`
- `lib/server/services/daily-operations-service.ts` — `allowCloseRequested` upsert option
- `app/api/day-closings/route.ts` — `submit-close-request`, `approve-close` actions
- `lib/api/day-closings.ts` — client API helpers

### Client / UI
- `context/day-closing-context.tsx` — `submitCloseRequest`, `approveAndClose`
- `hooks/use-staff-close-day.ts` — staff submit flow
- `hooks/use-staff-operations-refresh.ts` — **new** polling while request pending
- `hooks/use-management-approve-close.ts` — **new** management approve hook
- `hooks/use-branch-state.ts` — `close_requested` status
- `components/operations/staff/staff-end-of-day-card.tsx` — Submit / Closing Request Sent UI
- `components/operations/staff/close-day-confirm-dialog.tsx` — submit vs approve modes
- `components/operations/staff/staff-operations-workspace.tsx` — wired submit + refresh
- `components/operations/close-day-workspace.tsx` — management approve path
- `components/dashboard/owner/mission-control-close-requests.tsx` — **new** Close Requests panel
- `components/dashboard/owner/mission-control-end-of-day.tsx` — pending status copy
- `components/dashboard/owner/owner-dashboard-layout.tsx` — Close Requests placement
- `lib/ux/close-day-messages.ts` — close-request error codes

### Tests / scripts
- `scripts/verify-close-request-helpers.ts` — **new**
- `scripts/verify-close-request-workflow.ts` — **new** (20 checks)
- `scripts/verify-close-time-flexibility.ts` — two-step close flow
- `scripts/verify-close-day-date-consistency.ts` — two-step close flow
- `scripts/verify-final-open-day-guard.ts` — two-step close before next open
- `package.json` — `verify:close-request-workflow`

### Reports
- `docs/data-integrity/CLOSE-REQUEST-WORKFLOW.md` (this file)
- `docs/data-integrity/CLOSE-REQUEST-WORKFLOW.docx`

---

## Permission Model

| Action | Owner | Branch Manager | Cashier |
|--------|-------|----------------|---------|
| Submit close request | No | Yes | Yes |
| Approve & close | Yes | Yes | No |
| Reopen closed day | No | Yes | No |

All enforced server-side via `assertCanSubmitCloseRequest` / `assertCanApproveAndClose`.

---

## Staff Flow

- End of Day card shows **Submit for Closing**
- Confirmation dialog explains operations are saved; request goes for review
- After submit: **Closing Request Sent** + “Your request is awaiting review.”
- Duplicate submits blocked (`close_request_already_pending`)
- Records blocked while pending (`close_request_pending`)
- Auto-refresh via `useStaffOperationsRefresh` while pending

---

## Management Flow

- **Close Requests** panel on Mission Control dashboard
- Compact cards: branch, business date, submitted by, sales/expenses/wages/cash
- **Review & Close** opens existing confirmation dialog with **Approve & Close**
- `CloseDayWorkspace` shows pending request summary for in-operations review

---

## Time-of-Day Restriction Audit

No close-hour gate added or retained. Closing depends only on:

- Is there an open / close-requested business day?
- Is the user authorized?

`SHOP_CLOSE_HOUR` remains open-shop only.

---

## Business-Date Behavior

Unchanged: business date = date shop was opened. After-midnight closes use persisted open date; `closedAt` = actual server timestamp.

---

## Previous-Day Guard

Unchanged: `previous_business_day_open` blocks opening next day while prior day is `open` or `close_requested`. Workflow now provides actionable path: submit → approve → open next day.

---

## Error Handling

Preserved from `74c5c62`:

- ApiError codes surface human-readable messages
- Post-close refresh failures logged, not reported as close failure
- New codes: `close_request_already_pending`, `close_request_not_pending`, `close_request_pending`

---

## Login Credential-Hint Removal

Completed in `04b6c90` — no default owner credentials on login page.

---

## Tests Run (exact results)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run verify:close-request-workflow` | PASS (20/20) |
| `npm run verify:close-time-flexibility` | PASS (24/24) |
| `npm run verify:close-day-date` | PASS (16/16) |
| `npm run verify:final-open-day-guard` | PASS (10/10) |
| `npm run verify:branch-selection` | PASS |
| `npm run verify:close-day-payouts` | PASS |

---

## Production Safety

- No Prisma schema changes
- No migrations
- No production data / env changes
- PR #39 not merged

---

## Deployment

Push branch `cursor/close-shop-ux-fix-b6e7` to origin; Vercel Preview rebuilds automatically.
