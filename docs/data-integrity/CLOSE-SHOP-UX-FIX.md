# Close Shop / End of Day UX Fix

## What was wrong

The staff Close Shop flow on **Today's Operations** (`/operations/today`) could surface duplicate, generic error copy such as:

- "Unable to close the day right now."
- "Could not close the day. Please try again."

These appeared together (inline card + toast) and read like internal debug states rather than polished business messaging.

The End of Day section also:

- Required movie revenue and a full checklist before enabling Close Day (blocking zero-revenue days in the UI even when the server allows close).
- Used a collapsible card with movie revenue entry mixed into the close panel.
- Lacked a structured confirmation step with branch/date/summary before submit.

## What changed (UI / presentation only)

### New End of Day layout (`StaffEndOfDayCard`)

- Premium Sonic OS dark card with **END OF DAY** heading and subtitle: *"Review today's activity before closing the business day."*
- **Left:** Daily Notes (optional) — large textarea.
- **Right:** Day Checklist reflecting real status (informational, not profit gates):
  - Sales — Recorded / No sales recorded
  - Expenses — Recorded / None recorded
  - Daily Wage — Recorded / Pending
  - Ready to Close — Ready / Action required (based on shop open state)
- **Bottom:** Gradient **Close Day** button, lock icon, disclaimer about record locking.
- **Confirmation dialog** before submit: branch, business date, total sales, expenses, daily wage, cash to hand in.
- **Single error banner** — no duplicate toast + inline generic errors on close failure.

### Error message mapping (`lib/ux/close-day-messages.ts`)

Known conditions map to one human-readable message:

| Code / condition | User message |
|------------------|--------------|
| `previous_business_day_open` | Another business day is still open. Close that day before continuing. |
| `day_closed` / `day_already_closed` | This business day is already closed. |
| `shop_not_opened` | The shop has not been opened for this business day. |
| `forbidden` / permission | You don't have permission to close this business day. |
| `staff_on_shift` | Server message (staff names) preserved |
| Network / technical / empty | We couldn't close the business day. Check your connection and try again. |

Technical details (stack traces, Prisma, raw API JSON) are not shown to staff. Existing server logging paths unchanged.

### Hook / workspace updates

- `use-staff-close-day.ts` — clearer preflight messages; exposes `shopOpen`, `businessDate`, `clearError`.
- `staff-operations-workspace.tsx` — single `closeFlowError` state; success toast only; removed movie-revenue gate and duplicate close toasts.
- `lib/ux/staff-messages.ts` — `close-day` context delegates to `mapCloseDayError`.
- `close-day-workspace.tsx` — submit label aligned: "Closing business day..." (owner multi-step flow unchanged logically).

## Business logic intentionally unchanged

No changes to:

- Prisma schema or migrations
- `DayClosing` persisted state
- Open business date resolution
- Branch isolation
- Forgotten-close / previous-business-day guards
- After-midnight close behavior
- Closed-day mutation protection
- Staff authorization (`assertCanCloseDay`, role checks)
- Payout sequencing (`persistCloseDayStaffPayouts`)
- Transaction persistence
- Server validation in `day-closings-service.ts`
- Zero-revenue close **server** rules (UI no longer blocks close for zero sales/expenses)

## Confirmation behavior

1. Staff clicks **Close Day**.
2. Confirmation dialog shows branch, business date, and existing summary figures.
3. **Cancel** dismisses; **Close Day** saves progress then calls existing `closeDay` context method.
4. While submitting: button shows "Closing business day..."; duplicate clicks disabled.
5. Success: toast "Business day closed." — existing post-close navigation/state applies.

## Tests run

| Script | Result |
|--------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:close-day-date` | **PASS** (16/16) |
| `npm run verify:final-open-day-guard` | **PASS** (10/10) |
| `npm run verify:branch-selection` | **PASS** (all checks) |
| `npm run verify:close-day-payouts` | **PASS** |

## Environment / fixture notes

- Tests run against the workspace PostgreSQL instance with certification fixtures.
- No production data modified.
- Owner multi-step `CloseDayWorkspace` wizard retained for authorized roles; this fix targets the staff Today's Operations End of Day experience.
