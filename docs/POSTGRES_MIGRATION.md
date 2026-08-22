# PostgreSQL Migration — Removed localStorage Fallbacks

Business modules now require PostgreSQL via the API. When the database is unavailable, contexts expose `loadError` and mutations log explicit errors instead of silently persisting to `localStorage`.

## New API-only helpers

| File | Purpose |
|------|---------|
| `lib/data-source/errors.ts` | `DataSourceUnavailableError` and message helper |
| `lib/data-source/context-api.ts` | `loadFromApi()`, `runOnApi()`, `assertRemoteDataSourceAvailable()` |

Legacy `loadRemoteOrLocal()` / `runRemoteOrLocal()` remain **only** for auth and UI-only modules (session, roles list).

## Removed localStorage read/write functions

| Module | Storage file | Removed functions | localStorage key (no longer written) |
|--------|--------------|-------------------|--------------------------------------|
| Daily Operations | `lib/storage.ts` | `getEntries()`, `saveEntries()` | `STORAGE_KEY` |
| Sales | `lib/sales-storage.ts` | `getSales()`, `saveSales()` | `SALES_STORAGE_KEY` |
| Customers | `lib/sales-storage.ts` | `getCustomers()`, `saveCustomers()` | `SALES_CUSTOMERS_STORAGE_KEY` |
| Purchases | `lib/purchasing-storage.ts` | `getPurchases()`, `savePurchases()` | `PURCHASING_PURCHASES_STORAGE_KEY` |
| Suppliers | `lib/purchasing-storage.ts` | `getSuppliers()`, `saveSuppliers()` | `PURCHASING_SUPPLIERS_STORAGE_KEY` |
| Stock products | `lib/stock-storage.ts` | `getStockProducts()`, `saveStockProducts()` | `STOCK_PRODUCTS_STORAGE_KEY` |
| Stock movements | `lib/stock-storage.ts` | `getStockMovements()`, `saveStockMovements()` | `STOCK_MOVEMENTS_STORAGE_KEY` |
| Stock price changes | `lib/stock-storage.ts` | `getStockPriceChanges()`, `saveStockPriceChanges()` | `STOCK_PRICE_CHANGES_STORAGE_KEY` |
| Expenses | `lib/expenses-module-storage.ts` | `getExpenseRecords()`, `saveExpenseRecords()` | `EXPENSES_RECORDS_STORAGE_KEY` |
| Expense categories | `lib/expenses-module-storage.ts` | `getExpenseCategories()`, `saveExpenseCategories()` | `EXPENSES_CATEGORIES_STORAGE_KEY` |
| Staff payments | `lib/staff-payments/storage.ts` | `getStaffPayments()`, `saveStaffPayments()` | `STAFF_PAYMENTS_STORAGE_KEY` |

Normalize/sort helpers in those files are unchanged.

## Context changes (fallback paths removed)

### `context/entries-context.tsx` — Daily Operations

- **Load:** `loadRemoteOrLocal({ remote: fetchDailyOperations, local: getEntries })` → `loadFromApi(fetchDailyOperations)`
- **Upsert:** removed `saveEntries()` local branch
- **Delete / import / bulk delete:** removed `saveEntries()` local branches
- Initial state: `[]` instead of `getEntries()`

### `context/sales-context.tsx` — Sales + Customers

- **Load:** removed local `{ sales: getSales(), customers: getCustomers() }`
- **CRUD:** removed `persistSales()` / `persistCustomers()` → `saveSales()` / `saveCustomers()`
- **`completeSale` local path:** removed `recordMovement()` + `persistSales()`; server transaction handles stock + sale row
- Initial state: `[]` instead of `getSales()` / `getCustomers()`

### `context/purchasing-context.tsx` — Purchases + Suppliers

- **Load:** removed local `getPurchases()` / `getSuppliers()`
- **Supplier CRUD:** removed local persist + audit-only paths
- **`completePurchase` local path:** removed manual stock snapshot/restore, `recordMovement()`, `updateProduct()`, `persistPurchases()`
- Initial state: `[]`

### `context/stock-context.tsx` — Stock

- **Load:** removed local `getStockProducts()` / `getStockMovements()` / `getStockPriceChanges()`
- **Product CRUD / movements:** removed all `saveStock*` local branches
- Removed `getStockSnapshot()` / `restoreStockSnapshot()` (only used by removed purchase local fallback)
- Initial state: `[]`

### `context/expenses-module-context.tsx` — Expenses

- **Load:** removed `getExpenseCategories()` / `getExpenseRecords()` local branches
- **CRUD:** removed `saveExpenseRecords()` / `saveExpenseCategories()` via `persist*`
- **`upsertStaffPaymentExpense`:** no longer writes to localStorage; returns error directing users to Staff Payments API
- **`linkLegacyStaffPaymentExpenses`:** no-op (legacy localStorage linking removed)
- Initial state: `[]`

### `context/staff-payments-context.tsx` — Staff Payments

- **Load:** removed `getStaffPayments()` + `migrateLegacyStaffPaymentExpenses()` local migration
- **`recordStaffPayment` local path:** removed `upsertStaffPaymentExpense()` + `saveStaffPayments()`
- Removed dependency on expenses context for initial load
- Initial state: `[]`

## Related fixes

### `context/staff-context.tsx`

- Removed `isStaffReferenced()` that read sales/purchases/expenses/entries from localStorage
- Staff delete reference checks are enforced server-side in `lib/server/services/staff-service.ts` (`assertStaffNotReferenced`)

### `context/day-closing-context.tsx`

- **`closeDay`:** uses `entries` from `EntriesContext` instead of `getEntries()` from localStorage when upserting the completed daily operation

## Data flow after migration

```mermaid
flowchart LR
  UI[React contexts] --> API[Next.js API routes]
  API --> Prisma[Prisma]
  Prisma --> PG[(PostgreSQL)]
```

## Verification

### Sale → Prisma `Sale` table

1. Ensure `NEXT_PUBLIC_USE_API=true` and PostgreSQL is running (`/api/health` reports `databaseConnected: true`).
2. Complete a sale in the UI.
3. `POST /api/sales` calls `createSale()` in `lib/server/services/sales-service.ts`, which inserts into `prisma.sale` inside a transaction (with stock movement).

### Page refresh loads from PostgreSQL

1. After creating a sale, refresh the page.
2. `SalesProvider` calls `loadFromApi` → `GET /api/sales` → `listSales()` → `prisma.sale.findMany()`.
3. The same sale appears because it is loaded from PostgreSQL, not localStorage.

### Database unavailable

1. Stop PostgreSQL or misconfigure `DATABASE_URL`.
2. Business contexts set `loadError` to e.g. *"PostgreSQL is unavailable. Business data cannot be loaded or saved."*
3. Mutations log the same error; no silent localStorage writes occur.

## localStorage retained (non-business)

- Theme, sidebar, filters, active branch preference
- Settings, auth session, branches config, notifications
- Expense templates (form presets)
- Audit log client buffer, historical import undo
- Day closing records (`lib/day-closing/storage.ts`) — not yet migrated to API

## Environment

- `NEXT_PUBLIC_USE_API=true` — required for business data
- Valid `DATABASE_URL` — PostgreSQL must be reachable for load/save operations
