# Sonic OS — Safe Transactional Reset Report

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Production touched:** **NO**  
**Preview database reset:** **NOT RUN** (identity not verified from this environment)  

---

## Executive Summary

A guarded transactional reset was executed against the **local development PostgreSQL database only**. Master data (users, staff, branches, product catalog, settings) was preserved. All operational/transactional test data was cleared. **Production Neon was not accessed or modified.**

---

## Target Database Identified

| Property | Local environment (reset executed) | Vercel Preview (not reset from here) |
|----------|-----------------------------------|-------------------------------------|
| Host | `localhost` | **Unknown — not verified** |
| Port | `5432` | Unknown |
| Database name | `sonic_os` | Unknown |
| User | `sonic` | Unknown |
| Schema | `public` | Unknown |
| Fingerprint (sha256 host/db, 12 chars) | `c400f10d4dbe` | Unknown |
| Neon host | **No** | Unknown (often Neon on Vercel — **do not assume separate from production**) |
| APP_ENV | `development` | Unknown |
| APP_MODE | `(unset)` | Unknown |
| Production mode | **false** | Unknown |

**Safety decision:** Reset ran only because host was local, not Neon, not production mode, and fingerprint was verified before deletion.

---

## Production Safety

| Check | Result |
|-------|--------|
| Production Neon modified | **NO** |
| Production environment variables changed | **NO** |
| Full database wipe | **NO** |
| Schema/migrations changed | **NO** |
| PR merged | **NO** |
| Deploy triggered | **NO** |

---

## Models / Data Reset (Transactional)

Deleted or cleared:

| Model | Records deleted |
|-------|-----------------|
| StaffPayment | 3 |
| ExpenseRecord | 48 |
| Sale | 2 |
| SaleLineItem | 0 |
| Customer | 0 |
| Purchase | 0 |
| PurchaseLineItem | 0 |
| DailyOperation | 49 |
| DailyOperationExpense | 10 |
| DayClosing | 36 |
| StockMovement | 3 |
| StockPriceChange | 0 |
| Supplier | 0 |
| AuditLogEntry | 49 |
| ActivityLog | 0 |
| Session | 8 |

Additionally: **product `currentStock` reset to 0** on 3 products (catalog rows preserved; prices/definitions unchanged).

---

## Models / Data Preserved (Master)

| Model | Count after reset |
|-------|-------------------|
| User | 10 |
| Staff | 19 |
| Branch | 2 |
| Role | 3 |
| Product | 3 |
| ProductCategory | 12 |
| ExpenseCategory | 30 |
| ExpenseTemplate | 7 |
| AppSetting | 1 |
| UserPreference | 1 |
| AuthAuditLog | 598 |
| BackupRecord | 0 |

---

## Backup

Pre-reset backup created:

`/workspace/backups/sonic-os-sonic_os-2026-09-13T14-01-11-612Z.sql.gz`

---

## Verification Results (A–L)

| Test | Result |
|------|--------|
| A — Users/staff still exist | **PASS** (users=10, staff=19) |
| B — Branches still exist | **PASS** (2) |
| C — Products still exist | **PASS** (3) |
| D — No sales | **PASS** |
| E — No expenses | **PASS** |
| F — No purchases | **PASS** |
| G — No staff payments | **PASS** |
| H — No daily operations | **PASS** |
| I — No day closings | **PASS** |
| J — No pending closing requests | **PASS** |
| K — No open business days | **PASS** |
| L — No operational audit rows | **PASS** |

Command: `npm run verify:safe-transactional-reset` — **PASS**

---

## Script Safeguards Added

`npm run db:safe-reset -- --yes --confirmation "RESET SONIC"`

Refuses when:

- `APP_ENV`/`APP_MODE` = production without `ALLOW_DESTRUCTIVE_OPS=true`
- `DATABASE_URL` host is Neon without `ALLOW_NEON_TRANSACTIONAL_RESET=true`
- Non-local host without `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`
- Database name in `SONIC_BLOCKED_RESET_DATABASES`

Dry run: `npm run db:safe-reset -- --dry-run`

---

## Data Not Reset / Limitations

| Item | Status |
|------|--------|
| AuthAuditLog (login history) | **Preserved** intentionally |
| BackupRecord rows | **Preserved** |
| Product catalog rows | **Preserved**; stock quantities zeroed |
| Vercel Preview database | **NOT RESET** — identity not proven safe from agent environment |
| Production database | **NOT TOUCHED** |

---

## Preview Database Guidance

Before resetting Preview:

1. In Vercel → Project → Settings → Environment Variables, inspect Preview `DATABASE_URL` host and database name.
2. Confirm it is **not** the production Neon database/project.
3. Only then run reset from a machine with that Preview URL configured, using non-local guards + confirmation.

**Do not assume Preview uses a separate database.**

---

## Ready for Clean E2E Test?

| Environment | Ready? |
|-------------|--------|
| Local (`localhost` / `sonic_os`) | **YES** — both branches can Open Shop fresh |
| Vercel Preview | **UNKNOWN** — manual verification required |
| Production | **NO ACTION TAKEN** |

---

## Files Changed

- `lib/server/database-target-guard.ts` — target identification + refusal rules
- `lib/server/safe-transactional-reset.ts` — preserve products; clear operational data
- `scripts/safe-transactional-reset.ts` — confirmation + dry-run + identity report
- `scripts/verify-safe-transactional-reset-state.ts` — post-reset verification
- `docs/DATA_PROTECTION.md` — updated safe-reset documentation
