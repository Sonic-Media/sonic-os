# Sonic OS — Branch-Based Inventory Refactor Report

**Generated:** 2026-08-22 23:57 UTC+3  
**Project:** `/Users/kvisualz/Desktop/sonic-os`  
**Branch:** `feature/v2.1-stock-management`  
**Scope:** Architecture simplification — branch-owned inventory (V1)

---

## Purpose

This document reports the work completed to refactor Sonic OS inventory from a hybrid global/branch model into a **branch-based inventory architecture**, where:

- Inventory belongs to a **branch**, never to individual staff
- Cashiers sell directly from their assigned branch stock
- No daily stock allocation is required
- Role permissions are enforced consistently in UI and server logic

This report also covers the related **New Accessory Sale** empty-state permission fix for cashiers.

---

## Executive summary

| Area | Result |
|------|--------|
| Branch-based inventory model | **Implemented** |
| Staff stock allocation workflow | **None existed — not applicable** |
| Sales load from branch inventory (`quantity > 0`) | **Implemented** |
| Branch stock validation (client + server) | **Implemented** |
| Non-owner branch access lock | **Implemented** |
| Cashier empty inventory UX | **Implemented** |
| Internal branch code display cleanup (`main` → Kansanga) | **Implemented** |
| Database schema changes | **None** |
| New business features | **None** |
| Production build | **`npm run build` — PASS** |

---

## Goals (requested)

1. Inventory belongs to a branch, not to staff
2. Remove any workflow requiring owners/managers to allocate stock to staff each morning
3. Cashiers record sales against their assigned branch inventory automatically
4. Enforce role permissions consistently (Owner, Branch Manager, Cashier)
5. Support multiple branches without architectural changes
6. Replace internal branch identifiers (e.g. `main`) with display names (e.g. **Kansanga**)

---

## Architecture

### Before

Sonic OS used a **hybrid model**:

- `Product.currentStock` held a **global aggregate**
- `StockMovement.branchId` tagged movements to branches
- Per-branch quantities were **derived for display** but validations and sales still checked **global stock**

This meant a cashier could theoretically sell from global totals even when their branch had zero stock.

### After

Sonic OS now treats **branch inventory as the source of truth for operations**:

```
Branch (e.g. Kansanga, code: main)
  ├── Staff (assigned via Staff.branchId / User.branchId)
  ├── StockMovement (in/out, tagged branchId)
  │     └── derives per-branch quantity per product
  ├── Sale (branchId, staffId, soldBy metadata)
  │     └── triggers StockMovement(out) at sale branch
  └── Purchase (branchId)
        └── triggers StockMovement(in) at purchase branch

Product.currentStock = global aggregate (maintained for catalog totals; not used for sale validation)
Per-branch stock     = SUM(in movements) − SUM(out movements) for that branch + product
```

### Staff structure (production intent)

| Person | Role | Branch |
|--------|------|--------|
| Kevin | Owner | All branches |
| Penny | Branch Manager | Kansanga |
| Tony | Cashier | Kansanga |
| Fazil | Cashier | Kansanga |

