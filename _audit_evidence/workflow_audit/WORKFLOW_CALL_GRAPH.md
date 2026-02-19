# Workflow Call Graph (Static Trace)

Date: 2026-02-19  
Repo: `/home/munaim/srv/apps/vexel-health`

## Scope Reality Check
- Expected in prompt/governance: LIMS workflow `Register Patient -> Create Order -> Record Payment -> Enter Results -> Verify -> Publish PDF` with order/sample/result/report entities (`governance/Workflow.md`, `governance/DataModel.md`).
- Actual implementation in this branch: **Encounter workflow** with statuses `CREATED -> PREP -> IN_PROGRESS -> FINALIZED -> DOCUMENTED` (`packages/contracts/openapi.yaml:647`, `apps/api/src/encounters/encounters.service.ts:47`).
- No `Order`, `Sample`, `OrderItem`, `TestResult`, or `Report` models/controllers/routes exist in runtime code.

## Frontend Route Inventory (Workflow-Relevant)
- `/auth/login` -> `apps/web/app/auth/login/page.tsx`
- `/patients` -> `apps/web/app/patients/page.tsx`
- `/patients/register` -> `apps/web/app/patients/register/page.tsx`
- `/encounters/new` -> `apps/web/app/encounters/new/page.tsx`
- `/encounters/[encounterId]` -> `apps/web/app/encounters/[encounterId]/page.tsx`

## Route -> Action -> Backend Trace

### 1) Patient Registration
- UI route/component: `/patients/register` -> `RegisterPatientPage` (`apps/web/app/patients/register/page.tsx:18`)
- Button/handler: `Register` button -> `onSubmit` (`apps/web/app/patients/register/page.tsx:24`, `apps/web/app/patients/register/page.tsx:121`)
- API client call: `client.POST('/patients', { body: data })` (`apps/web/app/patients/register/page.tsx:29`)
- HTTP endpoint: `POST /patients` (`packages/contracts/openapi.yaml:99`)
- Backend action: `PatientsController.create` (`apps/api/src/patients/patients.controller.ts:19`)
- Service path: `PatientsService.create` (`apps/api/src/patients/patients.service.ts:26`)
- DB writes:
  - `patientSequence.upsert` (increment `lastValue`) (`apps/api/src/patients/patients.service.ts:29`)
  - `patient.create` (`tenantId, regNo, name, dob, gender, phone`) (`apps/api/src/patients/patients.service.ts:44`)
- Status transitions: none (patient has no workflow status)
- Side-effects: none (no audit event emitted)

### 2) Encounter Creation (Order Analog)
- UI route/component: `/encounters/new` -> `CreateEncounterContent` (`apps/web/app/encounters/new/page.tsx:33`)
- Button/handler: `Create Encounter` -> `submit` (`apps/web/app/encounters/new/page.tsx:73`, `apps/web/app/encounters/new/page.tsx:197`)
- API client call: `client.POST('/encounters', { body: { patientId, type }})` (`apps/web/app/encounters/new/page.tsx:83`)
- HTTP endpoint: `POST /encounters` (`packages/contracts/openapi.yaml:169`)
- Backend action: `EncountersController.create` (`apps/api/src/encounters/encounters.controller.ts:27`)
- Service path: `EncountersService.create` (`apps/api/src/encounters/encounters.service.ts:75`)
- DB writes:
  - `encounterSequence.upsert` (`lastValue` increment by tenant/type/year) (`apps/api/src/encounters/encounters.service.ts:110`)
  - `encounter.create` (`tenantId, patientId, type, encounterCode, status='CREATED', startedAt`) (`apps/api/src/encounters/encounters.service.ts:118`)
- Status transitions:
  - `Encounter.status: CREATED` (initial)
- Side-effects: trace span only; no audit event row

### 3) Encounter Preparation Start (Sample Workflow Gate)
- UI route/component: `/encounters/[encounterId]` -> `EncounterDetailPage` (`apps/web/app/encounters/[encounterId]/page.tsx:433`)
- UI action availability:
  - `Proceed to MAIN` button exists only when `encounter.status === 'PREP'` (`apps/web/app/encounters/[encounterId]/page.tsx:1060`, `apps/web/app/encounters/[encounterId]/page.tsx:1410`)
  - No UI button exists for `POST /encounters/{id}:start-prep` while status is `CREATED`.
