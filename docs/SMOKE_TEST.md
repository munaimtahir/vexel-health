# SMOKE_TEST
Date: 2026-02-18

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

## Login
```bash
curl -sS -X POST http://127.0.0.1:3000/auth/login \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@vexel.dev","password":"demo123"}'
```
Expected:
- `accessToken` present.

## Create patient
```bash
curl -sS -X POST http://127.0.0.1:3000/patients \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Patient","gender":"male"}'
```
Observed:
- `regNo=REG-00000001`

## Create LAB encounter
```bash
curl -sS -X POST http://127.0.0.1:3000/encounters \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<PATIENT_ID>","type":"LAB"}'
```
Observed:
- `encounterCode=LAB-2026-000001`
- `status=CREATED`

## Command transitions (Phase 3B prep flow)
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:start-prep" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:save-prep" \
  -H 'Host: tenant-a.test' \
  -H 'Content-Type: application/json' \
  -d '{"specimenType":"Blood"}'
curl -sS "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>/prep" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:start-main" -H 'Host: tenant-a.test'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:finalize" -H 'Host: tenant-a.test'
```
Observed:
- LAB prep saved (`specimenType=Blood`)
- `PREP -> IN_PROGRESS -> FINALIZED`

## Generate document
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:document" -H 'Host: tenant-a.test'
```
Observed:
- Returns `DocumentResponse` with `status=QUEUED`
- Example document id: `5539107c-84c5-4313-83c5-baf5abaa5705`

Poll until rendered:
```bash
curl -sS "http://127.0.0.1:3000/documents/<DOCUMENT_ID>" -H 'Host: tenant-a.test'
```
Observed:
- `status=RENDERED`
- `pdfHash` present

## Download PDF
```bash
curl -sS -D /tmp/vexel-doc-headers.txt \
  "http://127.0.0.1:3000/documents/<DOCUMENT_ID>/file" \
  -H 'Host: tenant-a.test' \
  -o /tmp/vexel-doc.pdf
```
Observed:
- `Content-Type: application/pdf`
- Byte size: `871`
- SHA256: `d4de4f862e0b24343806e4ecdff75a02273bfeb6d08789cc311e50cd79b43865`

## Idempotency and determinism check
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:document" -H 'Host: tenant-a.test'
```
Observed:
- Same `documentId` returned
- Same `payloadHash` and `pdfHash`

## Tenant isolation check
```bash
curl -sS -o /tmp/tenant-b-doc.json -w '%{http_code}' \
  "http://127.0.0.1:3000/documents/<DOCUMENT_ID>" \
  -H 'Host: tenant-b.test'
```
Observed:
- HTTP `404`
