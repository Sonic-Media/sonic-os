# Sonic OS Documentation Inventory

Catalog of repository documentation and its relationship to the current codebase.  
**Last reviewed:** 2026-09-11 (Phase 1 Fix #23)

## Legend

| Status | Meaning |
|--------|---------|
| **CURRENT** | Describes current implemented behavior (may include dated audit snapshots) |
| **HISTORICAL** | Intentionally preserved record of a past investigation, fix, or certification |
| **TEST** | Verification script output or terminal logs |
| **OBSOLETE** | Superseded; kept for reference only |
| **AMBIGUOUS** | Partially accurate or environment-dependent; see notes |

## Canonical operational docs

| Document | Status | Purpose | Source of truth |
|----------|--------|---------|-----------------|
| [README.md](../README.md) | CURRENT | Project entry point, doc index | Code + docs below |
| [README.production.md](../README.production.md) | CURRENT | Production env profiles, health endpoints | `lib/env/*`, `instrumentation.ts` |
| [docs/DEPLOYMENT.md](./DEPLOYMENT.md) | CURRENT | Deploy, Docker, env checklist, troubleshooting | `scripts/docker-entrypoint.sh`, `lib/env/validate.ts` |
| [docs/POSTGRES_MIGRATION.md](./POSTGRES_MIGRATION.md) | CURRENT | PostgreSQL authority, removed localStorage fallbacks | `lib/data-source/context-api.ts`, API contexts |
| [docs/SECURITY.md](./SECURITY.md) | CURRENT | Auth, CSRF, rate limits, threat model | `middleware.ts`, `lib/server/security/*` |
| [docs/MIGRATIONS.md](./MIGRATIONS.md) | CURRENT | Safe migration policy | `prisma/migrations/`, Docker entrypoint |
| [docs/BACKUP.md](./BACKUP.md) | CURRENT | Backup/restore CLI | `lib/backup/*`, `scripts/backup-database.ts` |
| [docs/DATA_PROTECTION.md](./DATA_PROTECTION.md) | CURRENT | Production mode, soft deletes, safe reset | `lib/env/production-mode.ts` |
| [docs/PERFORMANCE.md](./PERFORMANCE.md) | CURRENT | Performance optimizations (dated snapshot + current notes) | Hooks, API routes cited in doc |

## Agent / IDE instructions

| Document | Status | Purpose | Source of truth |
|----------|--------|---------|-----------------|
| [AGENTS.md](../AGENTS.md) | CURRENT | Next.js agent rules | `node_modules/next/dist/docs/` |
| [CLAUDE.md](../CLAUDE.md) | CURRENT | Pointer to AGENTS.md | AGENTS.md |

## Data Integrity fix reports (historical per-fix)

| Document | Status | Purpose | Source of truth |
|----------|--------|---------|-----------------|
| `docs/PHASE-1-FIX-*-*.md` | HISTORICAL | Individual fix certification reports | Fix branch at time of report |
| `docs/PHASE-1-FIX-*-*.docx` | HISTORICAL | Formal Word deliverables | Same as matching `.md` |

Individual fix reports may describe **old behavior before the fix** as part of the audit. That is intentional.

## Investigation / certification artifacts

| Document | Status | Purpose | Source of truth |
|----------|--------|---------|-----------------|
| [sonic-os-branch-architecture-investigation-report.md](../sonic-os-branch-architecture-investigation-report.md) | HISTORICAL | Aug 2026 branch investigation | Point-in-time DB + code snapshot |
| [sonic-os-branch-inventory-refactor-report.md](../sonic-os-branch-inventory-refactor-report.md) | HISTORICAL | Aug 2026 inventory refactor certification | Point-in-time build/test output |
| [sonic-os-terminal-log.md](../sonic-os-terminal-log.md) | TEST | Dev server / API log capture | Runtime logs |
| [sonic-os-approval-terminal-log.md](../sonic-os-approval-terminal-log.md) | TEST | Approval flow log capture | Runtime logs |

## Verification scripts (code, not prose docs)

All `npm run verify:*` scripts are defined in `package.json`. They certify implementation behavior; they are not end-user documentation.

| Script | Status | Purpose |
|--------|--------|---------|
| `verify:default-staff` | CURRENT (Fix #20 branch) | DEFAULT_STAFF dead constant audit |
| `verify:documentation-drift` | CURRENT (Fix #23) | Documentation vs codebase drift |
| `verify:reports` | CURRENT | Report aggregation fixture tests |
| Other `verify:*` | CURRENT | Module certification (require server + DB) |

## Known ambiguities

1. **`DEFAULT_STAFF` in `lib/constants.ts`** — Dead export with zero imports on `main`; Fix #20 removes it on branch `cursor/default-staff-b6e7`. Operational docs must not describe legacy mock staff member names as production staff.
2. **Reports UI vs API** — `/reports` aggregates API-loaded entries client-side; `/api/reports/summary` aggregates server-side. Both read PostgreSQL-backed data.
3. **Restore certification** — Backup export is implemented; full restore is documented as staging-test responsibility, not globally certified.
4. **Individual Fix PASS ≠ full milestone certified** — Phase 1 fix reports certify individual fixes only.
