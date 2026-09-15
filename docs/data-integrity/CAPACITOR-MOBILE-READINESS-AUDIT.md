# Sonic OS — Phase 2 Capacitor Mobile Readiness Audit

**Branch:** `cursor/capacitor-mobile-readiness-audit-b6e7`  
**Date:** 2026-09-15  
**Scope:** Audit only — no Capacitor installation, no production changes  
**Repository state audited:** `main` (Next.js 16.2.10, React 19.2.4)

---

# Executive Summary

Sonic OS is a **production Next.js full-stack application** (53 REST API routes, PostgreSQL/Neon, Vercel deployment) with a **mobile-styled web UI** (bottom navigation, safe-area padding, card fallbacks on major tables). It is **not yet Capacitor-ready** as a conventional native shell pointing at a separate API host.

**Verdict:** **Conditionally ready** for Capacitor using a **remote WebView** that loads the deployed HTTPS Sonic OS origin (same origin for UI + API). This is the lowest-risk path and requires **no database or auth redesign** if WebView cookie persistence is validated on iOS/Android.

**Not ready without pre-work:**
- Split Capacitor shell + remote API (blocked by cookie auth, CSRF, no CORS, no API base URL)
- Static/offline bundle (incompatible with 53 server API routes + Prisma)
- Owner mobile experience (11-item bottom nav overflow, dense admin tables)
- Staff movie revenue entry on Today screen (display-only card; input exists elsewhere but not wired to staff flow)

**Recommended next step:** Choose **Remote WebView architecture**, validate session cookies in iOS WKWebView and Android WebView against production/staging, then fix **Critical UI gaps** (movie revenue input, owner nav, mobile account menu) before first mobile build.

---

# Current Architecture

| Layer | Technology | Evidence |
|-------|------------|----------|
| Framework | Next.js 16.2.10 (`output: "standalone"`) | `next.config.ts`, `package.json` |
| UI | React 19, TypeScript, Tailwind, shadcn-style components | `components/`, `app/globals.css` |
| Data | Prisma + PostgreSQL (Neon in production) | `prisma/schema.prisma`, `lib/db.ts` |
| Auth | httpOnly signed cookie + DB session | `lib/server/session.ts`, `lib/server/services/auth-service.ts` |
| API | 53 route handlers under `app/api/` | Glob count |
| Client data | Context providers + `fetch("/api/...")` | `context/*`, `lib/api/client.ts` |
| Deployment | Vercel (production), standalone Docker option | `next.config.ts`, `deploy/` |
| Mobile UI hints | Bottom nav, safe-bottom, appleWebApp metadata | `bottom-nav.tsx`, `app/layout.tsx` |
| Capacitor | **None** | No `@capacitor/*` deps, no `capacitor.config.*` |

**Application shape:** ~44 `app/**/page.tsx` files are `"use client"`. Root `app/layout.tsx` is a server component wrapping 10+ client providers. Data loads client-side via contexts on mount — not RSC data fetching.

**Branches:** Kansanga (`main`), Salaama (`salaama` in constants; production may still be migrating from `branch2`). Branch isolation is server-authoritative via session + `branchId` UUID.

---

# Capacitor Compatibility Assessment

## Overall suitability: **Medium** (with Remote WebView) / **Low** (with split shell)

| Finding | Severity | Evidence | Recommendation |
|---------|----------|----------|----------------|
| No Capacitor scaffolding | **High** | No Capacitor packages or config in `package.json` | Add Capacitor in Phase 2 after architecture sign-off |
| Standalone server output, not static export | **Critical** | `next.config.ts`: `output: "standalone"`; 53 API routes with Prisma | Cannot bundle as offline SPA; use remote WebView to deployed URL |
| All API calls use relative paths | **Critical** | `lib/api/client.ts`: `fetch(path, { credentials: "include" })` — paths like `/api/sales` | Remote WebView same-origin works; split shell needs `NEXT_PUBLIC_API_URL` |
| Zero server actions | **Positive** | No `"use server"` directives found | REST API layer is extractable for future native clients |
| Client-heavy SPA architecture | **Medium** | All pages client components; providers in `app/layout.tsx` | Works in WebView; initial load depends on network |
| No `window.location` domain assumptions | **Positive** | Grep: no runtime hardcoded production domains in app code | Good for remote WebView |
| CSRF origin validation | **High** | `lib/server/security/csrf.ts`: blocks mutating requests when Origin/Referer ≠ expected host | Same-origin WebView OK; cross-origin shell blocked |
| No CORS headers | **High** | No `Access-Control-*` in middleware or routes | Required only if UI and API are on different origins |

