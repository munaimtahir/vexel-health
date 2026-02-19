# MVP LIMS UI Gap Audit

**Date:** 2026-02-19  
**Scope:** Full vertical slice — Patient → Encounter → Order → Payment → Results → Verification → Publish PDF, plus basic Admin.

---

## 1. Repo structure (relevant folders)

| Folder | Purpose |
|--------|--------|
| `apps/api` | NestJS API (`src/`, `test/`, `prisma/`) |
| `apps/web` | Next.js frontend (`app/`, `components/`, `lib/`) |
| `apps/pdf` | .NET + deterministic PDF renderer (`Program.cs`, `/health`, `/render`) |
| `packages/contracts` | OpenAPI `openapi.yaml` + generated `src/schema.ts` (openapi-typescript) |

---

## 2. Data model (important for “Order” vs “Encounter”)

- **Encounter** is the workflow container: `Patient` → `Encounter` (type e.g. `LAB`), status: `CREATED` → `PREP` → `IN_PROGRESS` → `FINALIZED` → `DOCUMENTED`.
- **Order** in LIMS = **Encounter + its Lab Order Items**. There is no separate `Order` aggregate; each test is a `LabOrderItem` (encounterId + testId), with status `ORDERED` → `RESULTS_ENTERED` → `VERIFIED`.
- **Payment**: Schema has `Invoice` (patientId, optional encounterId) and `Payment` (invoiceId, amount, method, reference). **No API or UI exists for creating invoices or recording payments.**

So the MVP “Order” flow is **encounter-centric**: one LAB encounter with one or more tests (e.g. Albumin); payment would be “record payment for this encounter” (invoice + payment) and is currently **missing**.

---

## 3. API endpoints (existing)

### 3.1 Implemented in NestJS

| Method | Path (logical) | Controller | Purpose |
|--------|----------------|------------|--------|
| GET | `/health` | app.controller | Health check |
| POST | `/auth/login` | auth.controller | Login |
| GET | `/me` | me.controller | Current user |
| GET | `/me/features` | me.controller | Feature flags for user |
| POST/GET | `/patients` | patients.controller | Create, list patients |
| GET | `/patients/:id` | patients.controller | Get patient |
| POST/GET | `/encounters` | encounters.controller | Create, list encounters |
| GET | `/encounters/:id` | encounters.controller | Get encounter |
| GET | `/encounters/:id/prep` | encounters.controller | Get prep data |
| GET | `/encounters/:id/main` | encounters.controller | Get main data |
| POST | `/encounters/:id:start-prep` | encounters.controller | Start prep |
| POST | `/encounters/:id:save-prep` | encounters.controller | Save prep |
| POST | `/encounters/:id:save-main` | encounters.controller | Save main |
| POST | `/encounters/:id:start-main` | encounters.controller | Start main |
| POST | `/encounters/:id:finalize` | encounters.controller | Finalize encounter |
| POST | `/encounters/:id:document` | encounters.controller | Generate/publish document (generic) |
| POST | `/encounters/:id:lab-add-test` | lab-workflow.controller | Add catalog test → creates LabOrderItem |
| GET | `/encounters/:id/lab-tests` | lab-workflow.controller | List ordered tests + results |
| POST | `/encounters/:id:lab-enter-results` | lab-workflow.controller | Enter results for order item |
| POST | `/encounters/:id:lab-verify` | lab-workflow.controller | Verify order item |
| POST | `/encounters/:id:lab-publish` | lab-workflow.controller | Publish LAB report (PDF) |
| GET/POST | `/lab/tests` | lab-catalog.controller | List/create lab test definitions |
| GET | `/lab/tests/:testId` | lab-catalog.controller | Get test |
| POST/GET | `/lab/tests/:testId/parameters` | lab-catalog.controller | Add/list parameters |
| GET | `/documents/:documentId` | documents.controller | Document metadata |
| GET | `/documents/:documentId/file` | documents.controller | PDF bytes |

**Not implemented:**

- Any **invoice** or **payment** endpoint (no `POST /invoices`, `POST /payments` or encounter-scoped payment).
- **Verification queue**: no endpoint to list “items pending verification” (e.g. lab order items in `RESULTS_ENTERED` for the tenant).
- **Admin overview**: no `GET /admin/overview` (counts, flags, PDF health, catalog status).

---

## 4. OpenAPI contract (`packages/contracts/openapi.yaml`)

### 4.1 Paths present in OpenAPI

