# Sonic OS Performance Report

Audit date: 2026-08-02  
Scope: database queries, indexes, React rendering, tables, pagination, memoization, filtering/sorting, reports, API duplication, lazy loading.

No UI redesign was performed. Existing layout, styling, and component structure were preserved.

---

## Executive summary

| Area | Before | After |
|------|--------|-------|
| Report API | Loaded all daily operations, filtered in memory | SQL date-range filter via `listDailyOperationsInPeriod` |
| Duplicate API | `/reports` re-fetched daily operations | Uses `EntriesProvider` data only |
| Stock table render | O(products × branches × movements) per render | Precomputed branch stock matrix + 50-row pagination |
| History tables | Rendered full filtered lists | Client pagination (50 rows/page) |
| Dashboard charts | Eager recharts bundle on home page | Lazy-loaded `InteractiveCharts`, drawer, drill-down |
| Dashboard context | Unstable hook return → broad re-renders | Memoized `useInteractiveAnalytics` return value |
| Sale/purchase writes | N× `product.findUnique` per line item | Batch product preload + in-transaction cache |
| Session auth | DB lookup on every `withDatabase` call | Request-scoped cache via React `cache()` |
| Database indexes | Partial coverage on sort/filter columns | 11 composite/single indexes added |

---

## 1. Database queries

### Fixed

**Reports summary (`GET /api/reports/summary`)**  
Previously called `listDailyOperations()` (full table) then `filterEntriesByPeriod()` in JavaScript.  
Now uses `listDailyOperationsInPeriod(period)` with `where: { date: { gte, lte } }` derived from `getPeriodDateBounds()`.

**Sale completion (`completeSale`)**  
Previously issued one `product.findUnique` per sale line inside the transaction.  
Now batch-loads products with `findMany({ id: { in } })` and passes a `ProductCache` through `applyStockMovement`.

**Purchase creation**  
Same product-cache pattern applied to `applyPurchaseStockIn`.

**Session lookups**  
`getSessionFromRequest` wrapped in React `cache()` to dedupe auth queries within a single request.

### Remaining opportunities (not changed)

| Pattern | Location | Recommendation |
|---------|----------|----------------|
| Unbounded list endpoints | Most `GET /api/*` list routes | Add optional `limit`/`offset` (helper in `lib/server/pagination.ts`) |
| Heavy includes on lists | `listSales`, `listPurchases` with `items: true` | Summary DTO for lists; load items on detail routes |
| Import loop | `importDailyOperations` | Batch upserts instead of per-row transactions |
| Global provider fetches | `app/layout.tsx` | Route-scoped providers to defer ~15 mount API calls |

---

## 2. Indexes

Migration: `prisma/migrations/20260802143000_performance_indexes/migration.sql`

| Table | Index | Supports |
|-------|-------|----------|
| `DailyOperation` | `timestamp` | Sort by timestamp |
| `DailyOperation` | `[branchId, date, timestamp]` | Branch/day lists |
| `ExpenseRecord` | `createdAt`, `[branchId, date, createdAt]` | Expense history sort |
| `StaffPayment` | `createdAt` | Payment history sort |
| `StockMovement` | `[date, createdAt]`, `[branchId, date]` | Movement history |
| `Sale` | `[branchId, status, date]` | Branch sales filters |
| `Session` | `[userId, expiresAt]` | Session validation sweeps |
| `AuthAuditLog` | `[branchCode, createdAt]` | Branch audit timelines |
| `Product` | `[categoryId, status]` | Stock catalog filters |

Apply with: `npm run db:migrate:deploy`

---

## 3. React rendering & memoization

### Fixed

**`useInteractiveAnalytics`** — Return object wrapped in `useMemo` so `DashboardProvider` consumers no longer re-render on every parent tick.

**`useReports`** — Removed redundant `fetchDailyOperations()` `useEffect`; derives from `useEntriesContext()` only.

**`StockProductsTable`** — `buildBranchStockMatrix()` precomputes branch quantities once per data change.

### Remaining opportunities

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| 13 nested global providers | All routes load all domain data | Split providers into route-group layouts |
| Monolithic context values | Any field change re-renders all consumers | Split data/actions contexts or selector hooks |
| `CompactBusinessPulseCard` | Recomputes dashboard analytics independently | Share memoized analytics from parent |
| No `React.memo` on row components | Table row re-renders on parent updates | Memoize extracted row components |

