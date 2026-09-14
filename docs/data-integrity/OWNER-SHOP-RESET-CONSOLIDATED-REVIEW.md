# Sonic OS — Owner Shop Reset Consolidated Review Document

**Date:** 2026-09-13  
**Branch:** `cursor/close-shop-ux-fix-b6e7`  
**PR:** #39  
**Preview URL:** https://sonic-os-git-cursor-close-shop-ux-fix-b6e7-sonic9.vercel.app  
**Latest Preview commit:** `a1b28f9`  
**Production touched:** **NO**  
**Destructive reset executed:** **NO**

---

## Executive Summary

This document consolidates the Owner Shop Reset feature work for review. The feature allows the Owner to reset one shop (Kansanga or Salaama) or both back to a clean operational state while preserving users, staff, roles, branches, settings, and the product catalogue.

The feature is located at **Settings → Data & Backup → Shop Reset**. It is Owner-only, requires exact confirmation phrases, creates a backup before deletion, and runs inside a single database transaction.

Three issues were identified and fixed during Preview testing:

1. **Open-day blocker removed** — Owner reset no longer requires manually closing open/pending business days first.
2. **Preview POST failure diagnosed and fixed** — Guard refusals now return actionable API errors instead of generic 500.
3. **Preview misclassified as Production** — Vercel Preview (`VERCEL_ENV=preview`) is now correctly distinguished from Vercel Production for reset authorization.

**Manual Preview retest is still required** after setting Preview environment variables (see Section 6).

---

## 1. Feature Overview

### Location
Settings → Data & Backup → Shop Reset

### Scopes
| Scope | Confirmation Phrase |
|-------|---------------------|
| Kansanga | `RESET KANSANGA SHOP` |
| Salaama | `RESET SALAAMA SHOP` |
| Both Shops | `RESET BOTH SONIC SHOPS` |

### Cleared (per selected branch)
Sales, expenses, purchases, staff payments, daily operations, day closings (all statuses), stock movements, customers/suppliers, branch-scoped audit entries. Product `currentStock` reset to 0.

### Preserved
Users, staff, roles, branches, product catalogue (definitions, SKUs, prices), categories, settings, AuthAuditLog, BackupRecord.

### Security Controls
- Owner-only authorization (`requireOwner` + API `ownerOnly: true`)
- Database target guard with fingerprint pinning
- Backup required before deletion
- Single Prisma transaction
- Exact confirmation phrase required
- Non-owner receives 403

---

## 2. Issue #1 — Open-Day Blocker Removal

### Problem
Preview showed: *"4 open business day(s) or pending closing request(s) must be closed first."*

### Root Cause
Owner reset incorrectly required all DayClosing records to be closed before reset.

### Fix
- Removed `assertNoOpenBusinessDays()` and 409 blocker on POST.
- Preview shows owner warnings instead of blockers.
- Reset transactionally deletes all DayClosing records (open, close_requested, closed).
- Normal staff Close Day / Open Day guards unchanged.

### Commit
`0560ed5`

---

## 3. Issue #2 — Preview POST "Unexpected Server Error"

### Problem
Clicking Reset with correct confirmation returned *"Unexpected server error."*

### Root Cause
`assertSafeTransactionalResetTarget()` blocked remote Neon Preview database. Plain `Error` was masked as HTTP 500 `internal_error`.

### Fix
- Guard refusals return **403 `reset_target_forbidden`** with actionable messages.
- Non-local Neon requires ALL of:
  - `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`
  - `ALLOW_NEON_TRANSACTIONAL_RESET=true`
  - `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT=<exact fingerprint>`
- Preview GET exposes fingerprint and required env vars in UI.

### Commit
`2c6e03d`

---

## 4. Issue #3 — Preview Misclassified as Production

### Problem
Preview UI showed: *"Shop reset is disabled in production mode"* on a Vercel Preview deployment.

### Root Cause
Guard used `APP_ENV=production` without checking `VERCEL_ENV=preview`. Vercel Preview builds legitimately have `NODE_ENV=production` and often `APP_ENV=production`.

**Exact misclassification signal:** `APP_ENV=production` without honoring `VERCEL_ENV=preview`.

