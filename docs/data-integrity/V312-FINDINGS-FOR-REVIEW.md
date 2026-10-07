# Sonic OS v3.1.2 — Findings for Review

**Share this document.** Matching Word file: `docs/data-integrity/V312-FINDINGS-FOR-REVIEW.docx`

| Field | Value |
|---|---|
| Product | Sonic OS |
| Release | v3.1.2 — Financial corrections & auditability |
| Date | 7 October 2026 |
| Branch | `cursor/financial-corrections-auditability-9071` |
| Production data | Not modified |
| Deployed | No |

---

## 1. Verdict for reviewers

v3.1.2 is implemented and verified in a local Cloud Agent environment. It is **not** on production and **must not** be deployed until this review is accepted and the additive database migration is applied on a backup-first staging path.

What owners can do after deploy:

1. Correct an expenditure after a day is closed, without silently overwriting the original, and without reopening the day.
2. Reject a submitted closing request with a required reason, so staff can correct **the same business date** and resubmit.
3. Wipe **one** branch + **one** date, with typed confirmation and an audit record.
4. Inspect exact income and expenditure lines (who, when, branch, source/category), instead of only totals.

What this release deliberately did **not** do:

- Change authentication or branch identity
- Reintroduce or modify Clock Out
- Investigate or change Staff Open Shop residual
- Reset the entire business
- Touch production data

---

## 2. Findings from the current-code audit

These findings are from the repository as it existed at implementation time. Architecture from earlier conversations was not assumed.

### Business day

- One `DayClosing` row per branch per calendar date (unique `branchId` + `date`).
- Status is a string: `open` → `close_requested` → `closed`.
- v3.1.2 adds `needs_correction` as a **new status value on the same row**. It does not create a second day and does not invent a parallel workflow.
- Staff can edit while `open` or `needs_correction`.
- `close_requested` stays locked until owner approve or reject.
- `closed` stays closed. Owner correction does not change `openedAt`, `closedAt`, or status.

### Money records already in the system

| Kind | Where it lives | What owners will see |
|---|---|---|
| Operating expenditure | `ExpenseRecord` (description, category, amount, staff, timestamp, branch, date) | Transaction-level lines |
| Close-day expense summary | Often a single DailyOperation line named “Operating Expenses” | Used only when no module expense records exist for that day |
| Movie revenue | `DailyOperation.sales` — one total for the day | Shown as “Movie Revenue”, not tickets |
| Accessory income | `Sale` / `SaleItem.productName` | Product names already on the sale |
| Staff payments / daily wage | Separate from operating expenses | Not mixed into operating expenditure totals |

**Important income finding:** Sonic OS does **not** have a service catalog for Windows Installation, Windows Setup, Typing, B&W Printing, Colour Printing, or Phone Unlocking. Those labels were **not** invented. Accessory income uses existing product names. Movie income is a day total.

### Reset that already existed

Owner Shop Reset is a wholesale business reset. It is the wrong tool for “fix one bad day.” v3.1.2 adds a separate single-day wipe.

---

## 3. What was implemented

### 3.1 Correct expenditure after close (owner only)

Example: Transport UGX 20,000 → UGX 12,000.

- Original amount is kept in history. The live record becomes 12,000 and that is what totals use.
- History includes original value, new value, what changed, who, exact time, branch, business date, and required reason.
- Staff cannot edit closed-day expenses (`409 day_closed`).
- The day remains **CLOSED**.

### 3.2 Reject / return a submitted day (owner only)

Lifecycle:

`OPEN` → `SUBMITTED (close_requested)` → `NEEDS_CORRECTION` → `SUBMITTED` → `CLOSED`

- Owner must enter a rejection reason (example: “Please correct transport expenditure from UGX 20,000 to UGX 12,000.”).
- The same business date becomes editable for the correct staff.
- Staff resubmit the same date. Owner can review again.
- No second business-day record is created.

Approve & Close remains available. Reject is owner-only even though branch-managers can still Approve & Close (existing rule, unchanged).

### 3.3 Wipe one business day (owner only)

Destructive, scoped, confirmed:

- Affects only the selected branch and selected date.
- Does not affect other dates, other branches, or unrelated stock/staff/finance.
- Owner must type `WIPE YYYY-MM-DD`.
- Copy: “This will remove the operational records for [Branch] [date]. This cannot be undone.”

Safest approach chosen for this schema:

1. Restore stock from that day’s sales.
2. Void / soft-delete sales.
3. Soft-delete expense records.
4. Delete day-owned staff payments (that model has no soft-delete).
5. Delete DailyOperation and DayClosing so staff can open that date again as a fresh day.
6. Keep a wipe audit row (who, when, branch, date, what was removed).

