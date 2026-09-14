# Sonic OS — Owner Shop Reset Open-Day Blocker Removal

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**Production data modified:** **NO**  
**Destructive shop reset executed during implementation:** **NO**

---

## Executive Summary

Removed the **open-day blocker** from the Owner-only Shop Reset flow. Owner Shop Reset now authoritatively clears all `DayClosing` records for the selected branch(es)—including `open`, `close_requested`, and `closed`—as part of the existing transactional reset. Normal Close Day / Open Day guards for staff workflows are unchanged.

---

## Why the Open-Day Blocker Was Changed

The Owner Shop Reset exists so the Owner can wipe disposable operational/test data and start a shop fresh. Requiring manual closure of open or pending business days before reset defeated that purpose when test data left branches in `open` or `close_requested` state.

The reset itself is now authoritative: it deletes all branch-scoped `DayClosing` rows inside the same Prisma transaction that clears other operational data. This applies only to Owner-initiated reset—not to cashier, branch manager, or normal day-closing workflows.

---

## What Changed

### Server (`lib/server/branch-shop-reset-service.ts`)

- Removed `assertNoOpenBusinessDays()` and the **409** `shop_reset_open_business_day` rejection on POST reset.
- Preview response: `blockers` → `warnings`; added `openBusinessDayCount`; `canReset` is always `true` for owners.
- Preview warnings include:
  - *"This reset will clear open, pending, and completed operational records for the selected shop."*
  - When open/pending days exist: *"Resetting this shop will also clear its open and pending business days. Make sure the shop is not actively being used."*
- `deleteBranchScopedData` already used `dayClosing.deleteMany({ where: { branchId: { in: branchIds } } })` with **no status filter**—unchanged.
- Post-reset verification confirms **all** `DayClosing` rows are gone for selected branch(es).

### API Types (`lib/api/shop-reset.ts`)

- `blockers: string[]` → `warnings: string[]`
- Added `openBusinessDayCount: number`

### UI (`components/settings/shop-reset-section.tsx`)

- Renders `preview.warnings` instead of blockers.
- Reset button enabled when confirmation phrase matches (no longer gated on `canReset === false`).
- Post-reset verification shows operational counts at 0, preserved master data counts, and **Start Fresh → Open Shop**.

### Tests (`scripts/verify-owner-shop-reset.ts`)

- Removed expectations that open/close_requested days block reset with 409.
- Added checks A–K (non-destructive): preview allows reset with open/close_requested days; static checks for branch isolation, backup, confirmation, catalogue preservation, stock zeroing, AuthAuditLog survival, and transaction rollback architecture.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/server/branch-shop-reset-service.ts` | Remove open-day blocker; warnings in preview; verification for all DayClosing statuses |
| `lib/api/shop-reset.ts` | `warnings` + `openBusinessDayCount` types |
| `components/settings/shop-reset-section.tsx` | Warning UI; remove blocker gate; enhanced verification panel |
| `scripts/verify-owner-shop-reset.ts` | Tests A–K for open-day authoritative reset |
| `docs/data-integrity/OWNER-SHOP-RESET-OPEN-DAY-UPDATE-REPORT.md` | This report |
| `docs/data-integrity/OWNER-SHOP-RESET-OPEN-DAY-UPDATE-REPORT.docx` | Word deliverable |

---

## What Was NOT Changed

- Normal Close Day / Open Day guards (`assertCanOpenRequestedBusinessDay`, previous-business-day-open, etc.)
- Staff closing-request → management approval workflow
- Cashier / branch manager access (still **403** on shop reset)
- Production database safeguards (`assertSafeTransactionalResetTarget`)
- Backup-before-deletion requirement
- Exact confirmation phrase requirement

---

## Tests Actually Run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:owner-shop-reset` | **PASS** (A–K, non-destructive) |
| `npm run verify:branch-selection` | **PASS** |
| `npm run verify:branch-isolation` | **PASS** |
| `npm run verify:final-open-day-guard` | **PASS** |
| `npm run verify:closing-request-approval-flow` | **PASS** |

---

## Preview Deployment

- **Branch pushed:** `cursor/close-shop-ux-fix-b6e7`
- **Preview deployment commit:** `0560ed5`
- **Production touched:** **NO**
- **Destructive reset executed:** **NO**

---

## Preview Readiness for Real Owner Reset Test

After Vercel Preview deploy completes, verify manually:

1. Settings → Data & Backup → Shop Reset shows **warnings** (not blockers) when open/pending days exist.
2. Reset button is enabled once the exact confirmation phrase is entered.
3. Owner can execute reset on a branch with open/pending `DayClosing` records.
4. Post-reset verification shows operational counts at 0 and preserved master data intact.

**Note:** Automated verification confirms server/API behavior locally. Preview UI behavior must be confirmed on the deployed Vercel Preview before claiming production-ready reset.
