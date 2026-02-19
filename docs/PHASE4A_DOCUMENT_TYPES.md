# PHASE4A_DOCUMENT_TYPES
Date: 2026-02-19

This phase supersedes earlier draft naming and uses final `_V1` document keys.

## Document Types
- `ENCOUNTER_SUMMARY_V1`
- `LAB_REPORT_V1`
- `OPD_SUMMARY_V1`
- `RAD_REPORT_V1`
- `BB_ISSUE_SLIP_V1`
- `IPD_SUMMARY_V1`

## Command
`POST /encounters/{id}:document`

Body is required:
```json
{
  "documentType": "RAD_REPORT_V1"
}
```

## Compatibility
- `LAB` -> `LAB_REPORT_V1` (+ `ENCOUNTER_SUMMARY_V1`)
- `RAD` -> `RAD_REPORT_V1` (+ `ENCOUNTER_SUMMARY_V1`)
- `OPD` -> `OPD_SUMMARY_V1` (+ `ENCOUNTER_SUMMARY_V1`)
- `BB` -> `BB_ISSUE_SLIP_V1` (+ `ENCOUNTER_SUMMARY_V1`)
- `IPD` -> `IPD_SUMMARY_V1` (+ `ENCOUNTER_SUMMARY_V1`)

Mismatch returns `409 INVALID_DOCUMENT_TYPE`.

## Response highlights
`DocumentResponse` includes:
- `type`
- `templateKey`
- `templateVersion`
- `payloadVersion`
- `payloadHash`
- `pdfHash`
