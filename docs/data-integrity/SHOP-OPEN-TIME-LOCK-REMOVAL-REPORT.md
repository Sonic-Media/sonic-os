# Shop Open/Close Time Lock Removal Report

**Branch:** `cursor/remove-shop-open-time-lock-b6e7`  
**Date:** 2026-09-16  
**Scope:** Remove clock-time restriction on Open Shop; preserve all business-day safeguards

---

## User requirement

Staff must be able to open and close the shop at **any time of day**. Sonic OS must not disable Open Shop based on configured hours (e.g. 9:00 AM – 11:00 PM).

---

## Root-cause investigation

| Location | Role |
|----------|------|
| `lib/operations/opening-hours.ts` | **Authoritative client schedule logic** — set `canOpen: false` before 9:00 AM and after 11:00 PM |
| `components/operations/open-shop-page.tsx` | Disabled Open Shop when `useShopCanOpenNow()` was false |
| `components/operations/shop-schedule-countdown.tsx` | Countdown UI ("Shop opens in …") |
| `lib/server/services/day-closings-service.ts` | **No clock-time gate** — uses `openedAt` / `closedAt` timestamps; business-day guards only |

**Finding:** Time lock was **UI/client-only**. Server `openDay` / `openWithShift` never imported `opening-hours`. Close path already had no hour gate (`verify:close-time-flexibility`).

**Not changed (business-day gates):**

- `assertCanOpenRequestedBusinessDay` — previous open business day
- One open business day per branch
- Role permissions (`canOpenShop`)
- Branch isolation
- Closing request / owner approval flows
- `ownerExemptFromShopOpenGate` — exempts owners from **shop-opened** gate on stock/purchases, not clock time

---

## Changes made

### `lib/operations/opening-hours.ts`

- Removed time-of-day phases (`before-open`, `after-close`) and `canOpen: false` paths
- `getShopScheduleState()` always returns `canOpen: true` with non-blocking copy
- `isWithinOpeningHours()` always returns `true` (deprecated)
- `SHOP_OPEN_HOUR` / `SHOP_CLOSE_HOUR` retained as **informational constants only**

### `components/operations/shop-schedule-countdown.tsx`

- Replaced countdown with **READY TO OPEN** status card
- Removed countdown formatting usage
- `useShopCanOpenNow()` always returns `true`
- Kept `useShopScheduleNow()` interval for Current Time display on Open Shop page

### `components/operations/open-shop-page.tsx`

- Removed `scheduleAllowsOpen` / `useShopCanOpenNow` button gating
- Open Shop disabled only for: permissions, submitting, stale previous business day

### `components/dashboard/owner/mission-control-shop-status.tsx`

- Copy: no longer references "operating hours"

### `scripts/verify-shop-open-time-flexibility.ts` (new)

- Regression checks for schedule at multiple clock times, static audits, live API open

### `package.json`

- Added `verify:shop-open-time-flexibility`

---

## Time-lock enforcement removed

| Removed behavior | Where |
|------------------|--------|
| `canOpen: false` before 9:00 AM | `getShopScheduleState` |
| `canOpen: false` after 11:00 PM | `getShopScheduleState` |
| Countdown disabling Open Shop | `open-shop-page.tsx` |
| "Shop opens in" / "Opening begins at 9:00 AM" UI | `shop-schedule-countdown.tsx` |

---

## Business-day safeguards confirmed intact

| Safeguard | Enforcement |
|-----------|-------------|
| Previous business day open | Server `assertCanOpenRequestedBusinessDay` |
| One open day per branch | Server `openDay` duplicate check |
| Branch isolation | Session + branch APIs |
| Actual `openedAt` / `closedAt` | Server `openDay` / close flows |
| Stale open day UI block | `open-shop-page.tsx` `hasStaleOpenBusinessDay` |
| Close time flexibility | Unchanged (`verify:close-time-flexibility`) |

---

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:shop-open-time-flexibility` | **PASS** (12 static + **PASS** live API open with `openedAt` recorded) |
| `npm run verify:close-time-flexibility` | **PASS** (24 checks) |
| `npm run verify:final-open-day-guard` | **PASS** (10 checks) |
| Production build | **NOT RUN** |

---

## Files changed

- `lib/operations/opening-hours.ts`
- `components/operations/shop-schedule-countdown.tsx`
- `components/operations/open-shop-page.tsx`
- `components/dashboard/owner/mission-control-shop-status.tsx`
- `scripts/verify-shop-open-time-flexibility.ts`
- `scripts/verify-close-time-flexibility.ts` (check label only)
- `package.json`
- `docs/data-integrity/SHOP-OPEN-TIME-LOCK-REMOVAL-REPORT.md`
- `docs/data-integrity/SHOP-OPEN-TIME-LOCK-REMOVAL-REPORT.docx`

---

## Production safety

- No database schema changes
- No production data modified
- No environment variable changes
- No auth/destructive-op changes

---

## Rollback

Revert this branch; previous schedule logic was entirely in `opening-hours.ts` and Open Shop UI.
