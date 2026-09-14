# Sonic OS — Data Integrity Certification Matrix

**Date:** 2026-09-11  
**Branch:** `cursor/data-integrity-certification-b6e7`  
**Commit:** (see final report)

| # | Area | Result | Evidence | Blocker |
|---|------|--------|----------|---------|
| 1 | Database truth | PASS | PostgreSQL via Prisma; business models present (Product, Sale, Purchase, ExpenseRecord, DailyOperation, DayClosing, Staff, StaffPayment, StockMovement, User, UserPreference, BackupRecord, Branch); `lib/data-source` has no localStorage business fallback | — |
| 2 | Branch isolation | FAIL | Static audit: `sales/expenses/stock/purchasing` use `getBranchIdForSession`; `day-closings-service` and `daily-operations-service` writes use `getBranchIdByCode(parsed.branch)` without `assertSessionCanAccessBranchCode`. `verify:branch-isolation` FAIL: `computeDashboardMetrics` returns `null` for empty catalog (`null !== 0`). `verify:branch-operations` FAIL: owner day-closing fixture incomplete | Staff could craft cross-branch day open/close/daily-op requests unless blocked elsewhere |
| 3 | Inventory integrity | FAIL | `verify:stock` FAIL after product create/edit: "Product does not belong to this branch" on subsequent branch-scoped operation. Empty local catalog limits reconciliation | Environment + branch product ownership interaction |
| 4 | Sales integrity | FAIL | `verify:sales` FAIL: "Product does not belong to this branch" | Requires seeded branch products + dev server |
| 5 | Purchasing integrity | FAIL | `verify:purchasing` FAIL: "One or more products were not found" | Fixture/environment |
| 6 | Expense integrity | PARTIAL | `verify:expenses` 10/10 functional checks PASS then cleanup FAIL: FK on `expenseCategory.deleteMany` | Cleanup bug in verify script; core expense CRUD exercised |
| 7 | Staff payment integrity | BLOCKED | No dedicated `verify:staff-payment-branch` on this branch; staff-payments derive branch from staff record, not explicit session branch assert | Fix branch not merged |
| 8 | Day opening/closing | FAIL | Code review: `closeDay` is non-atomic (sync daily op then upsert day closing); no `getBranchIdForSession` on open/close/reopen. `verify:branch-operations` FAIL | Cross-branch write gap + non-atomic close |
| 9 | Historical operations | BLOCKED | `verify:historical-import` BLOCKED: ledger file path hardcoded to developer machine | ENVIRONMENT / FIXTURE |
| 10 | Authentication | PARTIAL | `verify:users` 8/8 PASS then invalid-login expectation FAIL (200 !== 400). Session/login via API verified partially | Test expectation vs implementation |
| 11 | Authorization | FAIL | `verify:roles` 7/8 PASS then module access FAIL. Day-closing write authorization gap (see row 2) | Code + test environment |
| 12 | Transaction safety | PASS (documented) | Sales, purchases, expenses, staff payments, stock mutations use `prisma.$transaction`. Day close: `syncClosedDayDailyOperation` then `dayClosing.upsert` — intentionally non-atomic | Day close partial-failure state possible |
| 13 | Destructive protection | PARTIAL | Production reset guarded (`production-reset.ts`, seed guards in docker). Soft-delete extension on Prisma. Full destructive-action matrix not run | No dedicated gate script on branch |
| 14 | Financial reconciliation | PARTIAL | `verify:reports` 6/6 PASS (static aggregation). `verify:reports-module` FAIL: savings assertion `50000 !== 0`. Cross-branch totals not fully reconciled in live DB | Fixture/historical data mismatch |
| 15 | BigInt/precision | PARTIAL | `DailyOperation.timestamp` is BigInt; mapper uses `Number(operation.timestamp)` — safe for ms timestamps. JSON backup converts `BackupRecord.fileSizeBytes` via `Number()` — documented risk for values > MAX_SAFE_INTEGER | JSON backup fallback precision |
| 16 | Migration integrity | PASS | 9 migrations; `deletedAt`, `lastLoginAt`, product branch ownership migrations present; `scripts/docker-entrypoint.sh` uses `prisma migrate deploy` only | `prisma migrate diff` requires shadow DB (not run against Neon) |
| 17 | Backup | PASS | `npm run db:backup` created `backups/sonic-os-sonic_os-2026-09-11T14-16-05-256Z.sql.gz` + manifest on local PostgreSQL | Filesystem persistence only verified locally |
| 18 | Restore | PASS | Fresh backup then `scripts/cert-restore-test.ts`: isolated DB `sonic_os_restore_cert`; pg_dump restore; row counts match (incl. dailyOperation=15, dayClosing=7) | Stale backup fails reconciliation; financial totals not independently recalculated |
| 19 | Cross-branch reconciliation | FAIL | Local DB has 0 products per branch; `verify:branch-isolation` could not prove inventory isolation end-to-end | Empty fixture |
| 20 | Concurrency/race safety | BLOCKED | No `verify:awaited-mutations` or race scripts on this branch | Fix branches not merged |
| 21 | Verification suite | FAIL | 2/14 runnable scripts PASS (`documentation-drift`, `reports`); 11 FAIL; 1 BLOCKED; 19 fix-specific scripts NOT AVAILABLE | See final report inventory |
| 22 | TypeScript | PASS | `npx tsc --noEmit` exit 0 | — |
| 23 | Production build | FAIL | `npm run build` exit 1: prerender `/_global-error` — `Cannot read properties of null (reading 'useContext')` | Pre-existing Next.js build defect |
| 24 | ESLint | FAIL | `npm run lint`: 44 errors, 56 warnings | Pre-existing lint debt |
| 25 | Production configuration | PASS | `DATABASE_URL` configured (local PostgreSQL in test env); migration strategy documented; docker entrypoint uses migrate deploy; no secrets in this report | Production Neon not exercised |

## Critical gate summary

| Critical area | Result |
|---------------|--------|
| Database truth | PASS |
| Branch isolation | **FAIL** |
| Financial reconciliation | **PARTIAL / FAIL** |
| Migration integrity | PASS |
| Backup | PASS |
| Restore | PASS |
| Authorization | **FAIL** |

**Gate decision:** NOT CERTIFIED — FIX REQUIRED