### Recommended Capacitor models (ranked)

**A. Remote WebView (recommended first)**  
Capacitor shell → `server.url: "https://<production-sonic-os>"`  
- UI and API share origin; cookies + CSRF work as today  
- Requires WebView cookie/`Secure`/`SameSite` validation on iOS/Android  

**B. Split shell + remote API (high effort)**  
- Requires: API base URL, CORS, CSRF strategy for `capacitor://` origin, possibly Bearer token auth  
- Not recommended until Path A is proven  

**C. Static bundle (not viable)**  
- Incompatible with current architecture  

---

# Authentication Assessment

| Finding | Severity | Evidence | Recommendation |
|---------|----------|----------|----------------|
| Session = httpOnly cookie `sonic-os-session-token` | **Critical** (for split shell) | `lib/server/session.ts` L11; `lib/server/security/cookies.ts` | Validate in WebView; consider Bearer token only if split shell required |
| Cookie flags: `httpOnly`, `SameSite=lax`, conditional `Secure` | **High** | `lib/server/security/cookies.ts` L7–25 | Test iOS WKWebView with production HTTPS; `Secure` cookies may fail on non-HTTPS WebView origins |
| Auth is server-authoritative (DB session) | **Positive** | `auth-service.ts` creates `prisma.session` + Set-Cookie | Mobile continues calling same backend |
| localStorage NOT used for session | **Positive** | `lib/client/session-registry.ts` in-memory only; `lib/auth-storage.ts` purges legacy keys | No localStorage session migration needed |
| localStorage used for UX prefs only | **Low** | `context/branch-context.tsx`, `lib/notification-storage.ts`, `lib/historical-import/undo-storage.ts` | Optional: `@capacitor/preferences` later |
| Client route gating only (no middleware auth) | **Medium** | `app-shell.tsx` redirects unauthenticated users; `middleware.ts` has security headers only | API remains protected server-side; UI bypass is cosmetic |
| Login: username/password via POST `/api/auth/session` | **Info** | `lib/api/auth.ts`, `app/api/auth/session/route.ts` | No OAuth redirect issues |
| Lock/unlock flow | **Medium** | Session lock state in auth context | Must work in WebView; test background/foreground |
| Branch preference server-authoritative | **Positive** | `lib/branch/active-branch-resolution.ts` | Stale localStorage cannot override server branch |

**Capacitor-specific concerns:**
- **SameSite=Lax** generally works for same-site top-level navigation in WebView when loading HTTPS deployment
- **No OAuth/external redirects** — simplifies mobile login
- **Session refresh** on app resume depends on cookie persistence — must test explicitly

---

# API / Backend Assessment

## API inventory: 53 routes

Categories (all require session unless noted):

| Category | Routes | Auth pattern |
|----------|--------|--------------|
| Auth | `/api/auth/session` | GET public; POST login public |
| Health | `/api/health`, `/api/ready`, `/api/readiness` | Public |
| Cron | `/api/cron/backup` | Bearer `CRON_SECRET` |
| Admin | `/api/admin/*` | Owner only |
| Users/Roles | `/api/users/**`, `/api/roles` | Owner only |
| Branches | `/api/branches`, `/api/branches/[id]` | Session + branch scope |
| Sales | `/api/sales`, `/api/sales/branch-products`, `/api/customers/**` | Session + module RBAC |
| Expenses | `/api/expenses/**`, categories, templates | Session + module RBAC |
| Stock | `/api/stock/**` | Session + module RBAC |
| Staff | `/api/staff/**`, payments, attendance | Session + module RBAC |
| Operations | `/api/daily-operations/**`, `/api/day-closings` | Session; import/bulk-delete owner-only |
| Reports | `/api/reports/summary` | Session |
| Settings | `/api/settings` | Session |

**Central enforcement:** `lib/server/route-handler.ts` — `requireSession()`, CSRF, RBAC via `lib/server/security/permissions.ts`.

**Mobile communication path (future):**
```
Capacitor WebView UI → fetch("/api/...") → Vercel Next.js → Prisma → Neon PostgreSQL
```

**Database must NEVER be exposed to mobile.** All access continues through existing API routes with session + branch authorization.