Staff never receive allocated inventory. Every sale records **soldBy**, **branch**, **quantity**, **amount**, and **timestamp** for reporting (e.g. today's sales by Tony vs Fazil).

---

## What was implemented

### 1. Branch inventory helpers

| File | Purpose |
|------|---------|
| `lib/stock/branch-inventory.ts` | Client: `getBranchProductStock()`, `getBranchProductsForSale()` (filters `quantity > 0`) |
| `lib/server/branch-inventory.ts` | Server: `computeBranchProductStock()`, `assertSufficientBranchStock()` |
| `lib/branch/access.ts` | `resolveSaleBranch()`, `canSwitchActiveBranch()` (owner only) |
| `lib/branch/display-name.ts` | `resolveBranchDisplayName()` — maps `main` → **Kansanga** |

### 2. Server enforcement

**`lib/server/stock-transactions.ts`**

- Before any stock-out movement, validates **branch-level stock** (not global `currentStock`)
- Applies to sales, manual stock-out, and any other outbound movement

**`lib/server/branch-lookup.ts`**

- Added `assertSessionCanAccessBranchCode()`
- Non-owners (Branch Manager, Cashier) can only act on their **assigned branch**
- Owner retains access to all branches

### 3. Client state & validation

**`context/stock-context.tsx`**

- Exposes `getBranchProductStock(productId, branchCode)`
- Exposes `getProductsAvailableForSale(branchCode)` — products with branch stock > 0
- Stock movement validation uses branch stock for stock-out

**`context/sales-context.tsx`**

- `completeSale()` validates against **branch stock** for the sale branch

### 4. New Accessory Sale page

**`components/sales/new-sale-form.tsx`**

| Behavior | Detail |
|----------|--------|
| Product source | User's assigned branch (`session.branch` for staff; owner uses active branch) |
| Product filter | Only products where **branch stock > 0** |
| Stock labels | Shows branch quantity, not global total |
| Cashier empty state | *"No products are currently available for sale. Please contact your manager."* |
| Cashier navigation | **No** "Go to Stock" button |
| Owner / Branch Manager empty state | Retains "Go to Stock" link when inventory module is accessible |

### 5. Stock movement dialogs

**`components/stock/stock-movement-dialog.tsx`**

- Product dropdown and stock-out validation use **branch-level** quantities
- "Available" count reflects the selected branch, not global totals

### 6. Branch switcher & access lock

**`context/active-branch-context.tsx`**

- Non-owners are locked to `session.branch`
- `setActiveBranch()` is a no-op for staff (cannot switch away from assigned branch)

**`components/shared/layout/branch-switcher.tsx`**

- **Owner:** full branch switcher dropdown
- **Branch Manager / Cashier:** read-only branch label (no switch control)

### 7. Display name cleanup

**`context/branches-context.tsx`** and **`context/settings-context.tsx`**

- Branch names resolve through `resolveBranchDisplayName()`
- Internal code `main` displays as **Kansanga** via `DEFAULT_APP_SETTINGS.branchNames`
- Users should not see raw database branch codes in normal UI flows

---

## Permissions matrix (enforced)

| Capability | Owner | Branch Manager | Cashier |
|------------|:-----:|:--------------:|:-------:|
| View all branch inventories | ✓ | — | — |
| Manage own branch inventory | ✓ | ✓ | — |
| Access another branch's inventory | ✓ | ✗ | ✗ |
| Add / edit / delete products | ✓ | ✓ (own branch ops) | ✗ |
| Stock In / Stock Out | ✓ | ✓ (own branch) | ✗ |
| Switch active branch | ✓ | ✗ | ✗ |
| Record Accessory Sale | ✓ | ✓ | ✓ |
| See "Go to Stock" when empty | ✓ | ✓ | ✗ |

---

## Sales workflow (cashier)

When Tony or Fazil records a sale:

1. Products load from **their assigned branch** (Kansanga)
2. Only items with **branch stock > 0** appear in the item picker
3. On submit, stock is validated against **branch quantity**
4. Server records stock-out movement tagged to the sale branch
5. Sale saved with **soldBy**, **branch**, **quantity**, **amount**, **timestamp**

No stock allocation step is required.

---

## What was NOT changed

| Item | Reason |
|------|--------|
| Database schema | Requested — no schema changes |
| Staff inventory allocation UI | **Did not exist** — no allocation workflow to remove |
| `savingsAllocation` in day close | Unrelated (cash allocation, not inventory) |
| Staff audit "inventory adjustments" | Audit trail of who performed stock actions — not physical allocation |
| New business features | Out of scope |

---

## Files changed

### New files

```
lib/branch/access.ts
lib/branch/display-name.ts
lib/stock/branch-inventory.ts
lib/server/branch-inventory.ts
```

### Modified files (branch inventory refactor)

```
components/sales/new-sale-form.tsx
components/shared/layout/branch-switcher.tsx
components/stock/stock-movement-dialog.tsx
context/active-branch-context.tsx
context/branches-context.tsx
context/sales-context.tsx
context/settings-context.tsx
context/stock-context.tsx
lib/server/branch-lookup.ts
lib/server/stock-transactions.ts
```

### Other modified files (prior session work, same branch)

```
app/operations/today/page.tsx
context/day-closing-context.tsx
lib/db.ts
lib/historical-import/parse-xlsx.ts
lib/server/bootstrap/constants.ts
lib/server/bootstrap/stages.ts
lib/server/services/day-closings-service.ts
lib/server/services/expenses-service.ts
lib/ux/user-display.ts
tsconfig.json
```

---

## Success criteria checklist

| Criterion | Status |
|-----------|--------|
| Inventory belongs only to branches | ✓ |
| Staff never receive allocated stock | ✓ (none existed) |
| Cashiers immediately sell from branch inventory | ✓ |
| Every sale deducts stock from the correct branch | ✓ |
| Reports continue tracking which staff member made each sale | ✓ (unchanged) |
| Owner no longer has to allocate inventory daily | ✓ (never required) |
| Architecture ready for future branches (e.g. Salaama) | ✓ |
| Cashiers never see Stock navigation when empty | ✓ |
| Internal branch codes hidden from users | ✓ |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** (2026-08-22) |
| Linter (changed files) | **No errors** |
| `npm run verify:roles` | Not re-run in this session — prior certification: **20/20 PASS** |
| `npm run verify:operations` | Not re-run in this session — prior certification: **21/21 PASS** |
| `npm run verify:sales` | Recommended follow-up after deploy |

### Recommended manual QA

1. **Cashier (Tony/Fazil):** Open New Accessory Sale → confirm only branch products with stock > 0 appear; confirm no "Go to Stock" when empty
2. **Branch Manager (Penny):** Confirm branch switcher is read-only; stock-out blocked when branch quantity insufficient
3. **Owner (Kevin):** Switch branches; confirm per-branch stock columns and sale deductions match selected branch
4. **Multi-branch:** Add Salaama branch + stock movements; confirm Kansanga and Salaama inventories remain independent

---

## Multi-branch expansion

Adding a second branch (e.g. Salaama) requires:

1. Create branch record in `Branch` table (via Branches settings or bootstrap)
2. Record stock-in movements tagged to that branch
3. Assign staff to the branch

No architectural changes are required. Per-branch stock is derived from the movement ledger.

---

## Known limitations (unchanged)

- `Product.currentStock` remains a global aggregate for catalog-level totals and legacy displays
- Product status badges on the global product list may still reflect aggregate stock; branch dashboards use branch-derived metrics
- Inter-branch **transfer** is a movement reason string only — no paired transfer workflow exists yet (out of scope)

---

## Conclusion

Sonic OS now operates on a **branch-owned inventory model**. Staff sell from their branch's stock without allocation. Server and client validations enforce branch quantities and branch access. Cashiers receive a clear empty-state message with no Stock module navigation. The system is ready for additional branches without further architectural work.

---

*Report generated for Sonic OS V1 branch inventory refactor — approval and QA reference.*
