# Sonic OS — Branch Architecture Investigation Report

**Generated:** 2026-08-23 00:23 UTC+3  
**Project:** `/Users/kvisualz/Desktop/sonic-os`  
**Method:** Read-only Prisma queries against live PostgreSQL + read-only code inspection  
**Constraints:** No code changes, no database changes, no branch create/delete/rename

---

## Executive summary

The database already contains **exactly one branch**. All staff, inventory, sales, purchases, daily operations, expenses, and day closings are assigned to that single branch.

| Fact | Current state |
|------|----------------|
| Branches in DB | **1** |
| Internal key | `main` |
| Display name | **Kansanga** |
| Duplicate branches (e.g. `main` + `kansanga`) | **None** |
| Staff branch assignments | **All on `main` / Kansanga** |
| Operational data split across branches | **No — 100% on `main`** |

Tony and Fazil not seeing products was **not** caused by a database branch mismatch. Their user and staff records both point to `main` (Kansanga), the same branch where all inventory lives. The issue was in **application-layer permissions and branch-stock loading** (cashiers could not read stock movements), not in how branches are stored.

---

## 1. Every branch in the database

| # | id | Internal key (`code`) | Display name (`name`) | Status | Created |
|---|-----|----------------------|------------------------|--------|---------|
| 1 | `d5f1412f-6980-433f-88bd-625384162a68` | `main` | Kansanga | **Active** | 2026-08-02 15:30:14 UTC |

There are no other rows in the `Branch` table.

---

## 2. Branch details (requested fields)

### Branch: Kansanga

| Field | Value |
|-------|-------|
| **id** | `d5f1412f-6980-433f-88bd-625384162a68` |
| **Internal key** | `main` |
| **Display name** | Kansanga |
| **Status** | Active (`active: true`) |
| **Creation date** | 2026-08-02T15:30:14.518Z |
| **Address / phone / manager** | Not set (null) |

---

## 3. Default branch

The application treats **`main`** as the default branch:

| Source | Value |
|--------|-------|
| `DEFAULT_BRANCH_CODE` (`lib/constants.ts`) | `main` |
| `DEFAULT_BRANCH_NAME` | Kansanga |
| Bootstrap (`runBranchesStage`) | Creates `{ code: "main", name: "Kansanga" }` if none exists |
| App settings (`branchNames`) | `{ "main": "Kansanga" }` |

Canonical default: internal key **`main`**, shown to users as **Kansanga**.

---

## 4. Staff branch assignments

All staff are on the same branch (`main` / Kansanga):

| Staff | Username | Role (DB) | Branch key | Branch name | branchId |
|-------|----------|-----------|------------|-------------|----------|
| Kevin | `owner` | branch-manager* | `main` | Kansanga | `d5f1412f-6980-433f-88bd-625384162a68` |
| Penny | `penny` | branch-manager | `main` | Kansanga | `d5f1412f-6980-433f-88bd-625384162a68` |
| Tony | `tony` | cashier | `main` | Kansanga | `d5f1412f-6980-433f-88bd-625384162a68` |
| Fazil | `fazil` | cashier | `main` | Kansanga | `d5f1412f-6980-433f-88bd-625384162a68` |

\*Kevin's login user has role `owner`; his linked staff record uses role `branch-manager`.

### User accounts (mirror staff assignments)

| User | Username | Role | Branch key | Branch name | staffId linked |
|------|----------|------|------------|-------------|----------------|
| Kevin | `owner` | owner | `main` | Kansanga | Yes |
| Penny | `penny` | branch-manager | `main` | Kansanga | Yes |
| Tony | `tony` | cashier | `main` | Kansanga | Yes |
| Fazil | `fazil` | cashier | `main` | Kansanga | Yes |

---

## 5. Inventory branch ownership

Inventory uses a **global product catalog** with a **branch-tagged movement ledger** (`StockMovement.branchId`).

| Metric | Value |
|--------|-------|
| Products in catalog | **13** |
| Stock movements | **24** (all on branch `main`) |
| Branch codes in movements | **`main` only** |
| Movement quantity sum | **458** units (in + out combined) |

### Sample products with stock at Kansanga (`main`)

| Product | Global `currentStock` | Net from movements at `main` |
|---------|----------------------:|-----------------------------:|
| 8K HDMI CABLE | 105 | 105 |
| cert-roles-1787410588974 Accessory | 19 | 19 |
| FALSH 32GB | 90 | 90 |
| JBL Speaker | 38 | 38 |
| Magsafe charger | 48 | 48 |
| PS4 Controler | 16 | 16 |
| SSD 1TB | 48 | 48 |
| Test USB Cable | 10 | 10 |

### Products with zero stock at Kansanga

- No Origin Test
- Origin Test
- UI Debug Product

Global `currentStock` matches branch net from movements because **all movements are on the only branch**.

---

## 6. Daily Operations

| Branch key | Display name | Record count |
|------------|--------------|-------------:|
| `main` | Kansanga | **40** |