| Finding | Severity | Evidence |
|---------|----------|----------|
| No server actions | Positive | Zero `"use server"` — all mutations via REST |
| Branch scoping via query/body injection | Positive | `lib/api/branch-request.ts` |
| Owner-only paths enforced server-side | Positive | `OWNER_ONLY_PREFIXES` in permissions.ts |
| No WebSockets/SSE | Info | Polling-based live refresh instead |
| No multipart upload API | Medium | Historical import sends parsed JSON, not file blobs |

---

# UI / Mobile UX Assessment

## Global layout infrastructure

| Component | Assessment | Evidence |
|-----------|------------|----------|
| Bottom nav | Good foundation | `components/shared/layout/bottom-nav.tsx` — fixed, `safe-bottom`, `lg:hidden` |
| Page container | Mobile-first padding | `page-container.tsx`: `max-w-lg px-5 pb-28` mobile |
| Sidebar | Desktop-only (`lg+`) | `sidebar.tsx` hidden below lg |
| Safe area | Partial — bottom only | `globals.css` `.safe-bottom`; no top inset for notch |
| Viewport | Default Next.js | No explicit `viewport` export in `app/layout.tsx` |
| Touch inputs | Good — `h-12` inputs | `lib/ui/design-tokens.ts`, `shared/ui/input.tsx` |
| Tap highlight | Disabled | `globals.css` |

## Screen-by-screen summary

| Screen | Mobile readiness | Key issues |
|--------|------------------|------------|
| Login | **Ready** | Centered card, full-width CTA (`login-form.tsx`) |
| Lock | **Ready** | Same pattern (`lock-page.tsx`) |
| Owner Home | **Mostly ready** | Dense KPI grids; mission-control layout (`owner-dashboard-layout.tsx`) |
| Staff Today | **Strong with gaps** | Accordion cards, bottom-sheet modals; **no movie revenue input** |
| Open Shop | **Ready** | Full-width CTAs (`open-shop-page.tsx`) |
| Sales | **Mostly ready** | Two-column cart until `xl`; mobile card fallback on recent sales |
| Expenses | **Mostly ready** | Mobile card layout; `window.confirm` for delete |
| Purchases | **Mostly ready** | Mobile cards; long form scroll on new purchase |
| Stock | **Mostly ready** | Main table has cards; products/movement sub-pages table-only |
| Staff | **Mixed** | Members table has cards; filter row dense |
| Reports | **Mostly ready** | Responsive KPIs; Recharts `ResponsiveContainer` |
| EOD / Closing submit | **Ready** | Full-width submit, confirm dialog (`staff-end-of-day-card.tsx`) |
| Owner close approval | **Functional, dense** | 5-step `close-day-workspace.tsx` heavy on phone |
| Settings | **Mixed** | Nav stacks; users/audit/import tables horizontal-scroll only |
| Calendar | **Cramped** | 7-column grid ~53px cells on 375px width |
| Branch selector | **Good** | Dropdown in mobile header (`branch-switcher.tsx`) |

## Cross-cutting UI findings

| Finding | Severity | Evidence | Recommendation |
|---------|----------|----------|----------------|
| Owner bottom nav: 11 items × 56px min-width | **Critical** | `nav-items.tsx` (11 items), `bottom-nav.tsx` L21–30, `nav-visibility.ts` (owner sees all) | "More" drawer or reduce primary tabs before owner mobile |
| No mobile user account menu (sign out/lock) | **High** | `page-header.tsx` L90: `UserAccountMenu` is `hidden lg:block` | Add avatar menu to mobile header |
| 17 files use `window.confirm/alert/prompt` | **Medium** | e.g. `expenses-workspace.tsx`, `data-protection-section.tsx` | Replace with in-app dialogs for native feel |
| Bottom nav labels 9px | **Low** | `bottom-nav.tsx` L44 | Increase to ≥11px |
| Icon targets 36×36px (under 44px guideline) | **Low** | `bottom-nav.tsx` L36 | Increase touch targets |
| Inconsistent modal patterns | **Low** | Bottom sheets in `stock-dialog.tsx`; centered in `review-closing-request-dialog.tsx` | Standardize mobile modal pattern |
| Admin tables without card fallback | **High** | `settings/users-table.tsx`, `audit-log-table.tsx`, `stock-products-table.tsx` | Add mobile list views in Phase 2 |
| `mousedown` for click-outside | **Low** | `branch-switcher.tsx` | Prefer `pointerdown` for touch |

