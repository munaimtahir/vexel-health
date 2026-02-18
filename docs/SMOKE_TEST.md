# SMOKE_TEST
Date: 2026-02-18

## Preconditions
- Stack running: `docker compose up -d --build`
- DB schema applied: `docker compose exec -T api npx prisma db push --schema prisma/schema.prisma`
- Demo tenant/user seeded (see run log)

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
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111' \
  -d '{"email":"demo@vexel.dev","password":"demo123"}'
```
Expected:
- `accessToken` present.

## Create patient
```bash
curl -sS -X POST http://127.0.0.1:3000/patients \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111' \
  -d '{"name":"Smoke Patient","gender":"male"}'
```
Observed:
- `regNo=REG-00000001` (matches `REG-{SEQ8}`)

## Create LAB encounter
```bash
curl -sS -X POST http://127.0.0.1:3000/encounters \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111' \
  -d '{"patientId":"<PATIENT_ID>","type":"LAB"}'
```
Observed:
- `encounterCode=LAB-2026-000001` (matches `{TYPE}-{YYYY}-{SEQ6}`)
- `status=CREATED`

## Command route smoke
```bash
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:start-prep" -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:start-main" -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111'
curl -sS -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:finalize" -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111'
curl -sS -o /tmp/doc-cmd.json -w '%{http_code}' -X POST "http://127.0.0.1:3000/encounters/<ENCOUNTER_ID>:document" -H 'x-tenant-id: 11111111-1111-1111-1111-111111111111'
```
Observed:
- Status progression: `PREP -> IN_PROGRESS -> FINALIZED`
- Document command returns `501` with `not_implemented` envelope

## Tenant isolation check
```bash
curl -sS -o /tmp/cross-tenant.json -w '%{http_code}' \
  "http://127.0.0.1:3000/patients/<PATIENT_ID>" \
  -H 'x-tenant-id: 22222222-2222-2222-2222-222222222222'
```
Observed:
- HTTP `404`

## Automated tests
- `npm run test:e2e --workspace=api -- --runInBand`
- Includes `test/tenant-isolation.e2e-spec.ts` and passes.
