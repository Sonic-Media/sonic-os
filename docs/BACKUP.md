# Sonic OS — Database Backup and Restore

Sonic OS includes CLI backup utilities for PostgreSQL. Backups export plain SQL via `pg_dump`, optionally compress to `.sql.gz`, and use timestamped filenames that never overwrite existing files.

## Prerequisites

- `DATABASE_URL` configured and reachable
- PostgreSQL client tools installed on the host running backups:
  - `pg_dump` (export)
  - `psql` (restore)
- Override tool paths with `PG_DUMP_PATH` and `PSQL_PATH` when needed

## Backup files

Each backup creates:

| File | Description |
|------|-------------|
| `sonic-os-{database}-{timestamp}.sql.gz` | Compressed SQL dump (default) |
| `sonic-os-{database}-{timestamp}.manifest.json` | Metadata (time, database, sizes) |

When `BACKUP_COMPRESS=false`, an uncompressed `.sql` file is kept instead of `.gz`.

**Timestamp format:** UTC ISO with filesystem-safe characters, e.g. `2026-08-02T11-05-30-000Z`.

**No overwrites:** If a filename already exists (same second collision), a numeric suffix is appended (`-001`, `-002`, …).

Default backup directory: `./backups` (override with `BACKUP_DIR`).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Required for backup/restore |
| `BACKUP_DIR` | `./backups` | Output directory |
| `BACKUP_COMPRESS` | `true` | Set to `false` for plain `.sql` only |
| `BACKUP_INTERVAL_MS` | unset | Interval for scheduled runner (ms) |
| `PG_DUMP_PATH` | `pg_dump` | Path to pg_dump binary |
| `PSQL_PATH` | `psql` | Path to psql binary |

## Manual backup

```bash
# Ensure DATABASE_URL is set (via .env or shell)
npm run db:backup
```

Example output:

```
[backup] Database backup completed.
[backup] Manifest: /opt/sonic-os/backups/sonic-os-sonic_os-2026-08-02T11-05-30-000Z.manifest.json
[backup] File: /opt/sonic-os/backups/sonic-os-sonic_os-2026-08-02T11-05-30-000Z.sql.gz
```

Plain SQL export without compression:

```bash
BACKUP_COMPRESS=false npm run db:backup
```

## Scheduled backup

### Option A — cron (recommended for production)

Use the example cron file:

```bash
cp deploy/cron/sonic-os-backup.cron.example /etc/cron.d/sonic-os-backup
# Edit user, path, and log file
```

Or add to crontab:

```cron
0 2 * * * cd /opt/sonic-os && ./scripts/run-backup.sh >> /var/log/sonic-os-backup.log 2>&1
```

`scripts/run-backup.sh` loads `.env` when present and runs `npm run db:backup`.

### Option B — in-process scheduler

Run a long-lived process that backs up on an interval:

```bash
BACKUP_INTERVAL_MS=86400000 npm run db:backup:schedule
```

`86400000` = 24 hours. The first backup runs immediately, then on each interval.

For one-shot scheduled runs (e.g. Kubernetes CronJob):

```bash
npm run db:backup:schedule
```

Without `BACKUP_INTERVAL_MS`, the schedule script performs a single backup and exits.

## Database restore

Restore **replaces** the current database contents with the backup. Always back up before restoring.

```bash
npm run db:restore -- ./backups/sonic-os-sonic_os-2026-08-02T11-05-30-000Z.sql.gz --yes
```

Supported inputs:

- `.sql` — plain SQL dump
- `.sql.gz` — compressed dump (decompressed to a temp file during restore)

Restore requires explicit confirmation via `--yes` (or `-y`).

## Docker Compose

The application container may not include `pg_dump`. Run backups from:

1. **Host** with `DATABASE_URL` pointing at the exposed Postgres port, or
2. **Postgres container** using `pg_dump` and a volume mount:

```bash
docker compose exec postgres pg_dump -U sonic sonic_os > "./backups/manual-$(date -u +%Y-%m-%dT%H-%M-%SZ).sql"
```

For the full Sonic OS backup flow (manifest, compression, unique names), run `npm run db:backup` on a host with client tools and network access to PostgreSQL.

## Operational notes

1. **Retention** — Backups are never overwritten. Plan disk space and archive old files to object storage as needed.
2. **Restore testing** — Periodically restore to a staging database and verify application health (`/api/ready`).
3. **Secrets** — Backup files contain full database data including credentials hashes. Store encrypted and restrict file permissions.
4. **Migrations** — After restore, ensure migration history in the backup matches the application version you deploy.

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run db:backup` | Manual backup |
| `npm run db:backup:schedule` | Scheduled or one-shot backup runner |
| `npm run db:restore -- <file> --yes` | Restore from backup |

## Utilities (programmatic)

Backup logic lives in `lib/backup/`:

```typescript
import { createDatabaseBackup, restoreDatabaseBackup } from "@/lib/backup";

const result = await createDatabaseBackup();
await restoreDatabaseBackup({ inputPath: result.archivePath!, ... });
```

See also [DEPLOYMENT.md](./DEPLOYMENT.md) and [README.production.md](../README.production.md).