- `/health`, `/auth/login`, `/me`, `/me/features`
- `/patients`, `/patients/{id}`
- `/encounters`, `/encounters/{id}`, `/encounters/{id}/prep`, `/encounters/{id}/main`
- `/encounters/{id}:start-prep`, `:save-prep`, `:save-main`, `:start-main`, `:finalize`, `:document`
- `/encounters/{id}:lab-add-test`, `/encounters/{id}/lab-tests`, `/encounters/{id}:lab-enter-results`, `:lab-verify`, `:lab-publish`
- `/lab/tests`, `/lab/tests/{testId}`, `/lab/tests/{testId}/parameters`
- `/documents/{documentId}`, `/documents/{documentId}/file`

### 4.2 Paths missing from OpenAPI

- **Payments:** e.g. `POST /encounters/{encounterId}/payments` or `POST /invoices/{id}/payments` (and possibly create invoice for encounter).
- **Verification queue:** `GET /verification/queue` (or `GET /lab/verification-queue`) returning items pending verification with patient/encounter summary.
- **Admin:** `GET /admin/overview` with tenant-scoped counts (orders by status, verification queue count, last publish, PDF health, feature flags, catalog summary).

Optional (prompt suggested order-centric naming; current design is encounter-centric):

- `GET /orders` (could alias to list encounters with type=LAB and optional status filter).
- `GET /orders/{orderId}` (could alias to encounter detail; “orderId” = encounterId for LIMS).

---

## 5. SDK (generated from OpenAPI)

- **Generator:** `openapi-typescript` in `packages/contracts` (`npm run generate` → `src/schema.ts`).
- **Root script:** `npm run contracts:generate` from repo root.
- **Usage:** Web uses `createVexelClient` from `@vexel/contracts` and typed `paths` for request/response types. All **currently defined** operations (e.g. `addLabTestToEncounter`, `listEncounterLabTests`, `enterEncounterLabResults`, `verifyEncounterLabResults`, `publishEncounterLabReport`, `getDocumentById`, `getDocumentFile`) exist in the generated schema.

**Missing SDK methods (until OpenAPI is extended):** payment recording, verification queue list, admin overview.

---

## 6. Web pages (existing)

| Route | File | Purpose |
|-------|------|--------|
| `/` | `app/page.tsx` | Root |
| `/auth/login` | `app/auth/login/page.tsx` | Login |
| `/patients` | `app/patients/page.tsx` | List patients |
| `/patients/register` | `app/patients/register/page.tsx` | Register patient |
| `/patients/[patientId]` | `app/patients/[patientId]/page.tsx` | Patient detail + encounters |
| `/encounters/new` | `app/encounters/new/page.tsx` | Create encounter (patient + type) |
| `/encounters/[encounterId]` | `app/encounters/[encounterId]/page.tsx` | **Single large encounter page**: prep, main, lab add test, enter results, verify, finalize, publish LAB report, document generate/download. Uses SDK only; uses `parseApiError` for domain/validation errors. |
| `/ui-preview` | `src/app/ui-preview/page.tsx` | UI preview |

**No dedicated pages for:**

- **Payment:** No page to “record payment (500)” for an encounter/invoice.
- **Verification queue:** No `/verification` (or similar) listing items pending verification with patient/encounter.
- **Reports/PDF:** Report publish and view PDF are **on the encounter page** (lab-publish + document); no separate `/reports/[orderId]` or “view PDF” page (could be link to document file URL).
- **Admin:** No `/admin` with overview (counts, flags, PDF health, catalog).

---

## 7. Feature flags and LIMS

- **Governance:** `governance/FeatureFlags.md` — backend authoritative; frontend uses `/me/features` for UI only.
- **LIMS flag:** `module.lims` (and sub-features e.g. `lims.result_verification`). No code path was checked that **disables** LIMS when flag is off; assumption: LIMS is enabled for tenants that have it.

---

## 8. PDF and document pipeline

- **PDF service (`apps/pdf`):** `GET /health`, `POST /render` (TemplateKey, TemplateVersion, PayloadVersion, Payload). Supports `LAB_REPORT_V1` and others. Deterministic PDF built from payload.
- **API:** `DocumentsService.queueEncounterDocument()` builds payload, computes `payloadHash`, stores `Document` (payload_hash, pdf_hash after render), enqueues render job. Document metadata and file served via `GET /documents/:documentId` and `GET /documents/:documentId/file`.
- **Publish:** Lab workflow uses `POST /encounters/:id:lab-publish` which calls `queueEncounterDocument(encounterId, 'LAB_REPORT_V1')`. No direct “order” endpoint; design is encounter-centric.

---

## 9. Error handling (API → Web)

- API returns structured **validation_error** (field-level) and **domain_error** (code + message + optional details). Web `parseApiError()` in `lib/api-errors.ts` maps these to user-facing messages and field errors; encounter page uses it for all lab and document actions. So “no generic Internal Server Error for user-fixable conditions” is **partially met** where domain/validation are used; any endpoint that still returns 500 with generic body would need to be replaced with structured errors.

