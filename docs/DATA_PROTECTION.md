# Production Data Protection

Sonic OS includes safeguards for production deployments.

## Production mode

Set either:

```env
APP_MODE=production
# or
APP_ENV=production
```

Optional client flag for UI confirmations:

```env
NEXT_PUBLIC_APP_MODE=production
```

When production mode is active:

- Debug endpoints (`/api/debug/db`) return 404
- Database seeding is blocked unless `ALLOW_PRODUCTION_SEED=true`
- Destructive CLI scripts require `ALLOW_DESTRUCTIVE_OPS=true`
- Destructive API actions require confirmation phrase `DELETE`
- Daily PostgreSQL backups start automatically (unless `ENABLE_DAILY_BACKUP=false`)

## Backups

| Method | Description |
|--------|-------------|
| Automatic | Daily scheduler started on first DB request via `lib/server/bootstrap.ts` (`ensureApplicationInitialized`) unless `ENABLE_DAILY_BACKUP=false` |
| Manual CLI | `npm run db:backup` |
| Manual UI | Settings → Data Protection → **Backup Now** |
| Cron | See `deploy/cron/sonic-os-backup.cron.example` |

Backup records are stored in the `BackupRecord` table and as files under `BACKUP_DIR` (default `./backups`).

## Soft deletes

These models use `deletedAt` instead of hard delete:

- `Product`
- `Sale`
- `ExpenseRecord`
- `StockMovement`
- `Staff`

Deleted records are hidden from normal queries. Audit entries record who deleted what and when.

## Audit log

Server-side audit entries (`AuditLogEntry`) capture:

- **Who** — user ID, name, role, branch
- **What** — module, action, record ID
- **When** — timestamp
- **Previous / new values** — JSON snapshots on create, update, delete

View in **Settings → Audit Log**.

## Safe pre-production reset

Final wipe of transactional data while preserving identity and configuration:

```bash
npm run db:safe-reset -- --yes
```

In production mode also pass:

```bash
npm run db:safe-reset -- --yes --confirmation "RESET TRANSACTIONAL DATA"
```

**Preserved:** owner/users, staff profiles, branches, roles/permissions, product catalog (definitions and prices), categories, system settings, auth audit history.

**Cleared:** sales, expenses, purchases, stock movements, staff payments, daily operations, day closings, operational audit log entries, sessions, etc.

**Refuses to run against:** production mode (without `ALLOW_DESTRUCTIVE_OPS`), blocked database names, and any non-local target unless **all** of the following match on Preview only: `ALLOW_NONLOCAL_TRANSACTIONAL_RESET=true`, `ALLOW_NEON_TRANSACTIONAL_RESET=true` (Neon only), and `SONIC_RESET_ALLOWED_DATABASE_FINGERPRINT` equal to the deployment fingerprint shown in the Shop Reset preview panel.

Requires:

```bash
npm run db:safe-reset -- --yes --confirmation "RESET SONIC"
```

A PostgreSQL backup is created automatically before the reset (use `--skip-backup` to override).

## Maintenance overrides

Use only during controlled windows:

```env
ALLOW_DESTRUCTIVE_OPS=true
ALLOW_PRODUCTION_SEED=true
```

Remove these after maintenance completes.
