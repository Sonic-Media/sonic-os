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
| Automatic | Daily scheduler in app process (`instrumentation.ts`) |
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

**Preserved:** owner/users, staff profiles, branches, roles/permissions, categories, system settings.

**Cleared:** sales, expenses, stock, products, daily operations, day closings, sessions, etc.

A PostgreSQL backup is created automatically before the reset (use `--skip-backup` to override).

## Maintenance overrides

Use only during controlled windows:

```env
ALLOW_DESTRUCTIVE_OPS=true
ALLOW_PRODUCTION_SEED=true
```

Remove these after maintenance completes.