---

## 4. Large tables & pagination

### Fixed (50 rows/page, existing table chrome)

- `StockProductsTable`
- `SalesHistoryTable`
- `PurchaseHistoryTable`
- `ExpenseHistoryTable`
- `AuditLogTable`

Shared utilities:

- `lib/pagination.ts` — slice helper
- `hooks/use-paginated-list.ts` — page state + reset on filter change
- `components/shared/table-pagination.tsx` — Previous/Next footer

### Remaining opportunities

- `StockMovementTable`, `CustomersTable`, `SuppliersTable`, `UsersTable`, `HistoryList`
- Virtualization (`@tanstack/react-virtual`) if lists exceed ~500 visible rows

---

## 5. Filtering & sorting

Client-side filtering (sales, purchases, expenses, audit) already uses `useMemo` in hooks — no change required.

Server-side report filtering now aligned with client period logic via shared `getPeriodDateBounds()`.

---

## 6. Reports

| Report | Optimization |
|--------|--------------|
| `/api/reports/summary` | SQL period filter |
| `/reports` page | Removed duplicate entries fetch |
| Dashboard analytics | Lazy chart bundles + stable context |
| `CompactBusinessPulseCard` | Already memoized; still duplicates analytics compute (future: shared hook) |

---

## 7. Duplicate API requests

| Removed | Details |
|---------|---------|
| `use-reports.ts` mount fetch | Was duplicating `EntriesProvider` load on `/reports` |

### Still present

Contexts still fetch full datasets on app mount (~15 calls). Deferred loading would require provider restructuring (recommended future work).

---

## 8. Lazy-loaded heavy pages

| Component | Change |
|-----------|--------|
| `InteractiveCharts` | `dynamic()` in `dashboard-analytics.tsx` |
| `KpiDetailDrawer` | `dynamic({ ssr: false })` |
| `DrillDownPanel` | `dynamic({ ssr: false })` |
| `ReportsChart` | Already lazy on `/reports` (unchanged) |

### Recommended next targets

- `app/expenses/reports/page.tsx` (heavy `useCashFlow`)
- `app/staff/reports/page.tsx` (heavy `computeStaffReports`)
- `components/operations/close-day-workspace.tsx`

---

## 9. Files changed

### Database
- `prisma/schema.prisma`
- `prisma/migrations/20260802143000_performance_indexes/migration.sql`
- `lib/dates.ts` — `getPeriodDateBounds()`
- `lib/server/services/daily-operations-service.ts` — `listDailyOperationsInPeriod`
- `lib/server/services/sales-service.ts` — product batch preload
- `lib/server/services/purchasing-service.ts` — product cache
- `lib/server/stock-transactions.ts` — `ProductCache`
- `lib/server/session.ts` — request-scoped cache
- `lib/server/pagination.ts` — server query helper
- `app/api/reports/summary/route.ts`

### React
- `hooks/use-reports.ts`
- `hooks/use-interactive-analytics.ts`
- `hooks/use-paginated-list.ts`
- `lib/pagination.ts`
- `lib/stock/calculations.ts` — `buildBranchStockMatrix`
- `components/shared/table-pagination.tsx`
- `components/stock/stock-products-table.tsx`
- `components/sales/sales-history-table.tsx`
- `components/purchasing/purchase-history-table.tsx`
- `components/expenses/expense-history-table.tsx`
- `components/audit-log/audit-log-table.tsx`
- `components/dashboard/dashboard-analytics.tsx`

---

## 10. Verification

```bash
npm run build          # TypeScript + Next.js compile
npm run db:migrate:deploy   # Apply performance indexes (PostgreSQL required)
```

Manual checks:

1. Open `/sales/history`, `/purchasing/history`, `/expenses/history`, `/settings/audit-log` — confirm pagination appears when >50 rows.
2. Open `/stock/products` — confirm branch stock columns match previous values.
3. Open dashboard — charts load after skeleton; filters still work.
4. Complete a sale with multiple line items — stock decrements correctly.

---

## Priority backlog

1. **P0** — Route-scoped providers (largest load-time win)
2. **P1** — Server-side pagination on high-volume API list routes
3. **P1** — List endpoints without nested `items`/`expenses`
4. **P2** — Shared dashboard analytics hook (eliminate triple compute on home)
5. **P2** — Virtualized tables for 500+ row views
6. **P3** — Optimistic context updates instead of full refresh after mutations
