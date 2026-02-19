# SMOKE_TEST
Date: 2026-02-19

## Preconditions
- Stack up: `docker compose up -d --build`
- DB synced: `docker compose exec -T api npx prisma db push --schema prisma/schema.prisma --accept-data-loss`
- Tenant/domain/user seeded:
  - tenant A domain: `tenant-a.test`
  - tenant B domain: `tenant-b.test`
  - tenant A user: `demo@vexel.dev` / `demo123`

## Health checks
```bash
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:5000/health
```
Expected:
- API: `{"status":"ok","service":"api"}`
- PDF: `{"status":"ok"}`

## LAB flow + LAB_REPORT_V1
Create patient + LAB encounter + workflow:
```bash
curl -sS -X POST http://127.0.0.1:3000/patients \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Patient","gender":"male"}'

curl -sS -X POST http://127.0.0.1:3000/encounters \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","type":"LAB"}'

curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:start-prep" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:save-prep" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"specimenType":"Blood"}'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:start-main" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:finalize" -H 'Host: tenant-a.test'
```
Observed:
- `regNo=REG-00000001`
- `encounterCode=LAB-2026-000001`
- `PREP -> IN_PROGRESS -> FINALIZED`

Generate module document:
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:document" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"LAB_REPORT_V1"}'
```
Observed:
- Returns `DocumentResponse` with `type=LAB_REPORT_V1`
- Includes `templateKey=LAB_REPORT_V1`
- Returns `status=QUEUED|RENDERED`

Idempotency check:
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<LAB_ENCOUNTER_ID>:document" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"LAB_REPORT_V1"}'
```
Observed:
- Same `documentId`, `payloadHash`, and `pdfHash`.

## RAD flow + RAD_REPORT_V1
```bash
curl -sS -X POST http://127.0.0.1:3000/encounters \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","type":"RAD"}'

curl -sS -X POST "http://127.0.0.1:3000/encounters/<RAD_ENCOUNTER_ID>:start-prep" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<RAD_ENCOUNTER_ID>:start-main" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<RAD_ENCOUNTER_ID>:save-main" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"reportText":"No acute cardiopulmonary abnormality.","impression":"Stable chest radiograph."}'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<RAD_ENCOUNTER_ID>:finalize" -H 'Host: tenant-a.test'

curl -sS -X POST "http://127.0.0.1:3000/encounters/<RAD_ENCOUNTER_ID>:document" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"RAD_REPORT_V1"}'
```
Observed:
- `type=RAD_REPORT_V1`
- `templateKey=RAD_REPORT_V1`
- Download endpoint returns `Content-Type: application/pdf`.

## OPD flow + OPD_SUMMARY_V1
```bash
curl -sS -X POST http://127.0.0.1:3000/encounters \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","type":"OPD"}'

curl -sS -X POST "http://127.0.0.1:3000/encounters/<OPD_ENCOUNTER_ID>:start-prep" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<OPD_ENCOUNTER_ID>:start-main" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<OPD_ENCOUNTER_ID>:save-main" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"chiefComplaint":"Headache","assessment":"Tension headache","plan":"Hydration and rest"}'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<OPD_ENCOUNTER_ID>:finalize" -H 'Host: tenant-a.test'

curl -sS -X POST "http://127.0.0.1:3000/encounters/<OPD_ENCOUNTER_ID>:document" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"OPD_SUMMARY_V1"}'
```
Observed:
- `type=OPD_SUMMARY_V1`
- `templateKey=OPD_SUMMARY_V1`

## Tenant isolation check
```bash
curl -sS -o /tmp/tenant-b-doc.json -w '%{http_code}' \
  "http://127.0.0.1:3000/documents/<DOCUMENT_ID>/file" \
  -H 'Host: tenant-b.test'
```
Observed:
- HTTP `404`