This is **not** Shop Reset. It was **not** run against production. Automated tests used synthetic dates in 2099 only.

### 3.4 Financial detail (progressive disclosure)

High level (not a giant table):

- Total revenue
- Total expenditure
- Net

Then drill into:

- Income by source (Movie Revenue, product names, …)
- Expenditure by category (Transport, …)
- Expenditure by staff member

Each line can show description, amount, timestamp, staff, branch, business date, category, and correction history when present.

---

## 4. Permissions and isolation

| Action | Who |
|---|---|
| Correct closed-day expenditure | Owner |
| Reject / return for correction | Owner |
| Wipe one business day | Owner |
| View financial-detail / correction APIs | Owner |
| Submit / resubmit close request | Cashier / branch-manager (not owner) |
| Approve & Close | Owner and branch-manager (unchanged) |

Server-side checks re-validate session, role, and branch. A user from Kansanga cannot inspect or change Salaama through these APIs. Staff cannot call owner correction/wipe endpoints.

---

## 5. Database change required before any future deploy

Additive table only: `FinancialCorrection`.

- Existing closed days do **not** need a data backfill.
- Historical amounts stay as they are until an owner explicitly corrects them.
- `DayClosing.status` column is unchanged; `needs_correction` is a new allowed value.

**Before deploy (when a human later chooses to deploy):**

1. Take a PostgreSQL backup.
2. Apply `prisma/migrations/20261006120000_financial_corrections_v312` with `npm run db:migrate:deploy`.
3. Do not run Shop Reset.
4. Do not practise wipe on real production dates.

This work did **not** apply that migration to production.

---

## 6. Tests that actually ran

Environment: local Cloud Agent (PostgreSQL + `http://localhost:3000`). Production was not used.

| Test | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run verify:closed-day-expense-correction` | PASS A–J |
| `npm run verify:close-request-rejection` | PASS A–I |
| `npm run verify:business-day-wipe` | PASS A–H (2099 dates only) |
| `npm run verify:financial-detail` | PASS A–G |
| `npm run verify:close-request-workflow` | PASS |
| `npm run verify:closing-request-approval-flow` | PASS |
| `npm run verify:documentation-drift` | PASS 14/14 |
| `npm run build` | PASS |

Closed-day correction proved: owner can correct 20,000 → 12,000; staff cannot; original remains auditable; totals become 12,000; day stays closed; other branch unchanged.

Rejection proved: reason required; non-owner blocked; same date; no duplicate day; staff can edit and resubmit; owner can then approve.

Wipe proved: owner only; typed confirmation required; selected date/branch only; staff page resets; other date and other branch untouched; wipe audited; date can be opened again.

Financial detail proved: exact Transport line, staff name, timestamp, Movie Revenue 20,000, branch scoping.

Notes (not feature failures):

- `verify:expenses` certified 20/20, then failed in **old cleanup code** deleting custom categories (foreign key). The certification itself passed.
- `verify:dashboard-expense-dedupe` passed checks 1–11, then hit a leftover open day in the shared local database from earlier verifies.

Browser walkthrough (owner UI, wipe **cancelled**, no production wipe): financial totals + drill-down, calendar wipe confirmation, expense history recorded-at. There was no pending closing request in that session, so the reject dialog was verified by regression tests rather than a live pending request.

---

## 7. Known limitations (do not skip)

1. **Movie revenue** is one number per day, not per film or per ticket.
2. **Service names** such as Windows Installation or Typing do not exist as authoritative records. Future entries should keep using real product/service names already in the system.
3. Accessory sales with **no line items** cannot show a source name.
4. Wipe **hard-deletes** the day-closing and daily-operation rows for that date so the date can be reused. The wipe itself remains in audit history. Sales and expenses are soft-deleted.
5. Reject is **owner-only**. Branch-managers can still Approve & Close.
6. Clock Out and Staff Open Shop residual were left untouched on purpose.

---

## 8. Reviewer checklist

Please confirm or flag:

- [ ] Closed-day correction with visible history is the intended owner tool (day stays closed).
- [ ] Reject/return on the same date is the intended staff correction path.
- [ ] Single-day wipe is accepted as destructive, owner-only, typed-confirm, one branch/date.
- [ ] Financial detail using existing records (no invented service catalog) is acceptable.
- [ ] Additive `FinancialCorrection` migration is understood before any deploy.
- [ ] Production must not be wiped, reset, or deployed from this development work.

---

## 9. Companion technical report

Implementation detail (files, APIs, schema SQL): `docs/data-integrity/V312-FINANCIAL-CORRECTIONS-AUDITABILITY.md` and `.docx`.
