# Salaama Branch Code — Production Read-Only Audit

**Date:** 2026-09-14  
**Scope:** Read-only audit only — no code changes, no data mutations, no SQL UPDATE executed  
**Command run:** `npm run audit:salaama-branch-code`

---

## Executive verdict

**DO NOT MIGRATE — Production database was not reachable from this Cloud Agent environment; production branch state could not be verified.**

The controlled migration below was **not executed** and **must not be run** until a read-only audit succeeds against the actual Production PostgreSQL database:

```sql
UPDATE "Branch" SET code = 'salaama' WHERE code = 'branch2';
```

---

## Why Production was not audited

| Check | Result |
|-------|--------|
| `DATABASE_URL` target | `localhost:5432` / database `sonic_os` |
| `APP_ENV` | `development` |
| `VERCEL_ENV` | not set |
| `PRODUCTION_DATABASE_URL` | **not configured** |
| Host category | **Local Cloud Agent PostgreSQL** |
| Database fingerprint | `c400f10d4dbe` (local `localhost/sonic_os`) |

This Cloud Agent pod connects to a **local development PostgreSQL instance**, not the Vercel/Neon Production deployment. Running `npm run audit:salaama-branch-code` here audits **only the connected local database**.

**No production credentials, Neon production host, or Vercel Production `DATABASE_URL` were available in this environment.**

---

## Production results

**Status: NOT OBTAINED**

The following Production-specific facts **could not be confirmed** from this run:

1. Production active branch list (ID, name, code)
2. Production Salaama branch UUID
3. Whether Production Salaama code is currently `branch2` or already `salaama`
4. Whether any Production branch already has code `salaama`
5. Whether Production branch code `branch2` exists
6. Production related-record counts for the live Salaama branch
7. Production-safe migration readiness

**Required to audit Production:** run the same read-only audit from an environment whose `DATABASE_URL` points to the Production PostgreSQL instance (e.g. Vercel Production env pull with read-only access, or a secure ops workstation with Production `DATABASE_URL`).

---

## Cloud Agent / local test environment results

These results are from the database actually connected when `npm run audit:salaama-branch-code` ran in this Cloud Agent. **They do not prove Production state.**

### Environment identity

| Field | Value |
|-------|-------|
| Label | Cloud Agent local PostgreSQL (**NOT Production**) |
| Host | `localhost` |
| Port | `5432` |
| Database | `sonic_os` |
| Schema | `public` |
| User | `sonic` |
| Fingerprint | `c400f10d4dbe` |

### 1. All active branches (connected environment)

| ID | Name | Code | Active |
|----|------|------|--------|
| `d25fd4ff-c7cf-42c5-ab1d-3223e76a13a1` | Kansanga | `main` | true |
| `794a56a1-80bd-4957-9337-80445aa00526` | Salaama | `salaama` | true |

### 2. Existing Salaama branch (connected environment)

| Field | Value |
|-------|-------|
| Name | Salaama |
| Current code | `salaama` |
| UUID | `794a56a1-80bd-4957-9337-80445aa00526` |
| Active | true |

### 3. Branch with code `salaama`

**Yes** — one active branch: `794a56a1-80bd-4957-9337-80445aa00526` (Salaama).

### 4. Legacy branch with code `branch2`

**No** — no branch record with code `branch2` in this environment.

### 5. Related-record counts (Salaama UUID in connected environment)

| Table | Count |
|-------|------:|
| User | 3 |
| Staff | 4 |
| DailyOperation | 3 |
| Sale | 0 |
| Purchase | 0 |
| ExpenseRecord | 0 |
| StockMovement | 0 |
| StaffPayment | 0 |
| DayClosing | 2 |
| Product | 1 |
| **Total** | **13** |

### 6. FK model — branchId (UUID), not branch code

Prisma schema and sampled rows confirm related business records reference **`branchId` (UUID)**, not `Branch.code`:

- Models: `User`, `Staff`, `DailyOperation`, `Sale`, `Purchase`, `ExpenseRecord`, `StockMovement`, `StaffPayment`, `DayClosing`, `Product`
- Sample `DayClosing`: `branchId = 794a56a1-80bd-4957-9337-80445aa00526` (UUID)

Renaming `Branch.code` preserves all FK relationships when only the code column is updated on the existing row.

### 7. Migration safety (connected environment only)

In **this local environment**, Salaama already uses code `salaama` and `branch2` does not exist. The proposed `UPDATE ... WHERE code = 'branch2'` would affect **zero rows** here and is unnecessary locally.

**This does not assess Production.**

---

## Output from `npm run audit:salaama-branch-code` (connected environment)

```
Salaama branch audit (read-only)

- id=794a56a1-80bd-4957-9337-80445aa00526
  name=Salaama
  code=salaama
  active=true
  relatedRecords=13

Safety checklist:
  exactly one Salaama-named branch expected: 1
  salaama code exists: true
  branch2 code exists: false
  duplicate Salaama codes present: false
```

---

## What Production audit must confirm before migration

Run read-only against Production and verify:

1. Exactly **one** active branch named **Salaama**
2. That branch's current code is **`branch2`** (expected pre-migration Production state)
3. **No other** active branch has code **`salaama`**
4. Record the Salaama branch **UUID** and related-record counts
5. Re-run after migration planning to ensure the same UUID now has code **`salaama`**

If Production already has code `salaama` and no `branch2`, migration is **not needed** (already complete).

If Production has **both** `branch2` and `salaama` as separate branch rows, **DO NOT MIGRATE** until duplicate reconciliation is resolved manually.

---

## Actions performed / not performed

| Action | Status |
|--------|--------|
| `npm run audit:salaama-branch-code` | Run (connected local DB only) |
| SQL UPDATE | **NOT executed** |
| SQL DELETE / INSERT | **NOT executed** |
| `prisma db push` | **NOT executed** |
| Database reset | **NOT executed** |
| Code changes | **None** |

---

## Distinction summary

| Item | Production | Cloud Agent local |
|------|------------|-------------------|
| Audit performed | **No** | **Yes** |
| Salaama code | **Unknown** | `salaama` |
| `branch2` exists | **Unknown** | No |
| Salaama UUID | **Unknown** | `794a56a1-80bd-4957-9337-80445aa00526` |
| Migration verdict | **DO NOT MIGRATE (unverified)** | N/A (already `salaama`) |