---

# Staff Workflow Assessment

Priority staff workflows (daily operations):

| # | Workflow | Readiness | Evidence | Issues |
|---|----------|-----------|----------|--------|
| 1 | Login | **Ready** | `login-form.tsx` | — |
| 2 | Open Shop | **Ready** | `open-shop-page.tsx`, attendance API | — |
| 3 | Record Movie Revenue | **Critical gap** | `staff-revenue-card.tsx` is **display-only**; input exists in `operations-closing-panel.tsx` L45–50 and `operations-form.tsx` but **not wired to staff workspace** | Staff cannot enter movie revenue on Today |
| 4 | Record Accessory Sale | **Ready** | `staff-today-activity-card.tsx` → `StockDialog` + sale form | Long modal scroll |
| 5 | Record Expense | **Ready** | `staff-expenses-card.tsx` | Small category chips |
| 6 | Staff Daily Wage | **Ready** | `staff-daily-wage-card.tsx` | — |
| 7 | View Today's Summary | **Ready** | Revenue, activity, transactions cards | Movie revenue shows "Pending" until entered elsewhere |
| 8 | End of Day | **Ready** | `staff-end-of-day-card.tsx` | Checklist, notes, submit |
| 9 | Submit for Closing | **Ready** | `close-day-confirm-dialog.tsx` | Saves entry then submits request |

**Additional staff gap:**

| Finding | Severity | Evidence |
|---------|----------|----------|
| Savings allocation display-only on staff Today | **Medium** | `staff-cash-summary-card.tsx` shows `savingsAllocation` but staff workspace passes no input; owner `operations-workspace.tsx` has savings UI |
| Cashiers see only 2 nav items (Today, Sales) | **Positive** | `lib/auth/nav-visibility.ts` `CASHIER_NAV_PREFIXES` |

**Staff mobile verdict:** ~**75% ready** for Capacitor WebView after movie revenue input is restored to staff Today flow.

---

# Owner Workflow Assessment

| Workflow | Readiness | Notes |
|----------|-----------|-------|
| Dashboard / mission control | Mostly ready | Dense on small screens; 12s polling (`use-management-dashboard-refresh.ts`) |
| Branch switching | Ready | Server-authoritative; dropdown in header |
| Closing request approval | Functional | Review dialog centered, not bottom sheet |
| Close day (5-step workspace) | Dense | `close-day-workspace.tsx` — multi-column metrics |
| Reports | Mostly ready | Filter toolbar stacks; charts responsive |
| Settings / admin | Poor on mobile | Wide tables, horizontal scroll only |
| Shop reset / backup | Functional | Uses `window.prompt` for production confirmation |

**Owner mobile verdict:** ~**50% ready** — navigation overflow and admin tables are primary blockers.

---

# Offline Readiness

**Current state:** No offline support. No service worker, no mutation queue, no IndexedDB business cache.

| Operation | Classification | Rationale |
|-----------|----------------|-----------|
| Login / session | **MUST REQUIRE LIVE SERVER** | Cookie session validated against DB |
| Open shop / clock in | **MUST REQUIRE LIVE SERVER** | Creates attendance + day closing records |
| Movie revenue / daily operations save | **MUST REQUIRE LIVE SERVER** | Authoritative financial record; branch-scoped |
| Accessory sale | **MUST REQUIRE LIVE SERVER** | Stock decrement + sale record |
| Expense record | **MUST REQUIRE LIVE SERVER** | Financial record |
| Staff daily wage / payment | **MUST REQUIRE LIVE SERVER** | Payment authorization + ledger |
| Stock adjustment | **MUST REQUIRE LIVE SERVER** | Inventory authority |
| Closing submit / approve | **MUST REQUIRE LIVE SERVER** | Day state machine; owner approval |
| View cached dashboard | **POTENTIALLY QUEUEABLE** (future) | Read-only display of last-fetched data — not implemented |
| Draft notes (local only) | **POTENTIALLY QUEUEABLE** (future) | Could cache textarea locally — not implemented; risk of conflict |
| Notification prefs | **SAFE TO QUEUE OFFLINE** | Already in localStorage (`lib/notification-storage.ts`) — UX only |
| Branch UI preference | **SAFE TO QUEUE OFFLINE** | localStorage cache; server wins on sync |

