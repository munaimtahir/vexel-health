# Next.js App Router Architecture Audit

**Date:** 2026-02-19  
**Scope:** `apps/web` (Next.js frontend only; no backend changes)  
**Purpose:** Confirm App Router discipline, detect hybrid/legacy drift, and establish guardrails.

---

## 1) Resolved Next.js version (evidence)

| Source | Location | Value |
|--------|----------|--------|
| Web app dependency | `apps/web/package.json` | `"next": "16.1.6"` |
| Lockfile (resolved) | `package-lock.json` (apps/web node) | `"next": "16.1.6"` |
| React | `apps/web/package.json` | `"react": "^19.0.0"`, `"react-dom": "^19.0.0"` |

**Conclusion:** Next.js **16.1.6** with React 19. No version drift between package.json and lockfile.

---

## 2) Router mode classification

**Classification: App Router only**

| Check | Result |
|-------|--------|
| Source `app/` directory | Present: `apps/web/app/` with `layout.tsx`, route segments, and pages |
| Source `pages/` directory | **Not present** (only `.next/server/pages` exists as build output) |
| Pages API | None (`pages/api` does not exist) |
| App API route handlers | None (`app/api/**/route.ts` not present; backend is separate NestJS API) |

The web app uses the **App Router exclusively**. There is no hybrid or Pages Router usage in source.

---

## 3) Findings (with file paths)

### 3.1 Legacy APIs

| Pattern | Found | Notes |
|---------|-------|--------|
| `getServerSideProps` | No | — |
| `getStaticProps` | No | — |
| `getInitialProps` | No | — |
| `next/router` (legacy) | No | — |
| `pages/api` | No | — |
| `_app.tsx` / `_document.tsx` | No | — |
| `next/head` | No | Root layout uses `metadata` (App Router). |

**Conclusion:** No legacy data-fetching or legacy router usage.

### 3.2 Routing APIs (correct usage)

All `useRouter` / navigation usage is from **`next/navigation`** (App Router):

- `apps/web/app/operator/register/page.tsx` — `import { useRouter } from 'next/navigation'`
- `apps/web/app/auth/login/page.tsx` — `import { useRouter, useSearchParams } from 'next/navigation'`
- `apps/web/components/auth/AuthGuard.tsx` — `import { useRouter, usePathname } from 'next/navigation'`
- `apps/web/app/patients/register/page.tsx` — `import { useRouter } from 'next/navigation'`
- `apps/web/app/encounters/new/page.tsx` — `import { useRouter, useSearchParams } from 'next/navigation'`
- `apps/web/app/page.tsx` — `import { useRouter } from 'next/navigation'`

No `next/router` imports.

### 3.3 App Router structure

| Item | Status | Path |
|------|--------|------|
| Root layout | Present | `apps/web/app/layout.tsx` (uses `Metadata`, `ConditionalAuth`) |
| Operator layout | Present | `apps/web/app/operator/layout.tsx` |
| Admin layout | Present | `apps/web/app/admin/layout.tsx` (delegates to `AdminLayoutShell`) |
| Route handlers | N/A | No `app/api/**/route.ts` (API is external) |

Segment layouts are in place for `/operator` and `/admin`.

### 3.4 Auth and layout boundaries

- **Root:** `app/layout.tsx` wraps children with `ConditionalAuth`, which allows public paths (`/`, `/auth/login`, `/auth/*`) and wraps all other routes in `AuthGuard`.
- **Admin:** `app/admin/layout.tsx` → `AdminLayoutShell` (client) uses `AuthGuard` and `/me` via SDK; auth is at layout boundary.
- **Operator:** `app/operator/layout.tsx` does not duplicate auth; protection is inherited from root `ConditionalAuth` + `AuthGuard`.

No auth bypass identified; layout-level guards are consistent.

### 3.5 Tenant isolation and URL safety

| Finding | Location | Risk / Note |
|--------|----------|-------------|
| Tenant in URL params | None | No `tenant_id` or `tenantId` in route or search params. |
| Tenant in query string | None | `useSearchParams` used only for `returnUrl` and `patientId` (e.g. `encounters/new?patientId=...`). |
| Tenant in headers only | `apps/web/lib/api.ts` | Tenant sent as `x-tenant-id` only when `NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED === '1'`, value from `localStorage` (dev-only). |
| Login form tenantId | `apps/web/app/auth/login/page.tsx` | Optional form field for **dev only** (when dev header enabled); stored in localStorage, not in URL. |
| Admin “Tenant ID” display | `apps/web/app/admin/business/page.tsx` | Display of `meData?.tenantId` for authenticated admin; not in URL. |

**Conclusion:** Tenant context is not exposed via URL. Dev-only tenant header and login field are acceptable with env guard; no change required for this audit.

### 3.6 Contract-first API consumption

- API access goes through `@vexel/contracts` via `createVexelClient` in `apps/web/lib/api.ts`.
- UI and layout code use `client` from `@/lib/api` or `@/lib/sdk/client` (re-export); no raw `fetch()` to backend endpoints found in app/components.

**Conclusion:** Contract-first usage is consistent.

### 3.7 Hybrid / mixed-mode hazards

- No source `pages/` directory; no overlap between App and Pages routes.
- No custom server or rewrites in `next.config.ts` that route around Next.

**Conclusion:** No hybrid or custom-server hazards.

---

## 4) Recommendations

### 4.1 Safe now (no behavior change)

- Add **permanent rules** to the repo (e.g. in `governance/Architecture.md`) under “Next.js App Router Discipline (Permanent Rules)”.
- Add a **guardrail script** that fails if:
  - `apps/web/pages` exists (source),
  - or forbidden patterns are present: `next/router`, `getServerSideProps`, `getStaticProps`, `getInitialProps`, `pages/api`.
- Wire the script into CI or `package.json` as `npm run guardrails:next`.

### 4.2 Migration required

- **None.** The app is already App Router–only with no legacy patterns. No migration steps are required.

### 4.3 Optional hardening

- Consider adding Next.js middleware for auth/tenant checks if you want a single place to enforce redirects before layout render (current client-side `ConditionalAuth` + `AuthGuard` is acceptable).
- Keep dev-only tenant (localStorage + header) behind `NEXT_PUBLIC_TENANCY_DEV_HEADER_ENABLED` and document in deployment guide.

---

## 5) Definition of Done (checklist)

- [x] Audit report exists with evidence and fix plan (this document).
- [x] Permanent rules section added to one doc (`governance/Architecture.md`).
- [x] Guardrail script exists and runs (`npm run guardrails:next`).
- [x] `/pages` in source: does not exist; no removal or migration plan needed.
- [ ] CI (or pre-commit) runs the guardrail script so regressions fail the build (optional; add to GitHub Actions or similar when desired).

---

## 6) Fix plan summary

| Action | Target | Notes |
|--------|--------|-------|
| Add permanent rules | One of: `governance/Architecture.md` / `CONTRIBUTING.md` / Platform-Constitution | Single section “Next.js App Router Discipline (Permanent Rules)”. |
| Add guardrail script | `scripts/guardrails/check-next-router.mjs` | Fail if `apps/web/pages` exists or forbidden patterns in `apps/web` (scans only `*.ts`/`*.tsx`/`*.js`/`*.jsx`/`*.mjs`; excludes `node_modules` and `.next`). |
| Wire script | Root `package.json` | Add script `"guardrails:next": "node scripts/guardrails/check-next-router.mjs"`. |
| (Optional) CI | GitHub Actions / similar | Run `npm run guardrails:next` in frontend or full build job. |

No file removals or refactors required; only additive guardrails and documentation.
