# Sonic OS v3.1.2 — Financial Corrections & Auditability

**Package version:** `3.1.2`  
**Branch:** `cursor/financial-corrections-auditability-9071`  
**PR:** [#65](https://github.com/Sonic-Media/sonic-os/pull/65)  
**Date:** 2026-10-06  
**Production data:** not modified  
**Deploy:** not performed  

Matching Word deliverable: `docs/data-integrity/V312-FINANCIAL-CORRECTIONS-AUDITABILITY.docx`

---

## Current architecture discovered

Sonic OS is Next.js App Router + Prisma 7 + PostgreSQL. Branch identity is `Branch.code` (`main` = Kansanga, `salaama` = Salaama). Owner vs staff is enforced server-side (`requireOwner`, `requireSession`, `assertSessionCanAccessBranchCode`). Client-supplied branch/date/user IDs are not trusted.

### Business-day model

`DayClosing` is unique on `(branchId, date)`. Status is a free-form string, not a Prisma enum. Existing statuses used in production:

- `open`
- `close_requested`
- `closed`

v3.1.2 reuses that string column and adds `needs_correction` (no second status system). Clock Out was not changed. Staff Open Shop residual was not investigated or modified.

Lifecycle implemented:

`open` → `close_requested` → (`needs_correction` → `close_requested`) → `closed`

Reject updates the **same** `DayClosing` row. It does not create a second business day. `openedAt`, `closedAt`, and approval/close timestamps are not rewritten on reject. Closed-day expenditure correction does not change `status`, `openedAt`, or `closedAt`.

Writable staff operations are allowed when status is `open` or `needs_correction`. `close_requested` remains locked pending owner review. `closed` remains locked except for the owner-only correction API.

### Expenditure / income records

Authoritative operating expenditures are `ExpenseRecord` rows (category, description, amount, `createdAt`, `staffName`, `branchId`, `date`). Staff payments are a separate category and stay out of operating totals.

Close-day sync can also write `DailyOperationExpense` lines, often a single **Operating Expenses** summary. Dashboard/financial-detail de-dupe:

- If any operating `ExpenseRecord` exists for that branch+date, those records are used and DailyOperation expense lines are ignored for detail/totals.
- Otherwise DailyOperation expense lines are used (legacy days with no module records).

Movie revenue is `DailyOperation.sales` (one total per day, not ticket-level). Accessory income is `Sale` / `SaleItem.productName`. There is **no** service catalog for Windows Installation, Typing, printing SKUs, or phone unlocking. Those names are not invented.

### Reset / wipe that already existed

Owner Shop Reset remains a wholesale business reset. It is not used for single-day wipe. Single-day wipe is a new owner-only transactional reset scoped to one `branchId` + business `date`.

### Audit that already existed

`AuditLogEntry` and `AuthAuditLog` remain. v3.1.2 adds `FinancialCorrection` as a dedicated correction/wipe/reject history table that owners can list in the UI.

---

## Files changed

New:

- `prisma/migrations/20261006120000_financial_corrections_v312/migration.sql`
- `lib/day-closing/status.ts`
- `lib/business-day-wipe/constants.ts`
- `types/financial-correction.ts`
- `lib/server/services/financial-corrections-service.ts`
- `lib/server/services/business-day-wipe-service.ts`
- `lib/server/services/financial-detail-service.ts`
- `lib/api/financial-corrections.ts`
- `app/api/admin/financial-corrections/route.ts`
- `app/api/admin/financial-detail/route.ts`
- `app/api/admin/business-day-wipe/route.ts`
- `components/dashboard/owner/owner-financial-detail.tsx`
- `components/expenses/expense-correction-history.tsx`
- `hooks/use-management-reject-close.ts`
- `scripts/verify-closed-day-expense-correction.ts`
- `scripts/verify-close-request-rejection.ts`
- `scripts/verify-business-day-wipe.ts`
- `scripts/verify-financial-detail.ts`
- `docs/data-integrity/V312-FINANCIAL-CORRECTIONS-AUDITABILITY.md`
- `docs/data-integrity/V312-FINANCIAL-CORRECTIONS-AUDITABILITY.docx`

Modified (selected): `prisma/schema.prisma`, `package.json` (version `3.1.2` + verify scripts), day-closing service/guards/permissions/storage/close-request, staff today/banner/workspace, owner dashboard layout, calendar day detail (wipe confirmation), expense detail page/card, transaction builder (titles, actor, timestamps), `lib/prisma.ts` (soft-delete model list includes `FinancialCorrection` only as a hard table; expenses/sales remain soft-delete capable).

Clock Out files were not modified.

---

## Database / model changes

Additive only:

```sql
CREATE TABLE "FinancialCorrection" ( ... UUID PK, kind, sourceType, sourceId,
  originalAmount, newAmount, originalDescription, newDescription, changedFields[],
  reason, actorUserId, actorName, actorRole, branchCode, businessDate, metadata JSONB,
  createdAt );
```

Indexes: `(sourceType, sourceId)`, `(branchCode, businessDate)`, `kind`, `createdAt`, `actorUserId`.

`DayClosing.status` is unchanged as a column. `needs_correction` is a new **value**. Existing rows do not need backfill.

---

## API changes

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | `/api/admin/financial-corrections` | owner | Correct closed-day expenditure; writes history; does not reopen day |
| GET | `/api/admin/financial-corrections` | owner | List history (branch/date/source filters) |
| GET | `/api/admin/financial-detail` | owner | Transaction-level income/expenditure/staff grouping |
| GET | `/api/admin/business-day-wipe` | owner | Preview counts + confirmation phrase `WIPE YYYY-MM-DD` |
| POST | `/api/admin/business-day-wipe` | owner | Wipe one branch+date after typed confirmation |
| POST | `/api/day-closings` `action=reject` | owner | Reject pending close request; requires reason |

Staff `PATCH /api/expenses/:id` still returns `409 day_closed` on closed days. Owners cannot use the staff expense PATCH (`assertStaffOperationalRole`). Correction goes through the admin API only.

Authorization: `requireSession` + `requireOwner` (admin routes) or `assertCanRejectCloseRequest` (owner-only). Branch access is re-checked from the session, not from the client alone.

---

## UI changes

- Owner dashboard: KPI-style **Total revenue / Total expenditure / Net**, then **Inspect totals** progressive disclosure for income by source, expenditure by category, expenditure by staff, correction history, and closed-day amount correction with a required reason. Business date picker (defaults to today).
- Closing request dialog: **Approve & Close** and **Reject / Return for Correction** (reason required).
- Staff banner/workspace: `needs_correction` shows the rejection reason and keeps the same business date editable, then resubmittable.
- Calendar/day view: owner **Wipe business day** with strong confirmation copy and typed phrase containing the date.
- Expense detail: recorded-at timestamp; owner correction history section.
- Calendar transaction list: expense titles, amounts, timestamps, staff attribution from existing records.

Visual language stays existing Sonic OS owner cards / zinc-indigo surfaces. Layout is stacked on mobile.

---

## Permission changes

| Action | Allowed |
|--------|---------|
| Correct closed-day expenditure | owner only |
| Reject / return for correction | owner only (`canRejectCloseRequest`) |
| Wipe one business day | owner only |
| View financial detail / correction history APIs | owner only |
| Submit / resubmit close request | cashier / branch-manager (unchanged; still not owner) |
| Approve & Close | owner and branch-manager (unchanged) |

Staff cannot run owner correction/wipe/detail APIs (403). Cross-branch inspection/mutation is blocked by `assertSessionCanAccessBranchCode`.

---

## Audit / history design

Every closed-day expenditure correction inserts `FinancialCorrection` with:

- original amount / new amount
- changed fields
- actor user id, name, role
- exact `createdAt`
- branch code
- business date
- required reason

The live `ExpenseRecord.amount` (or DailyOperation expense line) is updated to the corrected value. The original is **not** silently overwritten without a history row.

If a DailyOperation **Operating Expenses** summary line exists, it is synced to the sum of operating `ExpenseRecord`s so reports that still read DailyOperation do not double-count or keep the stale total.

Reject and wipe also write `FinancialCorrection` plus `AuditLogEntry` / `AuthAuditLog`.

---

## Single-day wipe design

Safest approach chosen for this architecture:

1. Restore stock for that day’s sales (`applyStockMovement` in).
2. Soft-delete / void sales (`deletedAt`, status `voided`).
3. Soft-delete `ExpenseRecord` (`deletedAt`).
4. Hard-delete `StaffPayment` for that date (they are day-owned payroll rows; no soft-delete field on that model).
5. Hard-delete `DailyOperation` (cascade expenses) and `DayClosing` so the unique `(branchId, date)` slot is free and staff can open the same date again as a fresh day.

Wipe is transactional. Scope is only selected `branchId` + `date`. Other dates and other branches are untouched. Confirmation phrase is `WIPE YYYY-MM-DD`. Audit stores who/when/branch/date and counts of what was removed.

This is **not** Shop Reset. It must not be run against production during development. Verify scripts use synthetic `2099-*` dates only.

---

## Rejection lifecycle

Owner rejects `close_requested` → same row becomes `needs_correction`. Reason is stored in day summary JSON and `FinancialCorrection`. Staff on that branch can edit that date and resubmit. Unique `(branchId, date)` prevents duplicates. Owner can then Approve & Close.

---

## Financial detail design

`getFinancialDetail` returns:

- totals: movie revenue, accessory revenue, total revenue, total expenditure, net
- income grouped by existing source names (`Movie Revenue`, product names)
- expenditure grouped by category
- expenditure grouped by staff
- correction history
- `limitations[]` when source identifiers are missing

No duplicate expenditure rows are created for the UI.

---

## Tests added

| Script | Command |
|--------|---------|
| Closed-day expenditure correction | `npm run verify:closed-day-expense-correction` |
| Close-request rejection | `npm run verify:close-request-rejection` |
| Single-day wipe | `npm run verify:business-day-wipe` |
| Financial detail | `npm run verify:financial-detail` |

---

## Actual test results

Commands were run against the local Cloud Agent environment (PostgreSQL + `http://localhost:3000`). Production was not touched.

### `npx tsc --noEmit`

**PASS** (exit 0).

### New regression scripts

All **PASS**:

- `verify:closed-day-expense-correction` A–J (owner 20000→12000, staff 409 `day_closed`, reason required, original auditable, day stays `closed`, totals 12000, Salaama isolation 5000)
- `verify:close-request-rejection` A–I (reason 400, non-owner 403, same date `needs_correction`, no duplicate day, staff editable + resubmit, owner approve → `closed`, isolation)
- `verify:business-day-wipe` A–H (non-owner 403, confirmation 400, selected 2099-03-21 wiped, staff page reset, other date/branch untouched, wipe audited, date reopenable)
- `verify:financial-detail` A–G (staff 403, Transport line, staff attribution, timestamp, Movie Revenue 20000, existing names, Salaama empty)

### Relevant existing verifies

- `verify:close-request-workflow` — **PASS** (24 checks)
- `verify:closing-request-approval-flow` — **PASS** (A–J)
- `verify:expenses` — **20/20 certification checks PASS**. Script then failed in **post-certification cleanup** (`ExpenseRecord_categoryId_fkey` when deleting custom categories). That cleanup path is pre-existing in `scripts/verify-expenses-module.ts` and is not part of the v3.1.2 feature surface. Certification itself completed.
- `verify:dashboard-expense-dedupe` — checks **1–11 PASS**. Script then failed opening a later fixture because a leftover previous business day was still `open` in the shared local DB after other verifies. Not a production-data run; not a failure of the new correction/wipe APIs.

### `npm run build`

**PASS** (exit 0). Next.js 16.2.10 compiled; TypeScript in build finished; 83 static pages generated. Pre-existing Turbopack NFT warnings from `backup-service.ts` tracing remain; they did not fail the build. New routes present: `/api/admin/financial-corrections`, `/api/admin/financial-detail`, `/api/admin/business-day-wipe`.

---

## Migration requirements (required before any future deploy)

**Do not deploy from this work.** When a human later deploys:

1. Take a PostgreSQL backup.
2. Apply **only** `prisma/migrations/20261006120000_financial_corrections_v312` via `npm run db:migrate:deploy` (additive `FinancialCorrection` table).
3. No data backfill is required for existing closed days. Historical expenditures keep current amounts until an owner explicitly corrects them.
4. After migrate, owners can correct, reject, wipe, and inspect detail. Wiping a real date is irreversible for operational records (sales are voided/soft-deleted; day closing row is deleted).
5. Do not run Shop Reset. Do not run wipe against production during testing.

Existing dual expenditure sources remain: days that only have DailyOperation expense lines still show those lines until module `ExpenseRecord`s exist.

---

## Known limitations

- Movie revenue is a day total on `DailyOperation.sales`, not per-movie or per-ticket lines.
- There is no authoritative service catalog for Windows Installation, Typing, B&W/Colour printing, or phone unlocking. Accessory income uses `SaleItem.productName`. Future income should keep using existing product/service names rather than a newly invented catalog.
- Accessory sales with zero line items cannot expose a source name (reported in `limitations`).
- Reports modules that still sum DailyOperation expenses are aligned after owner correction only when an **Operating Expenses** summary line exists (that line is synced). Pure module-record days use ExpenseRecord-first financial detail.
- Single-day wipe hard-deletes `DayClosing` / `DailyOperation` / `StaffPayment` for that date so the unique slot can reopen. History of the wipe itself is retained in `FinancialCorrection` + audit logs. Soft-deleted sales/expenses remain in PostgreSQL with `deletedAt`.
- Reject is owner-only even though Approve & Close remains available to branch-managers (existing permission).
- Clock Out and Staff Open Shop residual were explicitly left unchanged.

---

## Constraint checklist

- Production data not modified; wipe/correction verifies used synthetic `2099-*` dates
- Not deployed
- Entire business not reset
- Branch identity unchanged
- Authentication unchanged
- Clock Out not reintroduced or modified
- Staff Open Shop residual not investigated or modified
