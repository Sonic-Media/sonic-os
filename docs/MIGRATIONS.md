# Database Migrations Policy

Sonic OS uses **Prisma Migrate** for all PostgreSQL schema changes.

## Rules

1. **Never** drop or recreate production tables manually.
2. **Never** use `prisma db push` against staging or production.
3. **Always** create a new migration folder under `prisma/migrations/`.
4. **Always** apply with `npm run db:migrate:deploy` (or Docker entrypoint `prisma migrate deploy`).
5. Review generated SQL before merging — prefer additive, backward-compatible changes.

## Workflow

```bash
# Local development — create migration after schema change
npm run db:migrate

# Staging / production — apply pending migrations only
npm run db:migrate:deploy
```

## Production checklist

- [ ] Migration is additive or has a safe data backfill step
- [ ] `prisma migrate deploy` tested on a staging database
- [ ] Backup taken before deploy (`npm run db:backup` or Settings → Backup Now)
- [ ] No `DROP TABLE` unless explicitly approved and backed up

## Forbidden in production

- `prisma migrate reset`
- `prisma db push --force-reset`
- Hand-editing the database without a matching migration
- Deleting rows from `AuditLogEntry` except via controlled maintenance scripts

See also: [BACKUP.md](./BACKUP.md), [DATA_PROTECTION.md](./DATA_PROTECTION.md)