---

## 7. Sales

| Branch key | Display name | Record count |
|------------|--------------|-------------:|
| `main` | Kansanga | **8** |

---

## 8. Purchases

| Branch key | Display name | Record count |
|------------|--------------|-------------:|
| `main` | Kansanga | **5** |

---

## 9. Related operational data (same branch)

| Domain | Branch key | Display name | Count |
|--------|------------|--------------|------:|
| Day closings | `main` | Kansanga | 2 |
| Expenses | `main` | Kansanga | 10 |
| Staff payments | `main` | Kansanga | 2 |

---

## 10. Duplicate branches?

**No duplicate branches exist in the database.**

- There is **no** branch with code `kansanga`, `Kansanga`, or `salaama`.
- Only one physical location is modeled: **`main` → Kansanga**.

The application includes a **code-level alias** in `lib/branch/codes.ts` mapping `kansanga` → `main`. That alias is for legacy/test references in code — **not** a second database branch.

Potential confusion is **naming**, not duplication:

- Internal key: `main`
- User-facing name: **Kansanga** (via `Branch.name` and `AppSettings.branchNames`)

---

## 11. How active branch is determined after login

### Flow

```
Login
  └─ Session created with session.branch = User.branch.code  →  "main"

ActiveBranchProvider (client, on app load)
  └─ GET /api/auth/session
       ├─ session.branch           (from User → Branch.code)
       └─ activeBranchCode         (from UserPreference, if set)

  Resolution order:
    1. UserPreference.activeBranchCode  (currently empty for all users)
    2. session.branch                   → "main" for everyone today
    3. First active branch in list      (fallback if code invalid)

  Role rules:
    • Owner      → may switch branch via sidebar; choice saved to UserPreference
    • Staff      → locked to assigned branch (code: "main")

  Display:
    • UI shows getBranchName("main") → "Kansanga"
```

### Key code locations

| File | Role |
|------|------|
| `lib/server/session.ts` | Sets `session.branch` from `User.branch.code` |
| `app/api/auth/session/route.ts` | Returns session + `activeBranchCode` preference |
| `lib/server/services/auth-service.ts` | Reads/writes `UserPreference.activeBranchCode` |
| `context/active-branch-context.tsx` | Resolves active branch on client after login |
| `lib/constants.ts` | `DEFAULT_BRANCH_CODE = "main"` |

### Persisted preferences

`UserPreference` table is **empty** — no user has a saved `activeBranchCode` override. Everyone effectively uses their assigned branch (`main`) unless the owner switches during a session.

---

## Architecture diagram (current DB state)

```
Branch: main (Kansanga)  ← only branch
  ├── Users: Kevin, Penny, Tony, Fazil
  ├── Staff: Kevin, Penny, Tony, Fazil
  ├── StockMovements: 24
  ├── Sales: 8
  ├── Purchases: 5
  ├── DailyOperations: 40
  ├── DayClosings: 2
  ├── Expenses: 10
  └── StaffPayments: 2
```

---

## Root cause: cashier empty sale page (context)

| Layer | Finding |
|-------|---------|
| **Database** | Tony/Fazil correctly assigned to `main` (Kansanga); inventory on same branch |
| **Application** | Cashiers blocked from `GET /api/stock/movements` (403); branch stock derived from movements → appears empty |

This is an application permission/loading issue, not a branch data problem.

---

## Recommended migration path (advisory only)

The database is **already a single-branch deployment**. No branch merge or data migration is required to consolidate Kansanga.

### Phase 1 — Clarify naming (zero data risk)

1. Keep the single `Branch` row as-is (`code: main`, `name: Kansanga`).
2. Ensure all UI paths use display name **Kansanga** (already mostly true).
3. Document internally that `main` is the canonical key for Kansanga.

**Data preserved:** 100% — no DB changes.

### Phase 2 — Application hardening (when changing code)

1. Allow cashiers to read stock movements (or provide a branch-inventory endpoint for sales).
2. Remove or narrow legacy alias `kansanga` → `main` once no external references use `kansanga`.
3. Optionally rename internal key `main` → `kansanga` in a controlled migration (not required for correctness today).

### Phase 3 — Future second branch (e.g. Salaama)

1. Create a new `Branch` row (`code: salaama`, `name: Salaama`).
2. Assign Salaama staff to that branch's `branchId`.
3. Tag new stock movements, sales, and operations with Salaama's `branchId`.
4. No changes needed to Kansanga data.

---

## Quick reference

| Question | Answer |
|----------|--------|
| How many branches? | **1** (`main` / Kansanga) |
| Are Tony/Fazil on the wrong branch in DB? | **No** |
| Is data split across branches? | **No** |
| Are there duplicate Kansanga branches? | **No** |
| What DB migration is needed for single-branch Kansanga? | **None** |
| What needs fixing for cashiers? | **Application permissions / branch-stock loading** |

---

*Investigation report — read-only, no changes made to code or database.*
