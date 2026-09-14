# Sonic OS — Final Preview Shop Reset Fix

**Status:** PASS (static / unit verification)  
**Date:** 2026-09-13  
**Branch:** `cursor/preview-shop-reset-final-b6e7`  
**Production touched:** NO  
**Destructive reset executed:** NO  

## Problem

Owner Shop Reset on Vercel Preview was blocked or confusing after the authentication fix:

1. Preview still behaved like production for maintenance messaging because `APP_ENV=production` is shared across Production and Preview.
2. Maintenance showed: `Business data reset is disabled in production mode.`
3. Some Shop Reset failures could still collapse to `Unexpected server error.` when backup threw a plain Error.

Production must remain permanently protected. Preview must be resettable only when connected to an explicitly authorized Preview/test database fingerprint.

## Root cause

1. Shared `APP_ENV=production` on Preview made `isProductionMode()` true.
2. Shop Reset already classified deployment via `VERCEL_ENV`, but:
   - user-facing messages were not aligned to the required Preview UX strings;
   - Maintenance only exposed Business Data Reset (APP_ENV-based), not Shop Reset;
   - the browser could not distinguish Vercel Preview from Production because `VERCEL_ENV` was not exposed to the client;
   - backup failures were not wrapped as `ApiError`, so production builds returned `Unexpected server error.`

## Exact fix

1. Keep Shop Reset production-deployment gating on trusted `VERCEL_ENV` (`isResetGuardProductionDeployment`).
2. Keep fingerprint / Neon / non-local authorization mandatory for remote Preview databases.
3. Align messages:
   - Production: `Business data reset is disabled in production mode.`
   - Preview unauthorized: `Reset target not authorized for this deployment.`
   - Preview authorized: `Preview reset enabled for authorized test database.`
4. Expose `NEXT_PUBLIC_VERCEL_ENV` from `VERCEL_ENV` in `next.config.ts`.
5. Add Shop Reset to Maintenance and clarify Business Data Reset messaging on Preview.
6. Wrap backup failures as structured `ApiError` (`backup_failed`).

## Environment behavior

| Deployment | Shop Reset production block | Remote Neon authorization |
|---|---|---|
| Local | No | Not required |
| Vercel Preview | No (even if APP_ENV=production) | Required flags + matching fingerprint |
| Vercel Production | Yes unless ALLOW_DESTRUCTIVE_OPS | Blocked first |

No client-provided environment flag can bypass server authorization.

## Database safety model

Required for Preview remote reset:

- Owner authentication
- Trusted `VERCEL_ENV=preview`
- `ALLOW_NEON_TRANSACTIONAL_RESET=true`
- `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`
- matching `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT`
- branch/shop scoped deletion
- backup before delete
- post-reset verification

Production DATABASE_URL was not modified.

## Files changed

- `lib/server/database-target-guard.ts`
- `lib/server/branch-shop-reset-service.ts`
- `lib/env/production-mode-client.ts`
- `next.config.ts`
- `components/settings/shop-reset-section.tsx`
- `components/settings/reset-business-data-section.tsx`
- `app/settings/maintenance/page.tsx`
- `scripts/verify-shop-reset-target-guard.ts`
- `docs/data-integrity/FINAL-PREVIEW-SHOP-RESET-FIX-REPORT.md`
- `docs/data-integrity/FINAL-PREVIEW-SHOP-RESET-FIX-REPORT.docx`

## Tests run

| Command | Result | Notes |
|---|---|---|
| `tsc --noEmit` | PASS | Ran |
| `npm run build` | PASS | Ran |
| `npm run verify:shop-reset-target-guard` static A–H + F2 | PASS | Live HTTP ENVIRONMENT FAILURE (no server) |
| `npm run verify:owner-shop-reset` static | PASS | Live HTTP ENVIRONMENT FAILURE |
| `npm run verify:auth-storage-isolation` static | PASS | Live HTTP ENVIRONMENT FAILURE |
| `npm run verify:branch-selection` static | PASS | Live HTTP ENVIRONMENT FAILURE |
| `npm run verify:branch-authorization` | ENVIRONMENT / FIXTURE FAILURE | DB query failed |
| `npm run verify:financial-assertions` | PASS | Ran |
| `npm run verify:financial-defaults` static | PASS | Live HTTP ENVIRONMENT FAILURE |
| `npm run lint` | Pre-existing failures present | Not claimed as clean PASS |

## Verified

1. Owner auth required — static
2. Non-owner blocked — static coverage retained
3. Production reset blocked — static C/G
4. Preview authorized fingerprint can pass — static F
5. Preview unauthorized fingerprint blocked — static E
6. Fingerprint authorization enforced — static
7. No client env bypass — static H
8. Branch/shop scoped reset — static owner-shop-reset
9. Production DATABASE_URL untouched — no DB mutation in this change
10. Broader business behavior unchanged outside reset UX/guards — scoped diff

## Not verified

- Live Preview redeploy + manual Owner reset on authorized Neon Preview DB
- Live HTTP auth matrix against a running app in this environment
- Actual destructive wipe of Preview DB (intentionally not executed)

## Manual Vercel steps still required

Preview only:

- `ALLOW_NEON_TRANSACTIONAL_RESET=true`
- `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`
- `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT=<preview fingerprint>`

Do not set those on Production.  
Do not set `ALLOW_DESTRUCTIVE_OPS=true` on Production.  
Redeploy Preview after changing env vars.

## Production safety statement

Production remains protected by `VERCEL_ENV=production` reset blocking and existing Owner/fingerprint guards. This change does not wipe Production data and does not modify Production DATABASE_URL.

## Final result

PASS for code/guard/UI fix under static verification. Live Preview confirmation remains a manual post-deploy step.