- API-only command:
  - HTTP endpoint: `POST /encounters/{id}:start-prep` (`packages/contracts/openapi.yaml:290`)
  - Backend action: `EncountersController.startPrep` (`apps/api/src/encounters/encounters.controller.ts:57`)
  - Service path: `EncountersService.startPrep -> transitionState` (`apps/api/src/encounters/encounters.service.ts:187`, `apps/api/src/encounters/encounters.service.ts:721`)
  - DB writes: `encounter.update({ status: 'PREP' })` (`apps/api/src/encounters/encounters.service.ts:757`)
- Status transitions:
  - `Encounter.status: CREATED -> PREP`
- Side-effects: trace span only; no audit event row

### 4) Save Preparation Data (Collect/Receive Sample Analog)
- UI route/component: `/encounters/[encounterId]` (`apps/web/app/encounters/[encounterId]/page.tsx:433`)
- Button/handler: `Save Prep` -> `savePrep` (`apps/web/app/encounters/[encounterId]/page.tsx:772`, `apps/web/app/encounters/[encounterId]/page.tsx:1398`)
- API client call: `client.POST('/encounters/{id}:save-prep', { body: payload })` (`apps/web/app/encounters/[encounterId]/page.tsx:779`)
- HTTP endpoint: `POST /encounters/{id}:save-prep` (`packages/contracts/openapi.yaml:312`)
- Backend action: `EncountersController.savePrep` (`apps/api/src/encounters/encounters.controller.ts:63`)
- Service path: `EncountersService.savePrep` (`apps/api/src/encounters/encounters.service.ts:196`)
- Serializer/validation path: type-specific payload coercion
  - `toLabPrepInput`, `toRadPrepInput`, `toOpdPrepInput`, `toBbPrepInput`, `toIpdPrepInput` (`apps/api/src/encounters/encounters.service.ts:794`)
- DB writes (upsert by encounter type):
  - `labEncounterPrep` (`specimenType, collectedAt, collectorName, receivedAt`) (`apps/api/src/encounters/encounters.service.ts:212`)
  - `radEncounterPrep` (`fastingRequired, fastingConfirmed, contrastPlanned, creatinineChecked, pregnancyScreenDone, notes`) (`apps/api/src/encounters/encounters.service.ts:233`)
  - `opdEncounterPrep` (`systolicBp, diastolicBp, pulse, temperatureC, respiratoryRate, weightKg, spo2, triageNotes`) (`apps/api/src/encounters/encounters.service.ts:254`)
  - `bbEncounterPrep` (`sampleReceivedAt, aboGroup, rhType, componentRequested, unitsRequested, urgency`) (`apps/api/src/encounters/encounters.service.ts:275`)
  - `ipdEncounterPrep` (`admissionReason, ward, bed, admittingNotes`) (`apps/api/src/encounters/encounters.service.ts:296`)
- Status transitions: none (encounter remains `PREP`)
- Side-effects: trace span only; no audit event row

### 5) Start Main Phase (Result Entry Queue Gate)
- UI route/component: `/encounters/[encounterId]`
- Button/handler: `Proceed to MAIN` -> `startMain` (`apps/web/app/encounters/[encounterId]/page.tsx:802`, `apps/web/app/encounters/[encounterId]/page.tsx:1410`)
- API client call: `client.POST('/encounters/{id}:start-main')` (`apps/web/app/encounters/[encounterId]/page.tsx:807`)
- HTTP endpoint: `POST /encounters/{id}:start-main` (`packages/contracts/openapi.yaml:382`)
- Backend action: `EncountersController.startMain` (`apps/api/src/encounters/encounters.controller.ts:75`)
- Service path: `EncountersService.startMain` (`apps/api/src/encounters/encounters.service.ts:370`)
- DB writes:
  - Guard read for LAB prep completeness (`labEncounterPrep.specimenType`) (`apps/api/src/encounters/encounters.service.ts:392`)
  - `encounter.update({ status: 'IN_PROGRESS' })` (`apps/api/src/encounters/encounters.service.ts:407`)