---

## 10. Gap summary

### 10.1 Missing endpoints (API)

| Gap | Description |
|-----|-------------|
| **Payment** | No way to create an invoice for an encounter and/or record a payment (e.g. 500). Need at least one of: create invoice for encounter + record payment, or a single “record payment for encounter” that creates invoice + payment internally. |
| **Verification queue** | No endpoint to list lab order items (or encounters) pending verification (e.g. status `RESULTS_ENTERED`) with patient/encounter summary for the current tenant. |
| **Admin overview** | No `GET /admin/overview` returning tenant-scoped: orders (or encounters) by status counts, verification queue count, last publish time, PDF service health (cached), feature flags, catalog/seed summary. |

### 10.2 Missing contract (OpenAPI)

- Payment: request/response schemas and path(s) for recording payment (and optionally creating invoice).
- Verification queue: path (e.g. `GET /verification/queue` or `GET /lab/verification-queue`) and response schema.
- Admin: `GET /admin/overview` with response schema (counts, flags, health, catalog info).

Optional: order aliases (`GET /orders`, `GET /orders/{id}`) if product wants order-centric URLs; otherwise keep encounter-centric and use encounter list/detail.

### 10.3 Missing UI (Web)

| Gap | Description |
|-----|-------------|
| **Payment step** | No page or section to “record payment” (e.g. 500) for the current encounter. Either a dedicated route (e.g. `/encounters/[id]/payment`) or a clear step on the encounter page. |
| **Verification queue** | No page listing items pending verification (e.g. `/verification`) with patient/encounter and “Verify” action. |
| **Report/PDF view** | Publish and download are on encounter page; optional separate “view report” page or stable link to `/documents/:id/file` for better UX. |
| **Admin** | No `/admin` page showing overview (counts, verification queue count, last publish, PDF health, feature flags, catalog summary) using `GET /admin/overview`. |

### 10.4 Already in place (no gap)

- Patient and encounter creation; encounter detail with lab add test, enter results, verify, finalize, lab-publish, and document generate/download.
- OpenAPI + generated SDK for all existing endpoints; web uses SDK and typed paths.
- Document pipeline: payload hash, PDF hash, storage; PDF service health exists at `/health` (can be called by API for admin overview).
- Domain/validation error handling on the web for existing encounter/lab flows.

---

## 11. Recommended mapping: “Order” in prompt vs current design

| Prompt concept | Current implementation | Note |
|----------------|------------------------|------|
| Order (Albumin) | Add test to encounter → `LabOrderItem` for Albumin | Create “order” = add test(s) to encounter. |
| Payment (500) | **Missing** | Add invoice + payment API and UI (encounter-scoped). |
| Result entry (Albumin 4.5) | `POST ...:lab-enter-results` with orderItemId + parameter values | Exists. |
| Verification | `POST ...:lab-verify` with orderItemId | Exists. |
| Publish → View PDF | `POST ...:lab-publish` → document; view via `/documents/:id/file` | Exists; optional dedicated “reports” page. |
| Admin page | **Missing** | Add `GET /admin/overview` + `/admin` page. |

End-to-end flow that works today **without payment**: Patient → Encounter → Add test (Albumin) → Enter results → Verify → Finalize → Publish → View PDF. **With payment**: add “record payment” step (and optionally enforce payment before results or finalize in business rules).

---

## 12. Next steps (for implementation)

1. **Contract (Step 1):** Extend OpenAPI with: payment (e.g. `POST /encounters/{id}/payments` or invoice+payment), `GET /verification/queue` (or `/lab/verification-queue`), `GET /admin/overview`. Optionally `GET /orders` / `GET /orders/{id}` as aliases.
2. **API (Step 2):** Implement payment, verification-queue, and admin-overview endpoints; ensure TenantGuard and feature flags where needed; structured domain/validation errors.
3. **PDF (Step 3):** Already wired; add PDF service health check (e.g. from API) and expose in admin overview.
4. **SDK + Web (Step 4):** Regenerate contracts; add Payment UI (page or encounter step), Verification queue page, Admin page; keep using SDK and `parseApiError`.
5. **E2E (Step 5):** One E2E test: login → patient + encounter → order (add Albumin) → **record payment** → enter result 4.5 → verify → finalize → publish → assert PDF and `pdf_hash` in metadata.
6. **Evidence (Step 6):** Add `docs/_audit/DEPLOY_RUNS/<timestamp>/` with audit summary, API routes, OpenAPI diff, SDK log, E2E results.

---

*End of audit.*
