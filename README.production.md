# Sonic OS — Production

Sonic OS is a Next.js application backed by PostgreSQL (via Prisma). This document covers production configuration, environment separation, and operational endpoints.

## Environment separation

Sonic OS uses **`APP_ENV`** to distinguish runtime profiles:

| Profile | `APP_ENV` | `NODE_ENV` | PostgreSQL | `SESSION_SECRET` |
|---------|-----------|------------|------------|------------------|
| Development | `development` (default) | `development` | Optional (localStorage fallback without DB) | Optional |
| Staging | `staging` | `production` | Required | Required (≥ 32 chars) |
| Production | `production` | `production` | Required | Required (≥ 32 chars) |

Set `APP_ENV` explicitly in staging and production. When unset, the app defaults to **development**.

### Configuration files

| File | Purpose |
|------|---------|
| [`.env.example`](./.env.example) | Root template for all variables |
| [`deploy/env/development.env.example`](./deploy/env/development.env.example) | Docker/local development |
| [`deploy/env/staging.env.example`](./deploy/env/staging.env.example) | Staging template |
| [`deploy/env/production.env.example`](./deploy/env/production.env.example) | Production template |

Copy the appropriate example to a real env file before deploying:

```bash
cp deploy/env/production.env.example deploy/env/production.env
# Edit secrets, then deploy
```

## Required environment variables

### Always documented

| Variable | Description |
|----------|-------------|
| `APP_ENV` | `development`, `staging`, or `production` |
| `NODE_ENV` | Node runtime mode |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session security (≥ 32 characters) |
| `NEXT_PUBLIC_USE_API` | Client API mode (`true` / `false`) |
| `PORT` | HTTP port (default `3000`) |
| `HOSTNAME` | Bind address (default `0.0.0.0`) |

### Startup validation

All required variables are validated:

1. **On server boot** via [`instrumentation.ts`](./instrumentation.ts) — the process exits if validation fails in staging/production.
2. **Before deploy** with `npm run validate:env`.
3. **Before production build** with `npm run build:production`.

Generate a session secret:

```bash
openssl rand -base64 48
```

## Health and readiness

| Endpoint | Purpose | Success |
|----------|---------|---------|
| `GET /api/health` | **Liveness** — process is running | Always `200` when the app is up |
| `GET /api/ready` | **Readiness** — can serve traffic (DB + migrations) | `200` when ready, `503` otherwise |
| `GET /api/readiness` | Alias of `/api/ready` | Same as above |

Use `/api/health` for liveness probes and `/api/ready` for readiness probes in Kubernetes, Docker health checks, or load balancers.

## Production scripts

| Command | Description |
|---------|-------------|
| `npm run validate:env` | Validate environment variables |
| `npm run build:production` | Validate env, then build |
| `npm run db:migrate:deploy` | Apply pending Prisma migrations |
| `npm run db:backup` | Export and compress a PostgreSQL backup |
| `npm run db:backup:schedule` | Run scheduled or one-shot backup job |
| `npm run db:restore -- <file> --yes` | Restore database from SQL or `.sql.gz` |
| `npm run start:production` | Start Next.js on `PORT` / `HOSTNAME` |
| `npm run start:prod` | Validate env → migrate → start |
| `npm run docker:build` | Build the production Docker image |
| `npm run docker:up:prod` | Start production stack (Docker Compose) |
| `npm run docker:up:staging` | Start staging stack |
| `npm run docker:up:dev` | Start development stack with hot reload |

## Docker

Production image: multi-stage build with Next.js **standalone** output and Prisma migrations on container start.

```bash
cp deploy/env/production.env.example deploy/env/production.env
# Edit deploy/env/production.env

npm run docker:build
npm run docker:up:prod
```

The container entrypoint runs `prisma migrate deploy` before starting the app. Set `RUN_SEED=true` only in development.

## Database

1. Provision PostgreSQL 16+.
2. Set `DATABASE_URL`.
3. Run migrations: `npm run db:migrate:deploy`.
4. Seed once (optional, typically development only): `npm run db:seed`.

Default seed credentials: `owner` / `owner` — **change immediately in staging and production**.

## Backups

Automated and manual PostgreSQL backups use `pg_dump`, gzip compression, and timestamped filenames under `BACKUP_DIR` (default `./backups`). Previous backups are never overwritten.

```bash
npm run db:backup
npm run db:restore -- ./backups/<file>.sql.gz --yes
```

See [Backup guide](./docs/BACKUP.md) for scheduled backups (cron), restore procedures, and Docker notes.

## Further reading

- [Deployment guide](./docs/DEPLOYMENT.md) — step-by-step staging and production deployment
- [Backup guide](./docs/BACKUP.md) — manual, scheduled, and restore procedures
- [Prisma schema](./prisma/schema.prisma)
- [Environment module](./lib/env.ts)
