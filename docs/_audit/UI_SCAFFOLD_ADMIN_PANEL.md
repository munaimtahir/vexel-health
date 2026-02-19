# Admin Panel UI Scaffold — Audit

**Date:** 2026-02-19  
**Scope:** Admin UI scaffold (pages, navigation, placeholder components, minimal wiring). No deep business logic.

---

## 1. Routes Created

| Route | Purpose |
|-------|--------|
| `/admin` | Dashboard: verification queue, published 24h, catalog coverage, PDF health, feature flags |
| `/admin/business` | Business overview: tenant profile + branding summary |
| `/admin/business/branding` | Per-tenant branding: lab name, address, phone, header lines, logo/header/footer asset placeholders + Preview panel |
| `/admin/users` | Users list (tenant-scoped; placeholder when no users endpoint) |
| `/admin/users/invite` | Invite/create user scaffold + role selector + permissions matrix placeholder |
| `/admin/users/[userId]` | User detail: roles/permissions placeholder, deactivate, role mapping |
| `/admin/catalog` | Catalog overview: tests/parameters/panels counts, links to sub-areas |
| `/admin/catalog/tests` | Tests list (`GET /lab/tests`) |
| `/admin/catalog/tests/[testId]` | Test detail + parameters table + tab strip placeholder |
| `/admin/catalog/parameters` | Parameters list (test-scoped via `GET /lab/tests/{testId}/parameters` until global endpoint exists) |
| `/admin/catalog/parameters/[parameterId]` | Parameter detail scaffold |
| `/admin/catalog/panels` | Panels list scaffold |
| `/admin/catalog/panels/[panelId]` | Panel detail scaffold |
| `/admin/catalog/linking` | Linking workflow scaffold: steps + placeholder selectors (tests ↔ parameters ↔ reference ranges) |
| `/admin/catalog/import-export` | XLSX import/export entry + history table placeholder |

---

## 2. Components Created

| Component | Location | Purpose |
|-----------|----------|--------|
| `AdminLayoutShell` | `components/admin/AdminLayoutShell.tsx` | Auth guard, sidebar + header, tenant-scoped label, `/me` display |
| `AdminNav` | `components/admin/AdminNav.tsx` | Left sidebar: Dashboard, Business (Overview, Branding), Users (List, Invite), Catalog (Overview, Tests, Parameters, Panels, Linking, Import/Export) |
| `PageHeader` | `components/admin/PageHeader.tsx` | Title, subtitle, actions slot |
| `AdminCard` | `components/admin/AdminCard.tsx` | Surface card with optional title/subtitle/headerAction, rounded-2xl, border, shadow |
| `DataTableShell` | `components/admin/DataTableShell.tsx` | Wraps AdminCard; toolbar slot, table slot, empty state |
| `FieldRow` | `components/admin/FieldRow.tsx` | Label + value row (dl/dt/dd) |
| `StatusPill` | `components/admin/StatusPill.tsx` | Status badge (active, inactive, pending, failed, etc.) |
| `FeatureGate` | `components/admin/FeatureGate.tsx` | Stub: wrap-ready for backend feature flags; no real flags yet |
| `NoticeBanner` | `components/admin/NoticeBanner.tsx` | Info/warning banner for “endpoint missing” or errors |
| `SectionTitle` | `components/admin/SectionTitle.tsx` | Section heading + optional subtitle |
| `Divider` | `components/admin/Divider.tsx` | Horizontal rule using theme border |

---

## 3. SDK Endpoints Found / Used

- **Used (contract exists):**
  - `GET /me` — current user (tenant context)
  - `GET /me/features` — feature flags for current user
  - `GET /admin/overview` — dashboard counts, catalog summary, PDF health, features
  - `GET /lab/tests` — list lab tests
  - `GET /lab/tests/{testId}` — test detail
  - `GET /lab/tests/{testId}/parameters` — parameters for a test

- **Not in contract (UI shows NoticeBanner / placeholder):**
  - Tenant branding CRUD or asset upload
  - `GET /admin/users`, `POST /admin/users/invite`, user deactivate, user detail by ID
  - Global parameter list/detail by parameter ID
  - Panel list/detail/create
  - Linking workflow APIs
  - Import/export submission and history

---

## 4. Theme & Layout

- **Tokens:** `lib/theme/tokens.css` — `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--accent-foreground`. Dark mode ready via `[data-theme='dark']` and `prefers-color-scheme: dark`.
- **useTheme:** `lib/theme/useTheme.ts` — optional stub for future theme toggle.
- **Globals:** `app/globals.css` imports tokens and sets `--background` / `--foreground` and font (Inter/system).

---

## 5. Auth & Security

- **Auth guard:** `/admin` layout uses `AdminLayoutShell` → `AuthGuard` (token in `localStorage`; redirect to `/auth/login?returnUrl=...` if missing).
- **Tenant:** No `tenant_id` in URL params; tenant from authenticated context (e.g. header) only.
- **PII:** Admin UI does not log PHI/PII; use NoticeBanner for user-facing errors only.

---

## 6. TODO List — Backend Contract Endpoints Needed

- [ ] **Branding:** Tenant branding read/write and asset upload (e.g. `GET/PUT /admin/branding`, asset upload endpoint).
- [ ] **Users:** `GET /admin/users`, `POST /admin/users/invite`, `GET /admin/users/{userId}`, deactivate, role assignment.
- [ ] **Parameters:** Global parameter list and detail by parameter ID (e.g. `GET /lab/parameters`, `GET /lab/parameters/{parameterId}`) if desired beyond test-scoped parameters.
- [ ] **Panels:** Panel CRUD (list, create, get, update, archive).
- [ ] **Linking:** Endpoints for linking tests ↔ parameters ↔ reference ranges (or document as workflow-only and keep UI as scaffold).
- [ ] **Import/Export:** Submit import job, list export/import history (e.g. `POST /admin/catalog/import`, `GET /admin/catalog/import-export/history`).

---

## 7. Quality Gates (Verified)

- TypeScript: types from `@vexel/contracts` only; no ad-hoc payloads. `npx tsc --noEmit` passes for `apps/web`.
- No `fetch()`; all API access via SDK client from `lib/sdk/client.ts` (re-exports `lib/api.ts` createVexelClient with auth middleware).
- Lint: web workspace has lint skipped; admin code does not introduce new lint/TS errors.
- Routes render without crash when data is empty or endpoint missing (NoticeBanner + empty states).

---

## 8. TODO Checklist (Scaffold Completion)

| Done | Item |
|------|------|
| ✅ | Admin layout root `/admin` with AuthGuard |
| ✅ | Theme tokens (--bg, --surface, --border, --text, --muted, --accent) + dark-ready |
| ✅ | AdminNav sidebar with Dashboard, Business, Users, Catalog sections |
| ✅ | PageHeader, AdminCard, DataTableShell, FieldRow, StatusPill, FeatureGate, NoticeBanner, SectionTitle, Divider |
| ✅ | Business overview + Branding pages (local state + Preview placeholder) |
| ✅ | Users list, Invite, User detail (placeholders + /me where no users API) |
| ✅ | Catalog overview, Tests list/detail, Parameters list/detail, Panels list/detail, Linking, Import/Export |
| ✅ | SDK-only usage; NoticeBanner where endpoints missing |
| ✅ | docs/_audit/UI_SCAFFOLD_ADMIN_PANEL.md |
| ⏳ | Backend: branding, users, panels, linking, import/export endpoints (see §6 above) |
| ⏳ | FeatureGate: wire to real /me/features when ready |
| ⏳ | PDF/Report preview in Branding page (placeholder only for now) |