- Status transitions:
  - `Encounter.status: PREP -> IN_PROGRESS`
- Side-effects: trace span only; no audit event row

### 6) Save Main Data (Result Entry + Inline Verify Fields)
- UI route/component: `/encounters/[encounterId]`
- Button/handler: `Save Main` -> `saveMain` (`apps/web/app/encounters/[encounterId]/page.tsx:824`, `apps/web/app/encounters/[encounterId]/page.tsx:1718`)
- API client call: `client.POST('/encounters/{id}:save-main', { body: payload })` (`apps/web/app/encounters/[encounterId]/page.tsx:831`)
- HTTP endpoint: `POST /encounters/{id}:save-main` (`packages/contracts/openapi.yaml:347`)
- Backend action: `EncountersController.saveMain` (`apps/api/src/encounters/encounters.controller.ts:69`)
- Service path: `EncountersService.saveMain` (`apps/api/src/encounters/encounters.service.ts:432`)
- Serializer/validation path:
  - `toLabMainInput`, `toRadMainInput`, `toOpdMainInput`, `toBbMainInput`, `toIpdMainInput` (`apps/api/src/encounters/encounters.service.ts:948`)
- DB writes (upsert by encounter type):
  - `labEncounterMain` (`resultSummary, verifiedBy, verifiedAt`) (`apps/api/src/encounters/encounters.service.ts:452`)
  - `radEncounterMain` (`reportText, impression, radiologistName, reportedAt`) (`apps/api/src/encounters/encounters.service.ts:473`)
  - `opdEncounterMain` (`chiefComplaint, assessment, plan, prescriptionText`) (`apps/api/src/encounters/encounters.service.ts:494`)
  - `bbEncounterMain` (`crossmatchResult, componentIssued, unitsIssued, issuedAt, issueNotes`) (`apps/api/src/encounters/encounters.service.ts:515`)
  - `ipdEncounterMain` (`dailyNote, orders`) (`apps/api/src/encounters/encounters.service.ts:536`)
- Status transitions: none (encounter stays `IN_PROGRESS`)
- Side-effects: trace span only; no audit event row

### 7) Finalize Encounter (Verify Analog)
- UI route/component: `/encounters/[encounterId]`
- Button/handler: `Finalize Encounter` -> `finalizeEncounter` (`apps/web/app/encounters/[encounterId]/page.tsx:854`, `apps/web/app/encounters/[encounterId]/page.tsx:1728`)
- API client call: `client.POST('/encounters/{id}:finalize')` (`apps/web/app/encounters/[encounterId]/page.tsx:859`)
- HTTP endpoint: `POST /encounters/{id}:finalize` (`packages/contracts/openapi.yaml:404`)
- Backend action: `EncountersController.finalize` (`apps/api/src/encounters/encounters.controller.ts:81`)
- Service path: `EncountersService.finalize` (`apps/api/src/encounters/encounters.service.ts:614`)
- DB writes:
  - Validation reads for type-specific constraints (RAD reportText required; BB issue constraints) (`apps/api/src/encounters/encounters.service.ts:642`)
  - `encounter.update({ status: 'FINALIZED', endedAt: now })` (`apps/api/src/encounters/encounters.service.ts:688`)
- Status transitions:
  - `Encounter.status: IN_PROGRESS -> FINALIZED`
- Side-effects: trace span only; no audit event row

