# PHASE4A_MODULE_DOCUMENTS
Date: 2026-02-19

## Scope
Phase 4A adds module-specific document generation using typed command input and deterministic payload builders.

## Contract
`POST /encounters/{id}:document`

Request body (required):
```json
{
  "documentType": "RAD_REPORT_V1"
}
```

Supported document types:
- `ENCOUNTER_SUMMARY_V1`
- `LAB_REPORT_V1`
- `OPD_SUMMARY_V1`
- `RAD_REPORT_V1`
- `BB_ISSUE_SLIP_V1`
- `IPD_SUMMARY_V1`

`DocumentResponse` fields include:
- `type`
- `templateKey`
- `templateVersion`
- `payloadVersion`
- `payloadHash`
- `pdfHash`

## Deterministic Payload Builder
Builder shape:
```json
{
  "templateKey": "RAD_REPORT_V1",
  "templateVersion": 1,
  "payloadVersion": 1,
  "payload": {
    "meta": { "documentType": "RAD_REPORT_V1", "templateKey": "RAD_REPORT_V1" },
    "tenant": { "id": "..." },
    "patient": { "...": null },
    "encounter": { "...": null },
    "prep": { "...": null },
    "main": { "...": null }
  }
}
```

Rules:
- No runtime timestamps (`DateTime.Now` / new current time fields).
- Only persisted DB values are used.
- Missing values are serialized as `null`.
- Canonical JSON hash over payload drives idempotency.

## Compatibility Validation
Allowed:
- `LAB` -> `LAB_REPORT_V1` or `ENCOUNTER_SUMMARY_V1`
- `RAD` -> `RAD_REPORT_V1` or `ENCOUNTER_SUMMARY_V1`
- `OPD` -> `OPD_SUMMARY_V1` or `ENCOUNTER_SUMMARY_V1`
- `BB` -> `BB_ISSUE_SLIP_V1` or `ENCOUNTER_SUMMARY_V1`
- `IPD` -> `IPD_SUMMARY_V1` or `ENCOUNTER_SUMMARY_V1`

Mismatch returns:
- `409` with code `INVALID_DOCUMENT_TYPE`

## Render Pipeline
- API upserts by deterministic key components (`templateVersion + payloadHash` with encounter scope).
- Worker submits `templateKey/templateVersion/payloadVersion/payload` to PDF service.
- PDF service renders deterministic output with static section ordering:
  - Header
  - Patient block
  - Encounter block
  - Prep block
  - Main block
  - Static footer

## Test Coverage
E2E includes:
- RAD happy path with `RAD_REPORT_V1` + download.
- Repeated RAD `:document` returns same `documentId`, `payloadHash`, `pdfHash`.
- OPD happy path with `OPD_SUMMARY_V1`.
- Cross-tenant document file read blocked (`404`).
