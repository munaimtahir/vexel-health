# Phase 3A Document Pipeline
Date: 2026-02-18

## Scope
Phase 3A replaces deferred encounter documentation with an end-to-end deterministic pipeline:
- Command endpoint: `POST /encounters/{id}:document`
- Document registry persisted in DB (`Document` model)
- Async render processing in `apps/worker` (`DOCUMENT_RENDER` job)
- Deterministic PDF rendering in `apps/pdf` (`POST /render`)
- Local filesystem storage via adapter interface
- Retrieval endpoints: `GET /documents/{documentId}`, `GET /documents/{documentId}/file`

## Architecture
Text diagram:

`API (:document command)`
-> compute deterministic payload + `payload_hash`
-> idempotent document upsert (`QUEUED | RENDERED | FAILED` handling)
-> enqueue BullMQ job (`document-render-queue`)
->
`Worker (DOCUMENT_RENDER)`
-> fetch queued document by `(tenantId, documentId)`
-> call PDF service `/render`
-> hash PDF bytes (`pdf_hash`)
-> store bytes via storage adapter (LOCAL)
-> mark document `RENDERED`
-> transition encounter `FINALIZED -> DOCUMENTED`

## Data Model (Document Registry)
Document fields used in this phase:
- `id`, `tenantId`, `encounterId`
- `documentType` (`ENCOUNTER_SUMMARY`)
- `status` (`QUEUED | RENDERED | FAILED`)
- `payloadVersion`, `templateVersion`
- `payloadJson`, `payloadHash`
- `storageBackend` (`LOCAL`), `storageKey`
- `pdfHash`, `errorCode`, `errorMessage`
- `createdAt`, `renderedAt`

Idempotency uniqueness:
- `(tenantId, encounterId, documentType, templateVersion, payloadHash)`

## Determinism Rules
- Canonical JSON hashing is used for payload hashes (stable key ordering).
- Encounter payload is normalized for idempotency:
  - `encounterStatus` is fixed to `FINALIZED` in document payload so a later `DOCUMENTED` status does not change `payloadHash`.
- PDF generation has deterministic content and layout:
  - fixed template key (`ENCOUNTER_SUMMARY`)
  - fixed line ordering
  - no runtime timestamps/random values in rendered content
- `pdfHash = sha256(pdf_bytes)` is persisted and used for determinism checks.

## Idempotency Strategy
For `POST /encounters/{id}:document`:
- If matching rendered document exists: return existing document.
- If matching queued document exists: return existing document, no duplicate queueing.
- If matching failed document exists: reset to `QUEUED` and re-enqueue.
- If no match: create `QUEUED` document and enqueue.

Queue-level safety:
- BullMQ job ID is deterministic per document (`<tenantId>__<documentId>`), preventing duplicate active jobs for the same document.

## Storage Abstraction
`DocumentStorageAdapter` interface:
- `putPdf({ tenantId, documentId, bytes }) -> { storageKey }`
- `getPdf({ tenantId, storageKey }) -> bytes`

Current implementation:
- `LocalStorageAdapter`
- Base directory: `DOCUMENTS_LOCAL_DIR` (default `/data/documents`)
- Storage key layout: `<tenantId>/<documentId>.pdf`

Future implementation scaffolded:
- `MinioStorageAdapter` placeholder
- same interface, planned S3-compatible env configuration

## Operational Notes
Environment:
- API: `REDIS_URL`, `PDF_SERVICE_URL`, `DOCUMENTS_LOCAL_DIR`
- Worker: `DATABASE_URL`, `REDIS_URL`, `PDF_SERVICE_URL`, `DOCUMENTS_LOCAL_DIR`

Docker:
- `api` and `worker` share `documents_data` volume at `/data/documents`.

Failure behavior:
- Worker marks document `FAILED` with `errorCode/errorMessage` on render/storage failure.
- Re-running `:document` on failed item re-queues same record.