### Fix
- New `lib/env/deployment-environment.ts` classifies deployments using `VERCEL_ENV` first.
- Vercel Preview is **not** treated as production for reset guard.
- UI shows: Local / Vercel Preview / Vercel Production / Remote.

### Preview Database Fingerprint
`3c974614fe7b`

### Commit
`247ddcc` / `a1b28f9`

---

## 5. Preview vs Production Guard Behavior

| Deployment | Production reset block | Neon + fingerprint required |
|------------|------------------------|----------------------------|
| Local | No | No |
| Vercel Preview | No | Yes |
| Vercel Production | Yes | Blocked at production check |
| Remote + APP_ENV=production | Yes | Yes (if not production-blocked) |

Flags alone never authorize arbitrary Neon databases. Fingerprint must match.

---

## 6. Preview Configuration Required (Manual Action)

Set in **Vercel → Project → Settings → Environment Variables → Preview ONLY**:

| Variable | Value |
|----------|-------|
| `ALLOW_NEON_TRANSACTIONAL_RESET` | `true` |
| `ALLOW_NONLOCAL_TRANSACTIONAL_RESET` | `true` |
| `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT` | `3c974614fe7b` |

**Do NOT set on Production.** Redeploy Preview after saving.

### Verification Steps After Deploy
1. Open Preview → Settings → Data & Backup → Shop Reset.
2. Confirm **Deployment: Vercel Preview** (not production mode error).
3. Confirm fingerprint `3c974614fe7b` is shown.
4. After env vars set and redeployed, confirm reset button enables with correct confirmation phrase.
5. Execute real Owner reset test manually.

---

## 7. Legacy vs New Reset Systems

| System | Location | API | Guard | Backup |
|--------|----------|-----|-------|--------|
| **NEW Shop Reset** | Data & Backup → Shop Reset | `/api/admin/shop-reset` | Yes | Yes |
| **LEGACY Maintenance** | Maintenance → Reset Business Data | `/api/admin/business-reset` | No | No |

Both coexist. NEW Shop Reset is canonical. They do not share code paths.

---

## 8. Tests Run (All PASS)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run verify:shop-reset-target-guard` | PASS (A–H) |
| `npm run verify:owner-shop-reset` | PASS |
| `npm run verify:branch-selection` | PASS |
| `npm run verify:branch-isolation` | PASS |
| `npm run verify:final-open-day-guard` | PASS |
| `npm run verify:closing-request-approval-flow` | PASS |

No destructive reset was executed during any automated test.

---

## 9. Key Files Changed

| File | Purpose |
|------|---------|
| `lib/server/branch-shop-reset-service.ts` | Core reset logic |
| `lib/server/database-target-guard.ts` | Target authorization |
| `lib/env/deployment-environment.ts` | VERCEL_ENV classification |
| `app/api/admin/shop-reset/route.ts` | Owner-only API |
| `components/settings/shop-reset-section.tsx` | UI |
| `scripts/verify-owner-shop-reset.ts` | Verification |
| `scripts/verify-shop-reset-target-guard.ts` | Guard regression tests |

---

## 10. Status Summary

| Item | Status |
|------|--------|
| Feature implemented | YES |
| Open-day blocker removed | YES |
| Preview guard errors actionable | YES |
| Preview deployment classification fixed | YES |
| Production protected | YES |
| Production data modified | NO |
| Destructive reset executed in dev/agent | NO |
| Preview env vars configured | PENDING (manual) |
| Preview reset verified end-to-end | PENDING (manual) |
| Ready to merge | PENDING Preview sign-off |

---

## 11. Supporting Detail Reports

| Report | Topic |
|--------|-------|
| `OWNER-SHOP-RESET-REPORT.md` | Initial feature implementation |
| `OWNER-SHOP-RESET-OPEN-DAY-UPDATE-REPORT.md` | Open-day blocker removal |
| `OWNER-SHOP-RESET-PREVIEW-FAILURE-REPORT.md` | Preview POST failure diagnosis |
| `OWNER-SHOP-RESET-PREVIEW-FIX-REPORT.md` | Guard + fingerprint fix |
| `VERCEL-PREVIEW-RESET-TARGET-FIX-REPORT.md` | Preview vs Production classification |

Word (.docx) versions of each report are in the same directory.
