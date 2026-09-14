# Data & Backup + Owner Dashboard UX Redesign

**Branch:** `cursor/data-backup-dashboard-ux-b6e7`  
**Date:** 2026-09-14  
**Scope:** UI/UX only — no backup logic, schema, or production data changes

---

## Problem

1. **Settings → Data & Backup** showed the full backup log inline, including repeated failed attempts and raw technical errors (`BigInt`, `ENOENT`), making backup health look worse than it was.
2. **Owner Mission Control** had correct visual design but weak hierarchy: closing requests always occupied space when empty, Business Intelligence showed up to four alert-style insights (including low-value 100% comparisons), and End of Day duplicated the full staff closing workflow.

---

## Root cause

Presentation-layer issues only:

- Backup UI mapped every API record directly to the main page list.
- BI card displayed the first N generated insights without prioritizing actionable items or hiding noisy comparisons.
- Closing requests panel always rendered an empty-state card.
- End of Day card included daily notes and long explanatory copy intended for staff operations.

---

## Files changed

| File | Change |
|------|--------|
| `components/settings/data-protection-section.tsx` | Backup Health card, protection status, top 3 successful backups, failure summary |
| `components/settings/backup-history-dialog.tsx` | **New** — full history modal with technical errors |
| `components/dashboard/owner/business-intelligence-card.tsx` | Renamed surface to Business Insights, max 3 actionable insights, filters |
| `components/dashboard/owner/business-insights-dialog.tsx` | **New** — View all insights modal |
| `components/dashboard/owner/mission-control-end-of-day.tsx` | Compact checklist + single CTA |
| `components/dashboard/closing-requests/closing-requests-panel.tsx` | Hidden when no pending requests (owner dashboard) |
| `scripts/verify-data-backup-dashboard-ux.ts` | **New** — static UX regression verifier |
| `package.json` | `verify:data-backup-dashboard-ux` script |

**Unchanged:** backup APIs/services, BI generators, authorization, branch isolation, financial calculations, database schema.

---

## Refresh / revalidation mechanism

Not applicable — this change is presentational. Existing `listBackupsApi()` / `triggerBackupApi()` and BI feed hooks are unchanged.

---

## Backup UX behavior

| Area | Behavior |
|------|----------|
| Backup Health | Protected when today's latest restorable backup succeeded; Attention Required otherwise |
| Recent Backups | Latest 3 **completed** backups only |
| Failures | Counted in summary line; full records + errors in **View history** modal |
| Backup Now / Refresh | Unchanged actions |

---

## Owner dashboard flows covered

| Section | Change |
|---------|--------|
| Closing Requests | Renders only when pending |
| KPI row | Unchanged (Shop Status, Staff, revenues) |
| Today's Activity + Cash | Unchanged |
| Business Insights | Max 3 actionable; View all insights modal |
| End of Day | Compact status grid + Go to Close Day |

---

## Security / data

**Schema changes:** None  
**Production data modified:** No  
**Backup logic modified:** No

---

## Tests run

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run verify:data-backup-dashboard-ux` | **PASS** (9 checks) |
| `npm run verify:backup-bigint` | **PASS** (9 checks) |
| `npm run verify:closing-confirm-auto-refresh` | **PASS** (9 checks) |

## Tests not run

| Test | Reason |
|------|--------|
| Manual browser review of Settings / Owner Home | Not executed in this agent run |

---

## Limitations

- Protection status uses existing backup record metadata only; it does not certify scheduled cron execution beyond what records already show.
- Staff/manager dashboard still shows the closing-requests panel empty state when role permits — owner Home is the primary target for hide-when-empty behavior.

---

## CODE PASS/FAIL

**CODE PASS**

## TEST PASS/FAIL

**TEST PASS**
