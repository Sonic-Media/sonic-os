# Sonic OS Close Request Workflow — Certification Report

**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Date:** 2026-09-13  
**PR:** [#39](https://github.com/Sonic-Media/sonic-os/pull/39) — **OPEN, NOT MERGED**  
**Schema changed:** No  
**Migrations created:** No  

---

## A. Previous Close Shop UX Fix (commits `962b219`, `74c5c62`, `04b6c90`)

| Item | Status |
|------|--------|
| Premium End of Day card + confirmation dialog | Done |
| Close Day error masking fix (ApiError codes preserved) | Done |
| Post-close refresh failures non-fatal | Done |
| No time-of-day close restriction (static + API audit) | Done |
| Login credential-hint removal | Done (`04b6c90`) |

---

## B. New Close-Request Workflow (commits `f6d175b`+)

### Workflow

| Step | Actor | Action | State |
|------|-------|--------|-------|
| 1 | Staff | Open business day, record operations | `open` |
| 2 | Staff | **Submit for Closing** | `close_requested` |
| 3 | Staff UI | **Closing Request Sent** — “Your request is awaiting review.” | `close_requested` |
| 4 | Management | Review in **Close Requests** panel | `close_requested` |
| 5 | Management | **Approve & Close** | `closed` + `closedAt` |

Transactions remain **real persisted records** throughout. Only business-day closing status changes.

### Previous-business-day dead-end fix

**Problem:** Staff saw “Previous business day still open…” on Open Shop with no path to submit the open day for closing.

**Fix:**
- `app/operations/today/page.tsx` routes staff to the **active open business day** workspace (using `getActiveOpenRecord`) instead of the Open Shop gate when a prior calendar date is still open or close-requested.
- `components/operations/staff/staff-active-business-day-banner.tsx` explains the active business date.
- `components/operations/open-shop-page.tsx` shows **Continue Previous Business Day** when a stale open day is detected.
- `lib/ux/staff-messages.ts` adds actionable guidance on `previous_business_day_open`.

Server guard `previous_business_day_open` **unchanged**.

### State storage (no schema change)

- `DayClosing.status`: `"close_requested"` (existing string field)
- Request metadata in `summary.closeRequest`: `{ submittedBy, submittedByName, submittedAt }`

---

## C. Automated Testing

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:close-request-workflow` | **PASS** (24/24) |
| `npm run verify:close-time-flexibility` | **PASS** (24/24) |
| `npm run verify:close-day-date` | **PASS** (16/16) |
| `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:close-day-payouts` | **PASS** |

### Close-request workflow coverage (24 checks)

1. Staff can submit a close request  
2. Close request persists  
3. Staff-facing duplicate message maps correctly  
4. Duplicate close requests prevented  
5. Unauthorized staff cannot final close  
6. Authorized management can approve & close  
7. Final close → CLOSED  
8. `closedAt` = actual server timestamp  
9–12. Close at evening / 12:30 AM / 2 AM / 5 AM  
13. Persisted business date after midnight  
14. Previous-business-day-open guard enforced  
15. Branch isolation enforced  
16. Already-closed day rejected  
17. Zero-revenue day can close  
18. Post-close refresh non-fatal  
19. Staff UI refresh hook for pending requests  
20. Management close request list resolves pending records  
21. Next business day opens after previous closed  
22. Next business day blocked while previous open  
23. Today page routes to active open business day  
24. Open Shop offers previous-day continuation path  

---

## D. Actual Preview Verification

| Item | Status |
|------|--------|
| Preview URL | `https://sonic-os-git-cursor-close-shop-ux-fix-b6e7-sonic9.vercel.app` |
| Vercel Deployment Protection | Blocks unauthenticated E2E (401 SSO) — documented in `fe6c8fe` |
| Same-commit localhost API + UI | **PASS** (prior session: Close Day POST 201) |
| Close-request Preview E2E | Pending human review after Preview redeploy from latest push |

Preview must be re-verified manually after this push for:
- Submit for Closing → Closing Request Sent (staff)
- Close Requests panel → Approve & Close (management)
- Previous open business day routes to workspace (not Open Shop dead end)

---

## Files Changed (complete)

### Server / API
- `types/day-closing.ts`
- `lib/day-closing/permissions.ts`, `close-request.ts`, `business-date.ts`, `storage.ts`, `sync-daily-operation.ts`
- `lib/server/day-closing-guards.ts`, `services/day-closings-service.ts`, `services/daily-operations-service.ts`
- `app/api/day-closings/route.ts`, `lib/api/day-closings.ts`

### Client / UI
- `context/day-closing-context.tsx`
- `app/operations/today/page.tsx` — **previous-day routing fix**
- `components/operations/open-shop-page.tsx` — **continuation path**
- `components/operations/staff/staff-active-business-day-banner.tsx` — **new**
- `components/operations/staff/staff-operations-workspace.tsx`
- `components/operations/staff/staff-end-of-day-card.tsx`
- `components/operations/staff/staff-welcome-card.tsx`
- `components/operations/staff/close-day-confirm-dialog.tsx`
- `components/operations/close-day-workspace.tsx`
- `components/dashboard/owner/mission-control-close-requests.tsx`
- `components/dashboard/owner/mission-control-end-of-day.tsx`
- `components/dashboard/owner/owner-dashboard-layout.tsx`
- `hooks/use-staff-close-day.ts`, `use-staff-operations-refresh.ts`, `use-management-approve-close.ts`, `use-branch-state.ts`
- `lib/ux/close-day-messages.ts`, `lib/ux/staff-messages.ts`

### Tests
- `scripts/verify-close-request-helpers.ts`, `verify-close-request-workflow.ts`
- Updated: `verify-close-time-flexibility.ts`, `verify-close-day-date-consistency.ts`, `verify-final-open-day-guard.ts`

---

## Permissions

| Action | Owner | Branch Manager | Cashier |
|--------|-------|----------------|---------|
| Submit close request | No | Yes | Yes |
| Approve & close | Yes | Yes | No |

Enforced server-side.

---

## Staff / Management UX Terminology

| Context | Label |
|---------|-------|
| Staff action | **Submit for Closing** |
| After submit | **Closing Request Sent** |
| Supporting text | “Your request is awaiting review.” |
| Management action | **Approve & Close** |

No “Owner” in staff-facing status. No “Waiting for Owner Approval.”

---

## Business Rules Preserved

- No time-of-day close restriction  
- Business date = open date; `closedAt` = actual timestamp  
- Previous-business-day-open guard (server)  
- Branch isolation + authorization  
- Staff shifts independent of business-day closure  
- Payout sequencing on approve  
- Error code preservation (`74c5c62`)  
- Login page has no default credentials  

---

## Production Safety

- No Prisma schema changes  
- No migrations  
- No production data / env changes  
- **PR #39 NOT merged**
