# Sonic OS Deployment Guide

This guide walks through deploying Sonic OS to staging and production. For variable reference and script overview, see [README.production.md](../README.production.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- OpenSSL (for generating secrets)
- Docker & Docker Compose (optional, recommended)

## 1. Prepare environment files

### Local / VM deployment

```bash
cp .env.example .env
```

For staging or production, set at minimum:

```env
APP_ENV=production
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sonic_os?schema=public
SESSION_SECRET=<openssl rand -base64 48>
NEXT_PUBLIC_USE_API=true
PORT=3000
HOSTNAME=0.0.0.0
```

Validate before proceeding:

```bash
npm run validate:env
```

### Docker Compose deployment

```bash
cp deploy/env/production.env.example deploy/env/production.env
# or staging.env.example → staging.env
```

Edit secrets in the copied file. Compose reads the file via `SONIC_ENV_FILE` (see root `docker-compose.yml`).

## 2. Install dependencies

```bash
npm ci
```

## 3. Database setup

Create an empty PostgreSQL database, then apply migrations:

```bash
npm run db:migrate:deploy
```

Seed only for fresh development environments:

```bash
RUN_SEED=true npm run db:seed
```

**Do not seed production** unless you intentionally need baseline reference data.

## 4. Build

```bash
npm run build:production
```

Use plain `npm run build` in CI when env validation runs in a separate step.

## 5. Start the application

### Direct Node.js

```bash
npm run start:prod
```

This runs validation, migrations, and `next start`.

Or run steps individually:

```bash
npm run validate:env
npm run db:migrate:deploy
npm run start:production
```

### Docker Compose

**Development** (hot reload + seeded DB):

```bash
cp deploy/env/development.env.example deploy/env/development.env
npm run docker:up:dev
```

**Staging:**

```bash
cp deploy/env/staging.env.example deploy/env/staging.env
npm run docker:up:staging
```

**Production:**

```bash
cp deploy/env/production.env.example deploy/env/production.env
npm run docker:up:prod
```

Stop all profiles:

```bash
npm run docker:down
```

## 6. Verify deployment

```bash
curl -s http://localhost:3000/api/health | jq
curl -s http://localhost:3000/api/ready | jq
```

Expected:

- `/api/health` → `status: "ok"`
- `/api/ready` → `status: "ready"` with database checks passing

If readiness returns `503`, verify `DATABASE_URL`, PostgreSQL connectivity, and that migrations have been applied.

## 7. Process manager (optional)

Example **systemd** unit after building to `.next`:

```ini
[Unit]
Description=Sonic OS
After=network.target postgresql.service

[Service]
Type=simple
User=sonic
WorkingDirectory=/opt/sonic-os
EnvironmentFile=/opt/sonic-os/.env
ExecStart=/usr/bin/npm run start:production
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Run migrations before first start or on deploy:

```bash
npm run db:migrate:deploy
```

## 8. Kubernetes probes (optional)

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
```

## 9. Backups (recommended)

Configure `DATABASE_URL`, then run manual or scheduled backups:

```bash
npm run db:backup
```

Schedule daily backups with cron — see [`deploy/cron/sonic-os-backup.cron.example`](../deploy/cron/sonic-os-backup.cron.example) and [BACKUP.md](./BACKUP.md).

Restore (destructive — requires `--yes`):

```bash
npm run db:restore -- ./backups/<backup-file>.sql.gz --yes
```

## Environment checklist

### Development

- [ ] `APP_ENV=development`
- [ ] `DATABASE_URL` optional (localStorage fallback when unset)
- [ ] Copy `deploy/env/development.env.example` for Docker dev

### Staging

- [ ] `APP_ENV=staging`
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` set and reachable
- [ ] `SESSION_SECRET` ≥ 32 characters
- [ ] `NEXT_PUBLIC_USE_API=true`
- [ ] Migrations applied
- [ ] Default seed password changed

### Production

- [ ] `APP_ENV=production`
- [ ] `NODE_ENV=production`
- [ ] Strong `SESSION_SECRET` and database credentials
- [ ] `RUN_SEED=false` in Docker/production scripts
- [ ] Health/readiness probes configured
- [ ] TLS terminated at reverse proxy or ingress
- [ ] Automated backups configured (`npm run db:backup` or cron)

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Process exits on boot | Missing required env var | Run `npm run validate:env` |
| `/api/ready` → 503 | DB unreachable or migrations missing | Check `DATABASE_URL`, run `db:migrate:deploy` |
| Client uses localStorage | `NEXT_PUBLIC_USE_API=false` or build-time env | Rebuild with `NEXT_PUBLIC_USE_API=true` |
| Docker app won't start | Missing `deploy/env/*.env` | Copy from `.example` templates |

## Rollback

1. Redeploy the previous application image or build artifact.
2. If a migration caused issues, restore PostgreSQL from backup:

```bash
npm run db:restore -- ./backups/<backup-file>.sql.gz --yes
```

See [BACKUP.md](./BACKUP.md) for backup and restore details.
