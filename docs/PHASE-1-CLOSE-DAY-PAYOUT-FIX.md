# Sonic OS — Phase 1 Fix #3: Close-Day Payout Sequencing

**Date:** 10 September 2026  
**Milestone:** Data Integrity (Phase 1)  
**Scope:** High Finding #6 only — await staff payments before day close completes  
**Branch:** `cursor/close-day-payout-sequencing-b6e7`

---

## Executive Summary

Phase 1 audit **High Finding #6** identified that `closeDay` in `context/day-closing-context.tsx` called synchronous `recordStaffPayment()`, which returned success immediately while the staff-payment API ran in the background. The UI could report a successful day close while staff payments were still in flight — or after payments succeeded but before close finished — creating partial financial state and duplicate-payment risk on retry.

This fix ensures **every required close-day staff payment is awaited and persisted before `closeDayApi` runs**. Day close is not reported successful until staff payouts and the close API both complete.

---

## Phase 1 Fix #3 Result: **PASS**

Automated verification, TypeScript, and production build pass. **No production data was modified.**

---

## Audit Finding Addressed

| Audit # | Finding | Status |
|---------|---------|--------|
| 6 | Close-day pays staff before confirming PostgreSQL success | **FIXED** |
| 1–5, 7–23 | All other Phase 1 findings | Not in scope |

---

## Files Changed

| File | Change |
|------|--------|
| `context/day-closing-context.tsx` | Uses `recordStaffPaymentAsync` via sequencing helper |
| `lib/day-closing/persist-close-day-payouts.ts` | **NEW** — awaited payout loop before close |
| `scripts/verify-close-day-payout-sequencing.ts` | **NEW** — focused sequencing tests |
| `package.json` | Added `verify:close-day-payouts` script |

---

## What Was Fixed

### Before

```text
closeDay()
  → for each payout: recordStaffPayment()   // fire-and-forget void async
  → closeDayApi()                           // awaited
  → upsertEntry()                           // awaited
  → return success
```

`recordStaffPayment()` returned `{ success: true }` immediately. Staff payments could still be persisting when day close completed or failed.

### After

```text
closeDay()
  → await persistCloseDayStaffPayouts(..., recordStaffPaymentAsync)
  → closeDayApi()                           // only after all payouts succeed
  → upsertEntry()
  → return success
```

On payout failure: returns validation error immediately; **does not** call `closeDayApi`.

---

## Old Close-Day Sequence

1. Validate form (day open, cash notes, not already paid)
2. **Fire-and-forget** staff payments (sync return `success: true`)
3. Await day close API
4. Sync daily operation entry
5. Report success to UI

---

## New Close-Day Sequence

1. Validate form (unchanged — eligibility, amounts, `paidToday`, branch/day guards)
2. **Await** each selected payout via `recordStaffPaymentAsync` (sequential)
3. **Only if all payouts succeed:** await `closeDayApi`
4. Await daily operation sync
5. Report success to UI

`CloseDayWorkspace` and `useStaffCloseDay` already awaited `closeDay()` and only show success UI when `result.success` — no UI changes required beyond the context fix.

---

## Transaction / Atomicity Behavior

| Layer | Behavior |
|-------|----------|
| **Single staff payment** | Server `createStaffPayment` already uses `prisma.$transaction` (expense + staff payment + audit) |
| **Close-day + payments** | **Not a single DB transaction** — separate API calls by design |
| **Client sequencing** | All required payouts must complete before close API is invoked |
| **Partial failure** | If close API fails after payments succeed, payments remain in PostgreSQL; day stays open |
| **Retry safety** | Server returns **409** `duplicate_payment` if staff already paid; client `paidToday` check blocks re-selection |

A full server-side atomic “pay all staff + close day” transaction would require extending `closeDay` on the server — outside the authorized scope (no architectural rewrite).

---

## Duplicate Payment Protection

| Control | Mechanism |
|---------|-----------|
| Pre-close validation | `payout.paidToday` check in `closeDay` before payments run |
| Per-payment persistence | `createStaffPayment` rejects duplicate non-deduction payment for same staff/branch/date (**409**) |
| Post-payment refresh | `recordStaffPaymentAsync` refreshes payments list after each successful create |
| Retry after partial close | Already-paid staff show `paidToday: true`; duplicate API call rejected if retry attempted |

---

## Test Coverage

Run: `npm run verify:close-day-payouts`

| Test | Requirement |
|------|-------------|
| A. Payments before close success | All payment timestamps ≤ close timestamp |
| B. Failed payment prevents close | Close API not called after payment failure |
| C. UI success waits for persistence | Success timestamp after payment + close delays |
| D. Retry duplicate protection | Second payout for same staff rejected |
| E. Permissions | Unchanged — uses existing `recordStaffPaymentAsync` path with same server guards |

---

## Tests Run

| Command | Result |
|---------|--------|
| `npm run verify:close-day-payouts` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| ESLint (changed files) | PASS (pre-existing issues in `day-closing-context.tsx` only) |

---

## Production Data Impact

| Item | Value |
|------|-------|
| **Production data touched** | **NO** |
| Schema / migrations | None |
| localStorage fallback | Not introduced |
| New payment system | None — uses existing `recordStaffPaymentAsync` |

---

## Intentionally Not Fixed

- Generic fire-and-forget mutations in other contexts (High #7)
- Server-side atomic pay+close transaction
- Branch authorization, historical save, reports, backup/restore, and all other Phase 1 items

---

## Shareable Summary

**Verdict:** Phase 1 Fix #3 — **PASS**.

Close-day staff payouts are now **awaited** before day close proceeds. Failed payouts stop the close flow and surface errors. Duplicate payments on retry are blocked by existing server and client guards.

**Production data:** Not touched.

**Next step:** Authorize remaining Phase 1 findings per audit recommended order.
