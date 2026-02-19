# Findings and Fix Plan (Prioritized)

Date: 2026-02-19

## P0 (Blockers)

### F-01: UI cannot transition a newly created encounter from `CREATED` to `PREP`
- Evidence:
  - Encounter is created with `status='CREATED'` (`apps/api/src/encounters/encounters.service.ts:124`).
  - Prep action panel (including buttons) is rendered only when `encounter.status === 'PREP'` (`apps/web/app/encounters/[encounterId]/page.tsx:1060`).
  - `start-prep` API exists but has no UI trigger (`apps/api/src/encounters/encounters.controller.ts:57`).
- Impact:
  - Web user can be stuck immediately after encounter creation.
- Minimal fix:
  1. Add a `Start Prep` button in `EncounterDetailPage` visible when `encounter.status === 'CREATED'`.
  2. Wire it to `client.POST('/encounters/{id}:start-prep')`.
  3. Refetch encounter/prep on success.

### F-02: Expected LIMS order/sample/result/report workflow is not implemented in this branch
- Evidence:
  - Governance expects order/sample/result/report state model (`governance/Workflow.md`, `governance/DataModel.md`).
  - Actual API/routes/models are encounter-based only (`packages/contracts/openapi.yaml`, `apps/api/prisma/schema.prisma`).
- Impact:
  - Audit target in prompt cannot be satisfied literally (no `CreateOrder`, no sample entity status, no result queue/verify queue/report page entities).
- Minimal fix (strategic):
  1. Create ADR: accept encounter workflow as temporary compatibility layer, or migrate to canonical LIMS entities.
  2. If migrating, introduce new command endpoints in OpenAPI first, then generated client, then UI.

## P1 (High)

### F-03: No audit-event emission for workflow commands
- Evidence:
  - `AuditEvent` model exists (`apps/api/prisma/schema.prisma:111`).
  - No `prisma.auditEvent.*` writes in encounters/documents/worker workflow code.
- Impact:
  - Violates governance requirement that every command writes audit trail.
- Minimal fix:
  1. Add `AuditService.appendCommandEvent(...)` in API.
  2. Call after successful command transitions (`create`, `start-prep`, `save-prep`, `start-main`, `save-main`, `finalize`, `document`).

### F-04: Requested document type is not stored in `Document.documentType` enum
- Evidence:
  - `toStoredDocumentType` always returns `ENCOUNTER_SUMMARY` (`apps/api/src/documents/document-types.ts:27`).
  - Requested type is only in `payloadJson.meta.documentType`.
- Impact:
  - DB-level filtering/reporting/indexing by requested document family is weak.
- Minimal fix:
  1. Extend Prisma `DocumentType` enum to include requested families.
  2. Map requested type directly in `toStoredDocumentType`.
  3. Keep backward-compatible fallback for old rows in response mapper.

### F-05: Verify semantics are weak for LAB flow
- Evidence:
  - LAB verify data is captured in `save-main` (`verifiedBy`, `verifiedAt`) (`apps/api/src/encounters/encounters.service.ts:963`).
  - `finalize` does not require LAB verify fields (`apps/api/src/encounters/encounters.service.ts:614`).
- Impact:
  - “Verify” step is not independently enforced.
- Minimal fix:
  1. In `finalize`, enforce LAB constraints (`resultSummary`, `verifiedBy`, `verifiedAt`) before allowing `FINALIZED`.
  2. Optionally split `save-main` and `verify` commands.

## P2 (Medium)

### F-06: No dedicated worklists for orders, samples, results, verification, reports
- Evidence:
  - Frontend routes are only auth/patients/encounters (`find apps/web/app -type f`).
- Impact:
  - Operators cannot work from queue-based screens expected by LIMS governance.
- Minimal fix:
  1. Add minimal list pages backed by existing API (`/encounters?status=`), then evolve to canonical LIMS entities.

### F-07: Status transition logic is fragmented across API + worker
- Evidence:
  - Transitions handled by helper (`transitionState`) and direct updates in `startMain`, `finalize`, and worker render completion.
- Impact:
  - Harder to prove single-source state machine logic.
- Minimal central fix (requested):
  1. Introduce `EncounterWorkflowService.recalculateStatus(encounterId, tx)`.
  2. Call it from:
     - `savePrep` (after prep upsert)
     - `startMain` (or replace with recompute precondition + transition)
     - `saveMain`
     - `finalize`
     - worker after document render
  3. Keep one transition matrix in that service and enforce all state updates through it.

## Recommended Implementation Order
1. P0/F-01 unblock UI transition (`CREATED -> PREP`).
2. P1/F-03 add audit writes for existing commands.
3. P2/F-07 centralize recompute/transition logic.
4. P1/F-05 tighten LAB verify gate.
5. P1/F-04 persist concrete document type enum.
6. P0/F-02 begin ADR + roadmap to canonical LIMS entities (if required by product scope).
