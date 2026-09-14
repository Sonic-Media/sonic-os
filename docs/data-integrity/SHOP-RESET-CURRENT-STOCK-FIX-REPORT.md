# Shop Reset Current Stock Fix — Report

**Branch:** `cursor/shop-reset-current-stock-fix-b6e7`  
**Commit:** `f3a0cf6`  
**Date:** 2026-09-14

---

## Root cause

Live Preview Shop Reset cleared operational records correctly (including **Stock Movements = 0**), but the reset report still showed **Current Stock = 2**.

### Source of truth for “Current Stock”

| Layer | Authority | Notes |
|-------|-----------|-------|
| **Stored inventory quantity** | `Product.currentStock` (`prisma/schema.prisma`) | Branch-scoped: each `Product` row belongs to one `branchId` |
| **Stock movements** | `StockMovement` rows | Audit/history trail; stock pages can derive quantity via `computeBranchNetQuantity()`, but writes update `Product.currentStock` through `lib/server/stock-transactions.ts` |
| **Shop Reset zeroing** | `product.updateMany({ currentStock: 0 })` in `deleteBranchScopedData()` | Already present before this fix |

The reset transaction **was zeroing** `Product.currentStock`. The integrity bug was in **metrics/reporting**:

- `countBranchScopedData()` set `productStockReset` to **`product.count`** (number of catalogue rows)
- Shop Reset UI labeled that field **“Current Stock”**
- After reset with **2 catalogue products** still preserved, verification displayed **2** — meaning “2 products remain”, **not** “2 units of stock remain”

This matched the live Preview symptom exactly: movements cleared, catalogue preserved (2 products), misleading **Current Stock = 2**.

---

## Code fix

### 1. `lib/server/branch-shop-reset-service.ts`

- Added `sumBranchCurrentStockUnits()` — aggregates `Product.currentStock` for reset scope (`_sum.currentStock`)
- Renamed metric **`productStockReset` → `branchCurrentStockUnits`** (inventory units, not catalogue count)
- Preview/verification counts now report true branch stock totals
- `deleteBranchScopedData()`:
  - Captures units cleared (sum before zeroing) in `branchCurrentStockUnits`
  - Zeroes stock with `updateMany`
  - Sets `status: "out-of-stock"` when stock is zero (was incorrectly left as `in-stock`)
  - **In-transaction guard:** throws if any branch stock sum remains non-zero after update
- `validateShopResetVerification()` also rejects when `verification.branchCurrentStockUnits > 0`

### 2. `lib/api/shop-reset.ts`

- Updated `ShopResetCounts.branchCurrentStockUnits` type

### 3. `components/settings/shop-reset-section.tsx`

- Preview **Current Stock** → `counts.branchCurrentStockUnits`
- Post-reset verification **Current Stock** → `verification.branchCurrentStockUnits` (expects **0**)

### 4. Tests

- New `scripts/verify-shop-reset-current-stock.ts` + `npm run verify:shop-reset-current-stock`
- Extended `scripts/verify-owner-shop-reset.ts` static check **I2**

**Unchanged:** backup-before-delete, transactional reset, branch isolation filters, catalogue preservation, production guards, normal sales/purchasing inventory logic.

---

## Branch isolation

Stock sums and zeroing use `branchId: { in: branchIds }` from `resolveBranchTargets(scope)` — same pattern as sales/expenses/movements. Resetting Kansanga (`main`) does not modify Salaama products.

---

## Tests actually run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:shop-reset-current-stock` | **PASS** (9/9, non-destructive) |
| `npm run verify:shop-reset-target-guard` | **PASS** |
| `npm run verify:branch-authorization` | **PASS** |
| `npm run verify:owner-shop-reset` | **PARTIAL** — static checks PASS including **I2**; live open-day fixture failed (`409 previous_business_day_open`) — **ENVIRONMENT/FIXTURE** |
| `npm run build` | **FAIL** — pre-existing `_global-error` prerender (`useContext` null) — **ENVIRONMENT/CODE**, unrelated |

### `verify:shop-reset-current-stock` coverage

- Static: aggregate sum helper, field rename, transaction guard, UI wiring
- Live (non-destructive): preview stock units match DB sum; Salaama isolation; simulated zeroing → preview reports **0**; **no reset POST executed**

---

## Tests not run

| Test | Reason |
|------|--------|
| Live Preview destructive reset re-test | Not executed by this agent; requires authorized Preview env + owner action |
| Production reset | Out of scope |
| Full `verify:operations` / `verify:reports-module` | Not re-run this turn (no reporting logic changed) |

---

## Expected Preview behavior after deploy

| Metric | Before reset | After reset |
|--------|--------------|-------------|
| Stock Movements | N | **0** |
| Current Stock | total units (e.g. 15) | **0** |
| Product Catalogue (preserved) | N products | **N products** (unchanged) |

---

## Production safety

- No schema changes
- No production data/env changes
- Production reset guards unchanged
- Stronger in-transaction + verification checks for zero stock

---

## Files changed

| File | Change |
|------|--------|
| `lib/server/branch-shop-reset-service.ts` | Stock unit sum metric + transaction guard |
| `lib/api/shop-reset.ts` | Type update |
| `components/settings/shop-reset-section.tsx` | Correct Current Stock binding |
| `scripts/verify-shop-reset-current-stock.ts` | New regression verifier |
| `scripts/verify-owner-shop-reset.ts` | Static check I2 |
| `package.json` | `verify:shop-reset-current-stock` script |
| `docs/data-integrity/SHOP-RESET-CURRENT-STOCK-FIX-REPORT.md` | This report |
| `docs/data-integrity/SHOP-RESET-CURRENT-STOCK-FIX-REPORT.docx` | Word deliverable |
