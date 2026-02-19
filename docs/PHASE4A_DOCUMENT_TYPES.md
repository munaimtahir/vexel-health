# PHASE4A_DOCUMENT_TYPES
Date: 2026-02-19

## Scope
Phase 4A extends the document command to accept a typed request body and builds deterministic payloads per requested document type.

## Command Contract
`POST /encounters/{id}:document`

Request body:
```json
{
  "documentType": "LAB_REPORT"
}
```

Supported `documentType` values:
- `ENCOUNTER_SUMMARY`
- `LAB_REPORT`
- `RAD_REPORT`
- `OPD_CLINICAL_NOTE`
- `BB_TRANSFUSION_NOTE`
- `IPD_DISCHARGE_SUMMARY`

If body is omitted, default is `ENCOUNTER_SUMMARY`.

## Payload Builder Rules
- Payloads are deterministic and hashable via canonical JSON.
- All payloads include stable base fields:
  - encounter identifiers and normalized status (`FINALIZED`)
  - patient identifiers
  - `meta.requestedDocumentType`, `meta.payloadVersion`, `meta.templateVersion`
- Type-specific sections are included from typed PREP/MAIN data.
- Document type and encounter type must be compatible:
  - `LAB_REPORT` -> `LAB`
  - `RAD_REPORT` -> `RAD`
  - `OPD_CLINICAL_NOTE` -> `OPD`
  - `BB_TRANSFUSION_NOTE` -> `BB`
  - `IPD_DISCHARGE_SUMMARY` -> `IPD`
- Mismatch returns `409` (`INVALID_DOCUMENT_TYPE`).

## Payload Sample Fixtures
The API stores sample fixtures in code (`apps/api/src/documents/document-payload.samples.ts`) and embeds the relevant fixture in payloads for contract traceability.

Fixture highlights:
- `ENCOUNTER_SUMMARY`: encounter code/type + patient regNo/name
- `LAB_REPORT`: specimen + result summary
- `RAD_REPORT`: report text + impression
- `OPD_CLINICAL_NOTE`: chief complaint + assessment + plan
- `BB_TRANSFUSION_NOTE`: crossmatch + issued component/units
- `IPD_DISCHARGE_SUMMARY`: admission reason + daily note + discharge orders

## Notes
- Storage stays deterministic and tenant-scoped as in Phase 3A.
- Rendering path remains through current PDF template key and worker pipeline.
