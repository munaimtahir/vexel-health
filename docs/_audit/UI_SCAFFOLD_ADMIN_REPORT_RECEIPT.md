# Admin UI Scaffold - Report Design and Receipt Design

Date: 2026-02-19
Scope: Business -> Branding admin scaffold expansion only. No browser PDF rendering. No HTML-to-PDF fallback.

## Routes added

- `/admin/business/report-design`
- `/admin/business/receipt-design`

## Navigation updated

Updated Business section links in admin navigation:

- `Branding`
- `Report Design`
- `Receipt Design`

Also added quick links on Branding page header:

- `apps/web/app/admin/business/branding/page.tsx`

## Components added

- `apps/web/components/admin/design/ToggleField.tsx`
- `apps/web/components/admin/design/SelectField.tsx`
- `apps/web/components/admin/design/TextAreaField.tsx`
- `apps/web/components/admin/design/PreviewPanel.tsx`

Page scaffold usage on both new routes:

- `PageHeader`
- `AdminCard`
- `SectionTitle`
- `FieldRow`
- `NoticeBanner` (shown when endpoint missing)

## SDK endpoints found or missing

Checked generated contract in `packages/contracts/src/schema.ts`.

Missing in current OpenAPI / SDK:

- `getTenantReportDesign()`
- `updateTenantReportDesign()`
- `getTenantReceiptDesign()`
- `updateTenantReceiptDesign()`

Current UI behavior:

- Both pages keep local draft state only.
- Both pages show a backend contract notice banner.
- No ad-hoc API payloads are sent.

## Backend contract required

To enable persistence with contract-first workflow:

1. Add OpenAPI endpoints for tenant report design GET/PUT.
2. Add OpenAPI endpoints for tenant receipt design GET/PUT.
3. Regenerate contracts via `npm run contracts:generate`.
4. Replace local draft save with generated `@vexel/contracts` SDK methods.
5. Keep tenant scope from auth context only; do not accept tenant override from UI.
6. Keep rendering in deterministic backend PDF service only.

## Security and tenancy notes

- Admin routes are authenticated by `AuthGuard`.
- Admin shell now validates admin capability through contract endpoint `/admin/overview` before rendering admin content.
- No direct PDF service endpoints are exposed from these pages.
- Tenant identity is not user-editable on these routes.

## TODO checklist

- [ ] Branding integration pending?
- [ ] PDF service contract alignment pending?
- [ ] RBAC enforcement verified?
- [ ] Feature flag wrapping required?
