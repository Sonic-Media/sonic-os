# Sonic OS — Owner-Only Shop Reset Report

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Production data modified:** **NO**  
**Destructive shop reset executed during implementation:** **NO**  

---

## Executive Summary

Implemented an **Owner-only Shop Reset** capability at **Settings → Data Protection → Shop Reset**. The feature resets **one branch** (Kansanga or Salaama) or **both shops** back to a clean operational state while preserving users, staff, roles, branches, settings, and the product catalogue (definitions and prices). It reuses the existing backup infrastructure and database-target guard. **No production data was modified during implementation.**

---

## Security Model

| Control | Implementation |
|---------|----------------|
| Authorization | `requireOwner(session)` + API route `ownerOnly: true` |
| Non-owner access | **403 Forbidden** (cashier, branch manager verified) |
| Branch validation | Server resolves canonical branch codes (`main`, `branch2`) via `getBranchIdByCode` |
| Owner scope | Owner may reset any branch (intended owner-wide operational control) |
| Open day guard | Reset blocked when `DayClosing.status` is `open` or `close_requested` (**409**) |
| Confirmation | Exact phrase required per scope |
| Database guard | `assertSafeTransactionalResetTarget()` before deletion |
| Backup | `createDatabaseBackup()` — abort if backup output missing |
| Transaction | Single Prisma `$transaction` — rollback on any failure |
| Audit | `AuthAuditLog` via `recordSecurityAuditInTransaction` (survives operational reset) |

### Confirmation Phrases

| Scope | Phrase |
|-------|--------|
| Kansanga | `RESET KANSANGA SHOP` |
| Salaama | `RESET SALAAMA SHOP` |
| Both Shops | `RESET BOTH SONIC SHOPS` |

---

## Reset Scope (Transactional — Branch-Scoped)

**Cleared per selected branch(es):**

- Sale, SaleLineItem
- ExpenseRecord
- Purchase, PurchaseLineItem
- StaffPayment
- DailyOperation, DailyOperationExpense
- DayClosing (all statuses when no open/pending remain)
- StockMovement, StockPriceChange (branch products)
- Customers / Suppliers orphaned after branch sales/purchases removed
- AuditLogEntry (branch-scoped via `branchCode`)
- Product `currentStock` reset to **0** (catalogue rows preserved)

**Preserved globally:**

- User, Staff, Role, Branch
- Product (definitions, SKUs, buying/selling prices)
- ProductCategory, ExpenseCategory, ExpenseTemplate
- AppSetting, UserPreference
- AuthAuditLog, BackupRecord

---

## UI Location

**Settings → Data Protection → Shop Reset**

Features:

- Shop selector (Kansanga / Salaama / Both Shops)
- Will Be Cleared / Will Be Preserved panels with live counts
- Open-day blocker messaging
- Confirmation phrase input — Reset disabled until exact match
- Progress: Backing up → Resetting → Verifying → Complete
- Post-reset verification summary + **Start Fresh → Open Shop**

---

## Files Changed

| File | Purpose |
|------|---------|
| `lib/shop-reset/constants.ts` | Scopes, confirmation phrases |
| `lib/server/branch-shop-reset-service.ts` | Branch-scoped reset service |
| `app/api/admin/shop-reset/route.ts` | Owner-only GET preview / POST reset |
| `lib/api/shop-reset.ts` | Client API |
| `components/settings/shop-reset-section.tsx` | Shop Reset UI |
| `components/settings/settings-data-backup-panel.tsx` | Embeds Shop Reset in Data Protection |
| `scripts/verify-owner-shop-reset.ts` | Non-destructive verification |
| `package.json` | `verify:owner-shop-reset` script |

---

## Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:owner-shop-reset` | **PASS (16/16)** — no destructive reset executed |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS** |

### Owner Shop Reset Checks (16)

| # | Test | Result |
|---|------|--------|
| 1 | Owner authorization enforced | **PASS** |
| 2 | Single DB transaction | **PASS** |
| 3 | Product catalogue preserved | **PASS** |
| 4 | Auth audit record | **PASS** |
| 5 | Database target guard | **PASS** |
| 6 | Open business day blocks reset | **PASS** |
| 7 | Exact confirmation phrase (UI + server) | **PASS** |
| 8 | Backup before deletion | **PASS** |
| 9 | Owner preview GET | **PASS** |
| 10 | Cashier POST → 403 | **PASS** |
| 11 | Branch manager POST → 403 | **PASS** |
| 12 | Wrong confirmation → 400 | **PASS** |
| 13 | Open day blocks reset → 409 | **PASS** |
| 14 | Blocked reset leaves data intact | **PASS** |
| 15 | Distinct branch confirmation phrases | **PASS** |
| 16 | Production DB guard present | **PASS** |

### Not Run (by design)

| Test | Status |
|------|--------|
| Full successful destructive reset E2E | **NOT RUN** — per implementation requirement |
| Transaction rollback simulation | **NOT RUN** — static `$transaction` audit only |
| Manual production UI test | **NOT RUN** |

---

## Production Safety

- **Production database modified:** **NO**
- **Destructive reset executed during implementation:** **NO**
- Existing `database-target-guard` remains enforced
- Neon/production requires explicit env overrides (unchanged)

---

## Ready for Manual Production Testing?

**YES (with caution)** — code complete, tests pass, but:

1. Manually verify UI on Preview as Owner
2. Confirm target database is intended before first production reset
3. Ensure all business days are **closed** before reset
4. Verify backup completes successfully in production environment (Neon JSON export path)

---

## Recommendation

Deploy to Preview first. Owner should:

1. Close all open business days
2. Settings → Data Protection → Shop Reset
3. Select shop, enter exact confirmation phrase
4. Verify counts post-reset
5. Open Shop for fresh E2E testing