### 8) Publish Report / Generate Document
- UI route/component: `/encounters/[encounterId]`
- Button/handler: `Generate Document` -> `generateDocument` (`apps/web/app/encounters/[encounterId]/page.tsx:876`, `apps/web/app/encounters/[encounterId]/page.tsx:1789`)
- API client call: `client.POST('/encounters/{id}:document', { body: { documentType }})` (`apps/web/app/encounters/[encounterId]/page.tsx:885`)
- HTTP endpoint: `POST /encounters/{id}:document` (`packages/contracts/openapi.yaml:426`)
- Backend action: `EncountersController.createDocument` (`apps/api/src/encounters/encounters.controller.ts:87`)
- Service path: `DocumentsService.queueEncounterDocument` (`apps/api/src/documents/documents.service.ts:57`)
- DB writes:
  - `document.create` when first payload hash (`status='QUEUED', payloadVersion, templateVersion, payloadJson, payloadHash, storageBackend='LOCAL'`) (`apps/api/src/documents/documents.service.ts:130`)
  - or `document.update` when retrying failed render (`status='QUEUED'`, clear error/hash fields) (`apps/api/src/documents/documents.service.ts:167`)
- Status transitions:
  - `Document.status: QUEUED` (initial)
- Side-effects:
  - Enqueue BullMQ job `DOCUMENT_RENDER` (`apps/api/src/documents/document-render.queue.ts:36`)
  - Trace event `publish_report.enqueued` (`apps/api/src/documents/documents.service.ts:192`)

### 9) Worker Render + Encounter Documentation Transition
- Trigger: BullMQ job `DOCUMENT_RENDER`
- Worker path: `processDocumentRender` (`apps/worker/src/index.ts:136`)
- External side-effect: `POST ${PDF_SERVICE_URL}/render` (`apps/worker/src/index.ts:81`)
- DB writes:
  - `document.update({ status: 'RENDERED', storageKey, pdfHash, renderedAt, error* null })` (`apps/worker/src/index.ts:185`)
  - `encounter.update({ status: 'DOCUMENTED' })` when previous status was `FINALIZED` (`apps/worker/src/index.ts:223`)
- Status transitions:
  - `Document.status: QUEUED -> RENDERED` (or `FAILED` via `markFailed`) (`apps/worker/src/index.ts:113`)
  - `Encounter.status: FINALIZED -> DOCUMENTED`
- Side-effects:
  - PDF bytes written to storage (`apps/worker/src/index.ts:99`)
  - Trace events `publish_report.document_rendered` and `publish_report.encounter_status_transition` (`apps/worker/src/index.ts:200`, `apps/worker/src/index.ts:233`)

### 10) Document Status Refresh + Download
- UI route/component: `/encounters/[encounterId]`
- Button/handlers:
  - `Refresh Status` -> `refreshDocument` (`apps/web/app/encounters/[encounterId]/page.tsx:913`)
  - `Download PDF` -> `downloadDocument` (`apps/web/app/encounters/[encounterId]/page.tsx:937`)
- API client calls:
  - `client.GET('/documents/{documentId}')` (`apps/web/app/encounters/[encounterId]/page.tsx:920`)
  - `client.GET('/documents/{documentId}/file', { parseAs: 'arrayBuffer' })` (`apps/web/app/encounters/[encounterId]/page.tsx:945`)
- Backend actions:
  - `DocumentsController.getDocumentById` (`apps/api/src/documents/documents.controller.ts:16`)
  - `DocumentsController.getDocumentFile` (`apps/api/src/documents/documents.controller.ts:21`)
- Service path:
  - `DocumentsService.getDocumentById` (`apps/api/src/documents/documents.service.ts:214`)
  - `DocumentsService.getDocumentFile` (guards `status === RENDERED`) (`apps/api/src/documents/documents.service.ts:219`)
- DB writes: none
- Status transitions: none
- Side-effects: browser blob download only

## Explicit Status Field Inventory
- Implemented status fields:
  - `Encounter.status` (`apps/api/prisma/schema.prisma:154`) with values `CREATED|PREP|IN_PROGRESS|FINALIZED|DOCUMENTED`.
  - `Document.status` (`apps/api/prisma/schema.prisma:422`) with values `QUEUED|RENDERED|FAILED`.
- Not implemented in this codebase branch:
  - `Order.status`
  - `Sample.status`
  - `OrderItem.status`
  - `TestResult.status`
  - `Report.status` as a separate model.
- Audit side-effects missing:
  - `AuditEvent` table exists (`apps/api/prisma/schema.prisma:111`) but no workflow command writes to it.
