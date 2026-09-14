# Sonic OS — Closing Request Approval Flow

**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Commit:** `6f44b76` (feature: `788aeac`)  
**Date:** 2026-09-13  
**PR:** [#39](https://github.com/Sonic-Media/sonic-os/pull/39) — **OPEN, NOT MERGED**  
**Schema changed:** No  
**Migrations created:** No  

---

## Executive Summary

Completed the server-authoritative **Submit for Closing → Management Approval → Closed** lifecycle using the existing `DayClosing` model. Staff submit closing requests (`close_requested`); authorized management review and **Approve & Close Day** on Mission Control Home (owner) and staff Home (branch managers). Staff auto-refresh detects final closure. No parallel closing system was introduced.

---

## A. Existing Implementation Inspected

| Component | Finding |
|-----------|---------|
| `DayClosing` Prisma model | String `status` field — no schema change needed |
| `day-closings-service.ts` | `submitCloseRequest`, `approveAndCloseDay`, `openDay`, guards |
| `/api/day-closings` | Actions: `submit-close-request`, `approve-close` |
| Status values | `open`, `close_requested`, `closed` |
| `summary.closeRequest` JSON | Submitter metadata (no migration) |
| `StaffEndOfDayCard` | Submit for Closing + pending state |
| `ClosingRequestsPanel` | Management approval surface |
| Authorization | `canSubmitCloseRequest`, `canApproveAndClose` (server enforced) |

**Single source of truth:** PostgreSQL `DayClosing` via `day-closings-service.ts`.

---

## B. Root Cause / Missing Workflow

1. **Management visibility:** Close Requests panel returned `null` when empty and was only on owner Mission Control — branch managers saw no approval surface on their Home dashboard.
2. **Review UX:** Reused staff submit dialog instead of dedicated **Review Closing Request** with submitter/time/notes.
3. **Previous-day dead end:** Staff blocked on Open Shop without route to prior open business day (fixed in prior commit; preserved).
4. **Pending write lock:** Server blocked record edits during `close_requested` — corrected so business day remains operationally open until approval.

---

## C. Staff Workflow

1. Open business day → record operations (real persisted transactions)
2. End of Day card → **Submit for Closing**
3. Confirmation shows human-readable branch name (e.g. Kansanga) and formatted business date
4. After submit → **CLOSING REQUEST SENT**
   - “Your operations have been submitted for review. The business day will remain open until approved.”
5. Duplicate submits blocked
6. Auto-refresh (`useStaffOperationsRefresh`) picks up management approval → **BUSINESS DAY CLOSED**

Transactions are never drafts.

---

## D. Management Workflow

**Surfaces:**
- **Owner:** Home / Mission Control → **Closing Requests** panel (always visible)
- **Branch Manager:** Home dashboard → same **Closing Requests** panel

**Empty state:** “No closing requests pending.”

**Pending card shows:** branch display name, business date, submitter + time, sales, expenses, staff payments, cash position, **Review Request** button.

**Review dialog:** **Review Closing Request** with submitted by/at, financial summary, daily notes, **Approve & Close Day**.

Management refresh: `useManagementDashboardRefresh` (12s polling + focus/visibility).

Today's Operations remains read-only for owners.

---

## E. Approval Flow (Server)

`approveAndCloseDay` → existing service path:

- Authorization + branch scope
- Resolves persisted business date
- Requires `close_requested` status
- Payout sequencing preserved
- Sets `status = closed`, `closedAt = now`
- Atomic close + daily operation sync

---

## F. Business-Date / After-Midnight

- `businessDate` = date shop opened
- `closedAt` = actual server timestamp (may be next calendar day)
- No midnight auto-close
- No time-of-day close restriction

---

## G. Branch Isolation

- Kansanga (`main`) / Salaama (`branch2`) isolated in API lists and approval
- UI uses `getBranchName()` → Kansanga / Salaama display names

---

## H. Authorization

| Action | Owner | Branch Manager | Cashier |
|--------|-------|----------------|---------|
| Submit close request | No | Yes | Yes |
| Approve & close | Yes | Yes | No |

---

## I. Financial Rules Preserved

- Zero/negative revenue close allowed
- No sales > expenses requirement
- UGX formatting with thousands separators
- Existing calculations unchanged

---

## J. UI Changes

| File | Change |
|------|--------|
| `closing-requests-panel.tsx` | **New** — management panel + empty state |
| `review-closing-request-dialog.tsx` | **New** — Approve & Close Day review |
| `staff-dashboard-layout.tsx` | Closing Requests for branch managers |
| `staff-end-of-day-card.tsx` | Updated pending/closed copy |
| `close-day-confirm-dialog.tsx` | Formatted business dates |
| `use-management-dashboard-refresh.ts` | **New** — owner + manager polling |
| `day-closing-guards.ts` | Allow writes during `close_requested` |
| `storage.ts` | `canRecordTodaysActivity` includes pending state |

---

## K. Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS (A–J)** |
| `npm run verify:close-request-workflow` | **PASS (24/24)** |
| `npm run verify:close-time-flexibility` | **PASS (24/24)** |
| `npm run verify:close-day-date` | **PASS (16/16)** |
| `npm run verify:final-open-day-guard` | **PASS (10/10)** |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:close-day-payouts` | **PASS** |

### E2E Lifecycle (A–J)

| Test | Result |
|------|--------|
| A — Open day | **PASS** |
| B — Staff submit (pending, not closed) | **PASS** |
| C — Management sees request | **PASS** |
| D — Management approves | **PASS** |
| E — Staff sees CLOSED | **PASS** |
| F — Next day opens | **PASS** |
| G — Forgotten close blocked | **PASS** |
| H — After-midnight business date | **PASS** |
| I — Branch isolation | **PASS** |
| J — Zero revenue | **PASS** |

---

## L. Preview Deployment

| Item | Status |
|------|--------|
| Branch pushed | `cursor/close-shop-ux-fix-b6e7` |
| Vercel Preview rebuild | **PASS** (CI green on push) |
| Manual Preview E2E | **NOT RUN** (Deployment Protection blocks automated browser E2E) |
| Localhost full lifecycle | **PASS** |

---

## M. Production Safety

- No Prisma schema changes
- No migrations
- No production data/env changes
- **PR #39 NOT merged**
- **NOT deployed to production**

---

## N. Remaining Limitations

- Preview manual verification pending after latest push
- Owner Mission Control shows all branches' pending requests; branch managers see branch-scoped API data only

---

## O. Recommendation Before Merge

1. Manually verify Preview: staff submit → owner/manager Home → Review Request → Approve & Close Day → staff page refreshes to CLOSED → next day opens
2. Confirm branch manager Home shows Closing Requests panel
3. Merge PR #39 only after Preview sign-off
