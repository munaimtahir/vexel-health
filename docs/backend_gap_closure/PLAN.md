# Backend Gap Closure Plan
Date: 2026-02-19

## Scope baseline
Authoritative inputs:
- `docs/frontend_inventory/ROUTES.md`
- `docs/frontend_inventory/NAV_LINKS.md`
- `docs/frontend_inventory/API_USAGE.md`
- `docs/frontend_inventory/GAPS_FOR_BACKEND.md`
- `docs/frontend_inventory/SUMMARY.md`

## Locked decisions
1. Parameters are **tenant-scoped** (`lab_test_parameters.tenant_id`), not global.
2. Panels are **tenant-scoped**.
3. Catalog import execution model is **job-recorded deterministic processing** with synchronous inline processing for MVP (still persisted as jobs).
4. Invite model is **email-based** with statuses: `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`, and `expires_at`.

## Gap closure matrix

| UI route / flow | Required backend endpoint(s) | Action |
|---|---|---|
| `/admin` dashboard | `GET /admin/overview` | Extend counts (`users`, `panels`, `pending imports`, verification queue) while preserving existing fields. |
| `/admin/users` | `GET /admin/users` | Add tenant-scoped list with `page`, `limit`, `query`. |
| `/admin/users/invite` | `POST /admin/users/invite` | Add invite creation with deterministic pending invite behavior. |
| `/admin/users/{userId}` | `GET /admin/users/{userId}`, `PATCH /admin/users/{userId}` | Add detail + activate/deactivate + role mapping update. |
| `/admin/catalog/panels` | `GET /lab/panels`, `POST /lab/panels` | Add panel list/create. |
| `/admin/catalog/panels/{panelId}` | `GET /lab/panels/{panelId}`, `PATCH /lab/panels/{panelId}`, `POST /lab/panels/{panelId}:add-test`, `POST /lab/panels/{panelId}:remove-test` | Add panel detail/update + deterministic panel composition ordering. |
| `/admin/catalog/parameters/{parameterId}` | `GET /lab/parameters/{parameterId}` | Add parameter detail endpoint. |
| `/admin/catalog/linking` | `GET /lab/linking/state`, `POST /lab/linking:link-test-parameter`, `POST /lab/linking:unlink-test-parameter`, `GET /lab/tests/{testId}/reference-ranges`, `POST /lab/tests/{testId}:upsert-reference-range` | Add explicit linking/resources commands with idempotent behavior and audit events. |
| `/admin/catalog/import-export` | `POST /lab/catalog-imports`, `GET /lab/catalog-imports`, `GET /lab/catalog-imports/{jobId}`, `POST /lab/catalog-exports`, `GET /lab/catalog-exports`, `GET /lab/catalog-exports/{jobId}/file` | Add deterministic import/export jobs + history + file retrieval + row-level error details. |
| `/admin/business/branding` | `GET/PUT /admin/business/branding` | Add tenant-scoped branding config (typed fields + version metadata). |
| `/admin/business/report-design` | `GET/PUT /admin/business/report-design` | Add tenant-scoped typed report design config. |
| `/admin/business/receipt-design` | `GET/PUT /admin/business/receipt-design` | Add tenant-scoped typed receipt design config. |

## OpenAPI-first changes
- Add tags: `AdminUsers`, `CatalogPanels`, `CatalogImportExport`, `BusinessConfig`, `Linking`.
- Add schemas:
  - `UserAdmin`, `ListAdminUsersResponse`, `InviteRequest`, `InviteResponse`, `UpdateAdminUserRequest`
  - `Panel`, `PanelTest`, `PanelCreateRequest`, `PanelUpdateRequest`, `PanelAddTestRequest`, `PanelRemoveTestRequest`
  - `ParameterDetail`
  - `ReferenceRange`, `ListReferenceRangesResponse`, `UpsertReferenceRangeRequest`
  - `LinkingState`, `LinkTestParameterRequest`, `UnlinkTestParameterRequest`
  - `CatalogImportJob`, `CatalogExportJob`, related list/detail responses
  - `BusinessBrandingConfig`, `ReportDesignConfig`, `ReceiptDesignConfig`
- Standardize error envelopes:
  - `validation_error` with `field_errors`
  - `domain_error` with `code`, `message`, optional `details`

## Backend implementation plan
1. Prisma schema + migration:
   - `lab_panels`, `lab_panel_tests`
   - `lab_reference_ranges`
   - `admin_user_invites`
   - `catalog_import_jobs`, `catalog_export_jobs`
   - `tenant_business_branding_configs`, `tenant_report_design_configs`, `tenant_receipt_design_configs`
2. API controllers/services:
   - Extend `AdminController/AdminService` and add admin user + business config controllers/services.
   - Extend `LabCatalogController/LabCatalogService` and add panel/linking/import-export handlers.
3. Audit:
   - Write tenant-scoped `audit_events` for invite, linking, panel composition, and business config updates.
4. Contracts:
   - Regenerate `packages/contracts/src/schema.ts` from updated OpenAPI.

## Test plan
- Unit tests:
  - Admin user tenancy read/write isolation
  - Panel composition deterministic ordering
  - Linking idempotency
- E2E smoke:
  - `/admin/overview` -> `/admin/users` -> invite -> create panel -> create import job -> list jobs
- Tenant isolation checks for all new endpoints.

## Deliverables
- `docs/backend_gap_closure/REPORT.md` with:
  - Added endpoints
  - UI route -> backend mapping
  - curl examples
  - test/lint/contract generation results
