# E2E Run Report (Golden Path Proof)

Date: 2026-02-19  
Environment: Docker Compose local stack (`api`, `web`, `worker`, `pdf`, `postgres`, `redis`)  
Script: `_audit_evidence/workflow_audit/run_golden_path.sh`

## Important Scope Note
The requested canonical steps mention `Create Order`, sample collect/receive commands, explicit verify command, and publish-report command.  
This branch implements the closest equivalent as encounter commands:
- `POST /encounters` (order analog)
- `POST /encounters/{id}:start-prep` + `:save-prep` (sample phase)
- `POST /encounters/{id}:save-main` (result entry)
- `POST /encounters/{id}:finalize` (verify analog)
- `POST /encounters/{id}:document` (publish/report pipeline)

## Executed Flow and HTTP Proof
Source: `_audit_evidence/workflow_audit/e2e_http_requests.jsonl`

1. `POST /auth/login` -> `200` (`requestId=e2e-01-login`)
2. `POST /patients` -> `201` (`requestId=e2e-02-register-patient`)
3. `POST /encounters` -> `201` (`requestId=e2e-03-create-encounter`)
4. `POST /encounters/{id}:start-prep` -> `200` (`requestId=e2e-04-start-prep`)
5. `POST /encounters/{id}:save-prep` (specimen + collectedAt + receivedAt) -> `200` (`requestId=e2e-05-save-prep`)
6. `POST /encounters/{id}:start-main` -> `200` (`requestId=e2e-06-start-main`)
7. `POST /encounters/{id}:save-main` (Albumin 4.5) -> `200` (`requestId=e2e-07-save-main`)
8. `POST /encounters/{id}:finalize` -> `200` (`requestId=e2e-08-finalize`)
9. `POST /encounters/{id}:document` (`LAB_REPORT_V1`) -> `200` (`requestId=e2e-09-publish-document`)
10. Poll `GET /documents/{documentId}` until `RENDERED` -> reached on poll #2
11. `GET /documents/{documentId}/file` -> `200` (`requestId=e2e-11-download-pdf`)

## Status Snapshots After Each Step
Source: `_audit_evidence/workflow_audit/e2e_status_snapshots.jsonl`

- `after_create_encounter` -> `encounter.status=CREATED`
- `after_start_prep` -> `encounter.status=PREP`
- `after_collect_receive_sample` -> `encounter.status=PREP`
- `after_start_main` -> `encounter.status=IN_PROGRESS`
- `after_enter_result` -> `encounter.status=IN_PROGRESS`
- `after_finalize_verify` -> `encounter.status=FINALIZED`
- `after_publish_render_download` -> `encounter.status=DOCUMENTED`, `document.status=RENDERED`

## Backend Trace Correlation Proof
Source: `_audit_evidence/workflow_audit/RUNTIME_TRACE.jsonl`

Observed correlated events include:
- Request ingress/completion with controller+action
  - Example: `e2e-03-create-encounter` -> `EncountersController.create`
- Service spans:
  - `encounter.create`
  - `encounter.sample_update`
  - `encounter.main_update`
  - `encounter.recalculate` (state transitions)
  - `publish_report.pipeline`
- Queue/PDF pipeline events:
  - `publish_report.enqueued`
  - `publish_report.job_received`
  - `publish_report.render_worker`
  - `publish_report.document_rendered`
  - `publish_report.encounter_status_transition` (`FINALIZED -> DOCUMENTED`)

## Final Artifact Integrity
Source: `_audit_evidence/workflow_audit/e2e_summary.json`

- tenantId: `11111111-1111-4111-8111-111111111111`
- patientId: `5d1c7a75-adc7-47c7-b032-29549d8390ba`
- encounterId: `50a46c14-eef4-447c-bca8-d46c8844de9a`
- documentId: `206d4c4b-0c17-426c-83bc-10f5a10f2b88`
- documentStatus: `RENDERED`
- API-reported `pdfHash`: `a204bc11670f346486addeadb5216962bc5e0ec0240760847bab488635488e7c`
- Downloaded PDF `sha256`: `a204bc11670f346486addeadb5216962bc5e0ec0240760847bab488635488e7c`
- Match: **Yes**

## Runtime Trace Files Produced
- Final filtered trace used for audit: `_audit_evidence/workflow_audit/RUNTIME_TRACE.jsonl`
- Full merged trace: `_audit_evidence/workflow_audit/runtime_trace_merged_all.jsonl`
- Source copies:
  - `_audit_evidence/workflow_audit/runtime_trace_api.jsonl`
  - `_audit_evidence/workflow_audit/runtime_trace_worker.jsonl`

## Residual Gaps vs Requested Canonical LIMS Proof
- No `order/sample/order_item/result/report` entities to prove directly.
- Verify is represented by `finalize`, not a dedicated verify command.
- No dedicated orders/samples/results/verification/reports pages; workflow proof is encounter-detail driven.
