# PHASE 1 FIX #25 REPORT — EXPENSE / INVENTORY SEPARATION

**STATUS: PASS**

**DATE:** 2026-09-11  
**BRANCH:** `cursor/data-integrity-consolidated-b6e7`  
**Formal deliverable:** `docs/PHASE-1-FIX-25-EXPENSE-INVENTORY-SEPARATION.docx`

---

## 1. Finding

When recording accessory sales and operating expenses, inventory/accessory valuation appeared to decrease by the expense amount. Operating expenses (e.g. WiFi) must not reduce stock quantity, movement-derived inventory value, or product cost basis.

## 2. Reproduction

Controlled fixture:

1. Create product with initial stock 10 × UGX 10,000 = UGX 100,000 inventory.
2. Purchase +5 units → inventory UGX 150,000.
3. Sell 2 units → inventory UGX 130,000 (movement-driven).
4. Record operating expense UGX 10,000.
5. **Observed (before fix):** dashboard/inventory display could imply inventory dropped with expenses.
6. **Expected:** inventory remains UGX 130,000; expense total increases by UGX 10,000; net cash/profit may reflect expense separately.

## 3. Root Cause

**Expenses service does not mutate stock.** Audited `lib/server/services/expenses-service.ts` — no stock movement or product updates.

**Display/calculation conflation:**

- Stock dashboard metrics used global `product.currentStock × buyingPrice` without branch movement scoping.
- Cash/net displays correctly subtract expenses from cash flow, but inventory widgets could be misread as movement-derived when they were not consistently branch/movement authoritative.
- No single authoritative helper separated inventory valuation from operating expense totals.

## 4. Affected Files

| File | Change |
|------|--------|
| `lib/inventory/valuation.ts` | **NEW** — `computeAuthoritativeBranchInventoryValue` (movements only, excludes expenses) |
| `lib/stock/calculations.ts` | `computeDashboardMetrics` accepts optional branch; uses movement-based valuation when branch provided |
| `context/stock-context.tsx` | Passes `activeBranch` into dashboard metrics |
| `scripts/verify-expense-inventory-separation.ts` | New certification script (13 checks) |
| `package.json` | Added `verify:expense-inventory-separation` |

## 5. Fix

- Introduced authoritative branch inventory valuation derived exclusively from products + stock movements.
- Stock context dashboard metrics now use branch-scoped movement-based valuation.
- Operating expenses continue to affect cash/profit calculations only through expense aggregation paths.

## 6. Invariant

```
INVENTORY VALUE = f(stock movements, product buying prices) — NOT expenses
OPERATING EXPENSE = cash outflow / P&L expense — does NOT mutate inventory
NET CASH may = REVENUE - EXPENSES (correct)
INVENTORY VALUE ≠ REVENUE - EXPENSES (must never be conflated)
```

Cross-branch isolation preserved: Kansanga expenses cannot alter Salaama inventory.

## 7. Test Design

`scripts/verify-expense-inventory-separation.ts`:

1. Static — expense service has no stock mutations; valuation helper excludes expenses.
2. Create product, purchase, sale — inventory changes only via movements.
3. Record operating expense — inventory unchanged.
4. Expense totals increase independently.
5. Operating expense calc ≠ inventory value.
6. Cross-branch expense does not change other branch inventory.
7. Soft-delete expense does not mutate inventory.
8. Product stock remains movement-driven.

Uses staff client for operational writes (sales/expenses); owner for catalog/purchases.

## 8. Test Results

```
npm run verify:expense-inventory-separation → 13/13 PASS
npm run verify:financial-assertions           → 17/17 PASS
npm run verify:financial-defaults             → 14/14 PASS
npm run verify:reports                        → 6/6 PASS
npm run verify:reports-server-authority       → 16/16 PASS
```

## 9. Branch Safety

Inventory valuation scoped per branch via `computeInventoryValueByBranch`. Cross-branch expense test confirms Salaama inventory unchanged when Kansanga expense recorded.

## 10. Transaction Safety

Inventory mutations (purchases, sales) remain in existing Prisma transactions. Expense writes unchanged. No long-running network inside transactions.

## 11. Schema Impact

**NONE** — separation enforced at calculation/display layer; no Prisma migration required.

## 12. Production Impact

**NOT TOUCHED** — local/disposable PostgreSQL fixtures only.

## 13. Regression Results

| Check | Result |
|-------|--------|
| `verify:expense-inventory-separation` | PASS |
| `verify:financial-assertions` | PASS |
| `verify:financial-defaults` | PASS |
| `verify:reports` | PASS |
| `verify:reports-server-authority` | PASS |
| `verify:branch-authorization` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | FAIL — PRE-EXISTING `_global-error` prerender |
| `npm run lint` | FAIL — PRE-EXISTING repo-wide lint debt (45 errors) |

## 14. Final Result

**PASS**
