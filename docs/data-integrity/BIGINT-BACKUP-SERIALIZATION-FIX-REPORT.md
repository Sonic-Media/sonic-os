# Sonic OS — BigInt Backup Serialization Fix

**Status:** PASS (static / unit verification)  
**Date:** 2026-09-14  
**Branch:** `cursor/preview-shop-reset-final-b6e7`  
**Production touched:** NO  
**Destructive reset executed:** NO  
**Live Preview reset retested:** NO (not claimed)

## Problem

Authorized Preview Shop Reset passed the owner / deployment / fingerprint guards and showed:

> Preview reset enabled for authorized test database.

Clicking **Reset Kansanga Shop** still failed with:

> Backup failed — shop reset was not started. Do not know how to serialize a BigInt

Manual **Backup Now** on Maintenance → Data Protection failed with the same BigInt serialization error.

Shop reset correctly refused to delete because backup creation failed. The remaining blocker was JSON backup serialization of Prisma `BigInt` fields.

## Root cause

On Vercel (serverless), database backup falls back to JSON export (`lib/backup/json-export.ts`) because `pg_dump` is unavailable.

Prisma returns JavaScript `bigint` for schema `BigInt` columns:

| Model | Field | Type |
|---|---|---|
| `DailyOperation` | `timestamp` | `BigInt` |
| `BackupRecord` | `fileSizeBytes` | `BigInt?` |

Native `JSON.stringify` throws on `bigint`:

> Do not know how to serialize a BigInt

The throw happened when writing the JSON backup payload (and previously could also affect manifest writes if BigInt values were present). Partial earlier mitigation converted only some `fileSizeBytes` values via `Number(...)`; `DailyOperation.timestamp` still reached `JSON.stringify` unchanged.

## Exact code change

1. Added centralized serializer `lib/backup/json-serialize.ts`:
   - `serializeJsonValue()` — recursive normalization
   - `stringifyJsonSafe()` — normalize then `JSON.stringify` with BigInt replacer safety net
2. **BigInt policy:** serialize as decimal string (`12345n` → `"12345"`). Do **not** coerce through `Number` (precision loss above `Number.MAX_SAFE_INTEGER`).
3. Recursively handles objects, arrays, nested structures; preserves `null`, strings, booleans, finite numbers; converts `Date` to ISO string; represents `Buffer` / `Uint8Array` as compact typed JSON objects.
4. Wired into:
   - `lib/backup/json-export.ts` (manual Backup Now + Shop Reset pre-reset backup share `createDatabaseBackup` → JSON export)
   - `lib/backup/backup.ts` (manifest write)
5. Re-exported from `lib/backup/index.ts`.
6. Added `npm run verify:backup-bigint` regression script.

### Restore / import inspection

- `restoreDatabaseBackup` / `restoreDatabaseSql` restore **SQL** dumps only (`pg_restore` / `psql`).
- There is **no** JSON table-restore importer today.
- No new restore format was invented.
- Future JSON restore of BigInt columns must parse decimal strings with `BigInt(...)` before Prisma write.

## Files changed

- `lib/backup/json-serialize.ts` (new)
- `lib/backup/json-export.ts`
- `lib/backup/backup.ts`
- `lib/backup/index.ts`
- `scripts/verify-backup-bigint-serialization.ts` (new)
- `package.json` (`verify:backup-bigint`)
- `docs/data-integrity/BIGINT-BACKUP-SERIALIZATION-FIX-REPORT.md`
- `docs/data-integrity/BIGINT-BACKUP-SERIALIZATION-FIX-REPORT.docx`

## Tests run

| Command | Result | Notes |
|---|---|---|
| `npm run verify:backup-bigint` | PASS 9/9 | A–F + ROOT/FILE/WIRE |
| `npx tsc --noEmit` | PASS | |
| `npm run build` | PASS | |
| `npm run verify:owner-shop-reset` | PASS (static) | Live HTTP skipped (`ECONNREFUSED` — no local server) |
| `npm run verify:shop-reset-target-guard` | PASS (static unit guards) | Live HTTP skipped (`ECONNREFUSED`) |

### Regression coverage mapped to requirements

| ID | Requirement | Result |
|---|---|---|
| A | Backup with BigInt serializes successfully | PASS |
| B | Nested BigInt serializes successfully | PASS |
| C | Arrays containing BigInt serialize successfully | PASS |
| D | Precision preserved via string (not Number) | PASS |
| E | Backup failure still prevents Shop Reset deletion | PASS (static gate check) |
| F | Normal JSON-compatible data unchanged | PASS |

## Safety guarantees preserved

Required sequence remains unchanged:

1. Authorize owner  
2. Verify trusted Preview deployment  
3. Verify authorized database fingerprint  
4. Create backup  
5. **ONLY IF backup succeeds** → perform shop reset  
6. Verify reset result  

If step 4 fails, step 5 does **not** run (`backup_failed` / “Backup failed — shop reset was not started”).

Also unchanged:

- Production reset protection  
- Preview authorization / fingerprint guard  
- Branch isolation  
- Backup-before-reset prerequisite (not weakened or removed)  
- No Production data / Production `DATABASE_URL` changes  
- No schema changes for serialization  
- No financial/business calculation changes  

## What was NOT tested

- Live Preview **Backup Now** after deploy of this fix  
- Live Preview **Shop Reset** after deploy of this fix  
- Destructive reset execution (intentionally not run)  
- Production backup / restore  
- JSON→database restore round-trip (no JSON restore path exists)  
- End-to-end local HTTP shop-reset API calls (no server running in this agent environment)

## Exact manual Preview verification steps

Do **not** run against Production.

1. Deploy this branch to the authorized Vercel Preview deployment (Preview env already has authorized fingerprint flags — do not paste secrets).
2. Sign in as Owner on Preview.
3. Open **Settings → Maintenance → Data Protection**.
4. Click **Backup Now**.
5. Expect: backup status **completed** (no “Do not know how to serialize a BigInt”).
6. Confirm a successful backup row appears in the recent backups list.
7. Open **Shop Reset** on the same Maintenance page.
8. Confirm banner still shows: `Preview reset enabled for authorized test database.`
9. Optionally exercise Shop Reset only on the authorized Preview/test database with the exact confirmation phrase — **only if authorized operators choose to**. This agent did **not** execute reset.
10. If Shop Reset is run: confirm backup succeeds first; only then does deletion proceed; confirm post-reset verification.
11. If backup somehow fails: confirm reset aborts with “Backup failed — shop reset was not started” and no shop data is deleted.
12. Confirm Production UI still shows production reset disabled messaging and remains blocked.

## Secrets policy

This report intentionally omits:

- `DATABASE_URL` values  
- fingerprints  
- session secrets  
- environment-variable values  
- credentials  
