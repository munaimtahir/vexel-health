# Status Truth Table (Expected vs Actual)

Date: 2026-02-19

## A) Canonical Expected Model (Governance)
From governance docs (`governance/Workflow.md`, `governance/DataModel.md`):
- `Order.status`: `DRAFT -> ENTERED -> VERIFIED -> PUBLISHED` (optional sample path includes `PAID/COLLECTED/RECEIVED`)
- `Sample.status`: distinct sample lifecycle (collect/receive)
- `Result.status` / `OrderItem.status`: `ENTERED -> VERIFIED`
- `Report` publish lifecycle as document-level event

## B) Actual Implemented Model (Code)
- Encounter workflow only:
  - `Encounter.status`: `CREATED -> PREP -> IN_PROGRESS -> FINALIZED -> DOCUMENTED` (`packages/contracts/openapi.yaml:648`, `apps/api/prisma/schema.prisma:154`)
- Document workflow:
  - `Document.status`: `QUEUED -> RENDERED|FAILED` (`apps/api/prisma/schema.prisma:422`)
- No separate order/sample/result/report state columns/tables.

## C) Status Read Paths (UI)

| Expected screen | Expected status source | Actual code path | Actual source used | Result |
|---|---|---|---|---|
| Orders list/detail | `Order.status` | No `/orders` route exists (`apps/web/app/*`) | N/A | Missing |
| Samples list/worklist | `Sample.status` | No `/samples` route exists | N/A | Missing |
| Result entry worklist | `OrderItem/TestResult.status` | `apps/web/app/encounters/[encounterId]/page.tsx:1442` | Gate by `encounter.status === 'IN_PROGRESS'` | Diverged |
| Verification queue | `Result/OrderItem verify status` | No `/verification` route exists | N/A | Missing |
| Reports page | `Report.status` or document status by report entity | No dedicated `/reports` route; only encounter detail document panel (`apps/web/app/encounters/[encounterId]/page.tsx:1743`) | `documentMeta.status` and `encounter.status` | Partial |

Additional display reads:
- Encounter status display: `apps/web/app/encounters/[encounterId]/page.tsx:1028`
- Encounter form gating by status:
  - Prep form only when `status === 'PREP'` (`apps/web/app/encounters/[encounterId]/page.tsx:1060`)
  - Main form only when `status === 'IN_PROGRESS'` (`apps/web/app/encounters/[encounterId]/page.tsx:1442`)
  - Document panel only when `status in {'FINALIZED','DOCUMENTED'}` (`apps/web/app/encounters/[encounterId]/page.tsx:1743`)

## D) Status Write Paths (Expected commands vs actual)

| Expected command | Expected write target | Actual endpoint(s) | Actual write target | Exact write location | Outcome |
|---|---|---|---|---|---|
| `order create` | `Order.status = DRAFT` | `POST /encounters` | `Encounter.status = CREATED` | `apps/api/src/encounters/encounters.service.ts:118` | Diverged model |
| `sample partial_update` | `Sample.status` | `POST /encounters/{id}:start-prep`, `POST /encounters/{id}:save-prep` | `Encounter.status` + prep row upsert | `apps/api/src/encounters/encounters.service.ts:757`, `apps/api/src/encounters/encounters.service.ts:212` | Collapsed into encounter/prep |
| `results bulk_entry` | `Result/OrderItem.status = ENTERED` | `POST /encounters/{id}:save-main` | Main row upsert only | `apps/api/src/encounters/encounters.service.ts:452` | No result status column |
| `verify / bulk verify / reject` | `Result/OrderItem.status` transitions | `POST /encounters/{id}:finalize` | `Encounter.status = FINALIZED` | `apps/api/src/encounters/encounters.service.ts:688` | Verify collapsed into finalize |
| `publish-report` | `Report.status = PUBLISHED` + doc artifact | `POST /encounters/{id}:document` + worker job | `Document.status`, `Encounter.status` | `apps/api/src/documents/documents.service.ts:130`, `apps/worker/src/index.ts:185`, `apps/worker/src/index.ts:223` | Report entity absent |

## E) Single Source of Truth Assessment
### Does a single SoT exist?
- Partially:
  - Encounter lifecycle SoT: `Encounter.status`.
  - Document render SoT: `Document.status`.
- Not for expected LIMS semantics:
  - No independent SoT for order/sample/result/report statuses.
  - No unified recompute function across phase data + publish state.

### Where aggregation is missing / fragmented
- Encounter transitions split across multiple code paths:
  - Generic transition helper: `apps/api/src/encounters/encounters.service.ts:721`
  - Direct transition in `startMain`: `apps/api/src/encounters/encounters.service.ts:407`
  - Direct transition in `finalize`: `apps/api/src/encounters/encounters.service.ts:688`
  - Worker-side transition after render: `apps/worker/src/index.ts:223`
- Result verify fields (`verifiedBy`, `verifiedAt`) are data fields only, not status drivers:
  - Write path: `apps/api/src/encounters/encounters.service.ts:963`
  - UI entry path: `apps/web/app/encounters/[encounterId]/page.tsx:316`

## F) Truth Snapshot from Runtime Proof
From `_audit_evidence/workflow_audit/e2e_status_snapshots.jsonl`:
- `after_create_encounter`: `Encounter.status=CREATED`
- `after_start_prep`: `Encounter.status=PREP`
- `after_collect_receive_sample`: `Encounter.status=PREP`
- `after_start_main`: `Encounter.status=IN_PROGRESS`
- `after_enter_result`: `Encounter.status=IN_PROGRESS`
- `after_finalize_verify`: `Encounter.status=FINALIZED`
- `after_publish_render_download`: `Encounter.status=DOCUMENTED`, `Document.status=RENDERED`

Conclusion: runtime behavior is internally consistent for encounter/document statuses, but inconsistent with expected LIMS order/sample/result/report status model.
