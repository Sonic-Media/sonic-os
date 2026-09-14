# Sonic OS — Final Shop Reset Blocker Report

**Status:** PASS (static / unit verification)  
**Date:** 2026-09-14  
**Branch:** `cursor/preview-shop-reset-final-b6e7`  
**Production touched:** NO  
**Destructive reset executed:** NO  
**Live Preview destructive reset retested:** NO (not claimed)

## Problem

Live authorized Vercel Preview confirmed:

1. Preview authorization works (green banner).
2. Backup Now succeeds (`JSON (gzip)`).
3. BigInt serialization blocker is fixed.

But Shop Reset still did not complete. The reset button remained disabled and/or the reset action did not finish. The selected target could show **Both Shops**.

## Investigation path traced

UI button → confirmation validation → client request → API route → owner auth → Preview guard → fingerprint guard → backup → shop reset service → transaction → verification.

Already working:

- Owner authentication
- Preview deployment detection
- Authorized database fingerprint
- Backup creation / BigInt-safe JSON serialization

## Root cause (exact next blocker)

### Primary (why the button stays disabled after authorization)

Shop Reset enables the submit button only when **both** are true:

1. `preview.resetTarget.authorized === true` (green banner)
2. Confirmation input matches the exact phrase for the selected scope

Authorization alone never enables the button. Exact phrases:

| Scope | API value | Confirmation phrase |
|---|---|---|
| Kansanga | `main` | `RESET KANSANGA SHOP` |
| Salaama | `salaama` | `RESET SALAAMA SHOP` |
| Both Shops | `both` | `RESET BOTH SONIC SHOPS` |

The previous confirmation label wrapped the phrase in quotes (`Type "RESET …" to confirm`), which made it easy to type/paste with quotes and keep the button disabled with no clear explanation.

### Secondary (would block reset after confirmation)

Shop Reset accepted backup artifacts as:

```ts
backup.archivePath ?? backup.sqlPath
```

It omitted `jsonPath`. Backup Now already accepted `archivePath ?? sqlPath ?? jsonPath`.

On Preview, backups are JSON (optionally gzip). If only `jsonPath` is present (uncompressed JSON), Shop Reset treated a successful backup as failure and refused to delete — correctly preserving the backup-before-reset safety rule, but incorrectly failing the gate.

## Exact code change

1. **`resolveBackupArtifactPath()`** in `lib/backup/backup.ts`  
   Shared helper: `archivePath ?? sqlPath ?? jsonPath`
2. **Shop Reset service** uses that helper before delete.
3. **Backup service** uses the same helper for serverless persistence.
4. **Confirmation UX**
   - Show phrase in a monospace box (no quote trap in the label)
   - Label: `Type the phrase above exactly (no quotes)`
   - Amber blocker message when authorized but confirmation does not match
   - Emerald ready message when phrase matches
5. **`normalizeShopResetConfirmation()`** strips accidental wrapping quotes on client and server.
6. **`resolveShopResetLookupCodes()`** dry-run helper for Kansanga / Salaama / Both.
7. Regression script: `npm run verify:shop-reset-blocker`

## Both Shops support

- UI option label **Both Shops** sends API scope **`both`** (not the label string).
- Server accepts `both` and resolves lookup codes `main` + `salaama` (Salaama aliases include `branch2`).
- Confirmation for both: `RESET BOTH SONIC SHOPS`.

## Files changed

- `lib/backup/backup.ts`
- `lib/backup/index.ts`
- `lib/server/branch-shop-reset-service.ts`
- `lib/server/backup/backup-service.ts`
- `lib/shop-reset/constants.ts`
- `components/settings/shop-reset-section.tsx`
- `scripts/verify-shop-reset-blocker.ts`
- `package.json`
- `docs/data-integrity/FINAL-SHOP-RESET-BLOCKER-REPORT.md`
- `docs/data-integrity/FINAL-SHOP-RESET-BLOCKER-REPORT.docx`

## Tests run

| Command | Result | Notes |
|---|---|---|
| `npm run verify:shop-reset-blocker` | PASS 17/17 | Scope/phrases/jsonPath/UI gate/safety |
| `npm run verify:backup-bigint` | PASS 9/9 | |
| `npx tsc --noEmit` | PASS | |
| `npm run build` | PASS | |
| `npm run verify:owner-shop-reset` | PASS (static) | Live HTTP skipped (`ECONNREFUSED`) |
| `npm run verify:shop-reset-target-guard` | PASS (static unit guards) | Live HTTP skipped |

## Safety guarantees preserved

Required sequence unchanged:

1. Owner authentication  
2. Trusted deployment verification  
3. Authorized database fingerprint verification  
4. Backup creation  
5. Reset **ONLY** after backup succeeds  
6. Post-reset verification  

If step 4 fails, step 5 does not run.

Unchanged:

- Production reset protection
- Preview fingerprint authorization
- Branch isolation
- Backup-before-reset prerequisite
- No Production data / `DATABASE_URL` changes
- No `ALLOW_DESTRUCTIVE_OPS` on Production

## What was NOT tested

- Live Preview confirmation typing / button enable after this deploy
- Live Preview destructive Shop Reset execution
- Production backup / reset
- Local HTTP live API calls (no server in this agent environment)

## Exact next manual Preview verification steps

Do **not** run against Production.

1. Deploy this branch to the authorized Vercel Preview.
2. Sign in as Owner → **Settings → Maintenance**.
3. Confirm green banner: Preview reset enabled for authorized test database.
4. Confirm Backup Now still succeeds.
5. In Shop Reset, select **Kansanga**.
6. Confirm the monospace phrase shows `RESET KANSANGA SHOP`.
7. Leave confirmation empty → button stays disabled and amber helper explains why.
8. Type the phrase exactly (no quotes) → button enables; emerald “ready” message appears.
9. Optionally select **Salaama** / **Both Shops** and confirm phrases:
   - Salaama: `RESET SALAAMA SHOP`
   - Both: `RESET BOTH SONIC SHOPS`
10. Only if authorized operators choose to: run reset on the authorized Preview/test DB and confirm backup → delete → verification.
11. This agent did **not** execute the destructive reset.

## Secrets policy

This report omits `DATABASE_URL` values, fingerprints, session secrets, credentials, and environment-variable values.
