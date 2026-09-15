# Shop Expected Opening Time — 7:00 AM UX Change

**Branch:** `cursor/shop-opening-time-7am-b6e7`  
**Date:** 2026-09-14  
**Scope:** Expected/UX opening time only — no business logic changes

---

## Change

Updated the **expected shop opening time** displayed on the pre-opening Today screen from **9:00 AM** to **7:00 AM**.

Affected UI strings:
- "Opening begins at 7:00 AM."
- "7:00 AM – 11:00 PM"
- Countdown target time (before-open and after-close phases)

Closing window remains **11:00 PM** (`SHOP_CLOSE_HOUR = 23` unchanged).

---

## Source / configuration

**Single source of truth:** `lib/operations/opening-hours.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `SHOP_OPEN_HOUR` | **7** (was 9) | Expected open hour for schedule UX + countdown |
| `SHOP_CLOSE_HOUR` | 23 | Expected close hour (unchanged) |

Display labels derive from these constants via `formatHourLabel()` and `getOpeningHoursLabel()`.

**Consumers (unchanged imports):**
- `components/operations/shop-schedule-countdown.tsx`
- `components/operations/open-shop-page.tsx`
- `context/purchasing-context.tsx` / `context/stock-context.tsx` (`ownerExemptFromShopOpenGate` only)

---

## Files changed

| File | Change |
|------|--------|
| `lib/operations/opening-hours.ts` | `SHOP_OPEN_HOUR = 7`; labels derived from constants |
| `scripts/verify-shop-opening-hours.ts` | **New** regression verifier |
| `package.json` | `verify:shop-opening-hours` script |

**Not changed:** Open Shop mutation, business-date resolution, forgotten-close guard, midnight behavior, branch isolation, authorization, closing-day logic, schema, production data.

---

## Business logic confirmation

- **Open Shop API/mutation:** Not modified
- **Business-day / closing guards:** Not modified
- **No new time gate** preventing manual open before/after 7:00 AM — schedule UX only; owners remain exempt via `ownerExemptFromShopOpenGate`
- **Actual shop open timestamp:** Still recorded when user opens (unchanged)

---

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:shop-opening-hours` | **PASS** (7 checks) |
| `npm run verify:close-time-flexibility` | **PASS** (24 checks) |
| `npm run verify:final-open-day-guard` | **PASS** (10 checks) |
| `npm run verify:close-request-workflow` | **PASS** (24 checks) |

## Tests not run

| Test | Reason |
|------|--------|
| Manual browser check of pre-opening Today screen | Not executed in this agent run |

---

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS**