**Network failure behavior:** `lib/data-source.ts` checks `/api/health`; contexts throw `DataSourceUnavailableError` — hard fail, no retry queue.

**Recommendation:** Phase 2 should assume **online-only**. Offline queuing is Phase 3+ and requires conflict resolution design per operation type.

---

# Native Feature Opportunities

| Feature | Benefit | Workflow | Phase |
|---------|---------|----------|-------|
| **Push notifications** | Owner alerted to closing requests; staff notified of approval | Closing request flow | Phase 3 |
| **Camera / photo capture** | Receipt photos for expenses; stock condition docs | Expenses, stock receiving | Phase 3 |
| **File picker (native)** | Better historical import UX than HTML input | Settings → Import | Phase 2–3 |
| **Network status plugin** | Show offline banner; disable submit when disconnected | All live operations | Phase 2 |
| **Secure storage** | Optional credential remember (not session token) | Login convenience | Phase 3 |
| **App lifecycle** | Refresh data on resume; pause polling in background | Already partial via `document.visibilityState` | Phase 2 (enhance) |
| **Haptics** | Confirm sale/expense recorded | Staff quick actions | Phase 3 |
| **Share** | Share daily summary / report export | Reports | Phase 3 |
| **Clipboard** | Copy totals, branch codes | Reports, dashboard | Phase 3 |
| **Biometric unlock** | Quick unlock after session lock | Lock screen | Phase 3 |
| **Status bar / splash** | Native app polish | App launch | Phase 2 (with Capacitor) |

**Do NOT install plugins in this audit phase.**

---

# Performance Findings

| Finding | Severity | Evidence | Recommendation |
|---------|----------|----------|----------------|
| 12s polling (5 parallel fetches) when close request active | **Medium** | `hooks/use-staff-operations-refresh.ts` L13, L42–47 | Reduce interval or use push in Phase 3 |
| 12s owner dashboard polling (7 fetches) | **Medium** | `hooks/use-management-dashboard-refresh.ts` | Same |
| `xlsx` (~7MB) client-bundled for import | **Medium** | `lib/historical-import/parse-file.ts`, `package.json` | Lazy-load or server-side parse |
| `recharts` in 9 chart components | **Medium** | Dashboard, reports | Already partial dynamic import on dashboard |
| ~365 `"use client"` modules | **Low** | Widespread client components | Acceptable for WebView loading remote app |
| 10 nested context providers at root | **Low** | `app/layout.tsx` L44–74 | Sequential mount cost on cold start |
| No React Query/SWR deduplication | **Low** | Custom fetch in contexts | Duplicate fetches possible on navigation |
| Geist font from Google Fonts | **Low** | `app/layout.tsx` L21–24 | Network dependency on first load |

**Do NOT optimize in this audit phase.**

---

# Security Findings

| Finding | Severity | Evidence | Recommendation |
|---------|----------|----------|----------------|
| httpOnly session cookie (not JS-accessible) | **Positive** | `lib/server/security/cookies.ts` | Maintain; do not move token to localStorage |
| CSRF protection on mutating API routes | **Positive** | `lib/server/security/csrf.ts` | Keep for WebView same-origin |
| Branch authorization server-side | **Positive** | `lib/server/branch-lookup.ts`, `assertSessionCanAccessBranchCode` | Mobile cannot bypass via crafted requests |
| Owner-only routes enforced | **Positive** | `OWNER_ONLY_PREFIXES` | Keep |
| Permissions-Policy blocks camera/mic/geo | **Info** | `middleware.ts` L3–8 | Revisit when adding native camera |
| Client route gating bypassable | **Medium** | `app-shell.tsx` — UI only | API remains authoritative |
| Sensitive data in WebView | **Medium** | Full app renders financial data | Require device passcode; consider screenshot prevention for owner screens (Phase 3) |
| No certificate pinning | **Low** | Standard HTTPS only | Optional hardening Phase 3 |
| Legacy localStorage keys purged on logout | **Positive** | `lib/auth/client-storage-keys.ts` | 27 keys cleared |

**Do NOT weaken security controls for mobile.**

---

# PWA Audit

| Asset | Present? | Evidence |
|-------|----------|----------|
| `manifest.json` | **No** | `public/` contains only SVG placeholders |
| Service worker | **No** | No registration found |
| App icons (192/512 PNG) | **No** | No `favicon.ico` or `app/icon.*` |
| Apple web app metadata | **Partial** | `app/layout.tsx` L29–33: `appleWebApp.capable` |
| Theme color | **No** | Not in metadata |
| Installability | **No** | Cannot add to home screen as PWA |

