# Sonic OS

Sonic OS is a Next.js business operations application backed by **PostgreSQL** (via Prisma). Business records (sales, expenses, purchases, staff payments, daily operations, day closings, stock) are loaded and saved through the API — not from browser `localStorage`.

## Documentation

| Document | Purpose |
|----------|---------|
| [README.production.md](./README.production.md) | Production configuration, env profiles, health endpoints |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment, Docker, migrations, troubleshooting |
| [docs/POSTGRES_MIGRATION.md](./docs/POSTGRES_MIGRATION.md) | PostgreSQL authority model, removed localStorage fallbacks |
| [docs/SECURITY.md](./docs/SECURITY.md) | Authentication, authorization, CSRF, rate limiting |
| [docs/MIGRATIONS.md](./docs/MIGRATIONS.md) | Safe migration policy (never `db push` / `migrate reset` in production) |
| [docs/BACKUP.md](./docs/BACKUP.md) | Backup and restore procedures |
| [docs/DATA_PROTECTION.md](./docs/DATA_PROTECTION.md) | Production mode, soft deletes, safe reset |
| [docs/DOCUMENTATION-INVENTORY.md](./docs/DOCUMENTATION-INVENTORY.md) | Documentation catalog and status |

## Quick start (development)

```bash
npm install
cp .env.example .env
# Set DATABASE_URL to a local PostgreSQL instance
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Business modules require PostgreSQL and `NEXT_PUBLIC_USE_API=true`. See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full environment checklist.