**PWA vs Capacitor:** Existing PWA hints do not conflict with Capacitor. Capacitor replaces PWA installability with native app store distribution. Consider adding manifest + icons for web users independently.

---

# Required Changes Before Capacitor

## Critical (must fix or validate before first mobile build)

| # | Change | Severity | Files |
|---|--------|----------|-------|
| 1 | **Choose architecture: Remote WebView to production URL** | Critical | New `capacitor.config.ts` (Phase 2) |
| 2 | **Validate httpOnly cookie auth in iOS WKWebView + Android WebView** | Critical | Test against staging/production |
| 3 | **Restore movie revenue input on Staff Today** | Critical | `staff-revenue-card.tsx` or wire `operations-closing-panel.tsx` pattern into `staff-operations-workspace.tsx` |
| 4 | **Fix owner mobile bottom nav overflow (11 items)** | Critical | `nav-items.tsx`, `bottom-nav.tsx` |

## High (should fix during Capacitor integration)

| # | Change | Severity | Files |
|---|--------|----------|-------|
| 5 | Add mobile account menu (sign out, lock) | High | `page-header.tsx`, `app-shell.tsx` |
| 6 | Add app icons + splash screens for stores | High | `public/`, Capacitor assets |
| 7 | Add `viewport-fit=cover` + top safe-area padding | High | `app/layout.tsx`, `globals.css` |
| 8 | Replace `window.confirm/alert/prompt` with in-app dialogs | High | 17 component files |
| 9 | Add network status / offline error banner | High | New component + `@capacitor/network` (Phase 2) |
| 10 | Mobile card views for admin tables | High | Settings, audit, stock sub-pages |

## Medium (during or after first build)

| # | Change | Severity |
|---|--------|----------|
| 11 | Standardize mobile modal pattern (bottom sheets) | Medium |
| 12 | Lazy-load `xlsx` import parser | Medium |
| 13 | Reduce 12s polling aggressiveness | Medium |
| 14 | Savings allocation input on staff Today (if required by business) | Medium |
| 15 | Owner close-day workspace mobile simplification | Medium |

---

# Recommended Capacitor Architecture

## Keep unchanged

- Next.js deployment on Vercel as authoritative backend + web app
- PostgreSQL/Neon database (no direct mobile DB access)
- All 53 API routes with existing auth/RBAC/branch isolation
- Cookie session model (for Remote WebView path)
- Prisma schema and business logic
- Branch codes and production data
- Financial calculations and closing workflows

## Phase 2 integration approach

```
┌─────────────────────────────────────┐
│  Capacitor Native Shell (iOS/Android) │
│  ┌───────────────────────────────┐  │
│  │  WKWebView / Android WebView   │  │
│  │  loads https://sonic-os.app     │  │
│  │  (same origin → cookies work)   │  │
│  └───────────────────────────────┘  │
│  Optional plugins: StatusBar, Splash, │
│  Network, App lifecycle               │
└─────────────────────────────────────┘
              │
              ▼ HTTPS
┌─────────────────────────────────────┐
│  Vercel: Next.js Sonic OS           │
│  app/api/* → Prisma → Neon          │
└─────────────────────────────────────┘
```

## UI strategy

- **Share existing UI** for staff workflows (already mobile-oriented)
- **Create mobile-specific navigation** for owner (More drawer, reduced primary tabs)
- **Create mobile-specific components** only where needed: account menu, admin list views, native dialogs
- **Do NOT rebuild** from scratch

## If split shell is required later

Add incrementally (not Phase 2 first):
1. `NEXT_PUBLIC_API_URL` in `lib/api/client.ts`
2. CORS on API routes
3. Bearer token auth path alongside cookies
4. CSRF exemption or mobile client token for Capacitor origin

---

# Proposed Phase 2 Roadmap

| Step | Task | Outcome |
|------|------|---------|
| 2.1 | Architecture sign-off: Remote WebView | Decision documented |
| 2.2 | Fix Critical UI gaps (movie revenue, owner nav, mobile menu) | Staff/owner usable on phone |
| 2.3 | Cookie auth WebView validation (iOS + Android against staging) | Auth proof |
| 2.4 | `npx cap init` + `server.url` config + icons/splash | Empty native projects |
| 2.5 | StatusBar, SplashScreen, Network plugins | Native polish |
| 2.6 | TestFlight / internal APK distribution | First mobile build |
| 2.7 | Staff workflow regression on device | Go/no-go |
| 2.8 | App Store / Play Store submission prep | Phase 2 exit |

**Phase 3 (later):** Push notifications, camera receipts, offline read cache, biometric unlock, reduced polling.

---

# Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| WebView cookie loss on iOS | High | Test early on real devices; document cookie policy |
| CSRF blocks if origin mismatch | High | Use same-origin Remote WebView only |
| Staff cannot record movie revenue today | Critical | Fix before mobile launch |
| Owner nav unusable on phone | Critical | Redesign nav before owner mobile |
| Production build failure (`_global-error` prerender) | Medium | Fix on main independently; may affect deployment pipeline |
| 12s polling drains battery | Medium | Tune after first mobile release |
| App Store review of WebView-only app | Low–Medium | Ensure native shell adds value (icons, splash, network handling) |
| Sensitive financial data in WebView | Medium | Device security policy; no token in localStorage |

---

# What We Should NOT Change

- Production database or branch configuration
- Authentication security model (without explicit Phase 2 design)
- Prisma schema or migrations
- Financial calculations, business-day rules, closing logic
- Branch isolation or authorization boundaries
- Vercel production deployment topology (for Path A)
- Destructive ops guards (`ALLOW_DESTRUCTIVE_OPS`)
- Environment secrets or expose `SESSION_SECRET` to client

---

# Final Recommendation

**Is Sonic OS ready for Capacitor?**  
**Partially.** The codebase is architecturally compatible with Capacitor as a **remote WebView shell** loading the existing deployed application. It is **not ready** for a split native shell + separate API host without auth/CORS/CSRF redesign. UI is **~75% staff-ready** and **~50% owner-ready**.

**What must be fixed first?**
1. Validate cookie session in iOS/Android WebView (blocking technical proof)
2. Restore movie revenue input on Staff Today (blocking staff workflow)
3. Redesign owner bottom navigation (blocking owner mobile)
4. Add mobile sign-out/lock menu

**What can remain unchanged?**
- Entire backend, API routes, database, auth model (for WebView path)
- Staff Today layout structure, bottom nav pattern, most module workspaces
- Branch isolation, RBAC, CSRF (same-origin)

**Biggest mobile risks:**
1. WebView cookie/`Secure`/`SameSite` behavior on real devices
2. Staff movie revenue gap on primary daily screen
3. Owner 11-tab bottom nav overflow
4. No offline fallback (network required for all business operations)

**Recommended next step:**  
Approve **Remote WebView architecture**, fix the three Critical UI items on web first (they benefit mobile and desktop), then run a **staging WebView cookie proof** on one iOS and one Android device before `cap init`.

---

# Testing (Audit Run)

| Check | Result |
|-------|--------|
| TypeScript (`npx tsc --noEmit`) | **PASS** |
| Production build (`npm run build`) | **FAIL** — pre-existing `_global-error` prerender `useContext` error on `main` |
| Capacitor install | **NOT RUN** (audit constraint) |
| Device WebView cookie test | **NOT RUN** (requires Capacitor + devices) |
| Branch isolation tests | **NOT RUN** (not required for audit) |
| Production database access | **NOT RUN** (not applicable) |

---

# Appendix: Key File Reference

| Area | Files |
|------|-------|
| API client | `lib/api/client.ts` |
| Session/cookies | `lib/server/session.ts`, `lib/server/security/cookies.ts` |
| CSRF | `lib/server/security/csrf.ts` |
| Route handler | `lib/server/route-handler.ts` |
| Auth context | `context/auth-context.tsx` |
| App shell | `components/shared/layout/app-shell.tsx` |
| Bottom nav | `components/shared/layout/bottom-nav.tsx` |
| Staff Today | `components/operations/staff/staff-operations-workspace.tsx` |
| Movie revenue (owner) | `components/operations/operations-closing-panel.tsx` |
| Movie revenue (staff display) | `components/operations/staff/staff-revenue-card.tsx` |
| Polling | `hooks/use-staff-operations-refresh.ts` |
| Safe storage | `lib/safe-storage.ts` |
| Next config | `next.config.ts` |

---

*Audit performed read-only. No Capacitor packages installed. No production code, database, authentication, or deployment configuration modified.*
