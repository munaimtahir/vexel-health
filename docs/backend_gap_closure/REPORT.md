# Backend Gap Closure Report
Date: 2026-02-20

## 1) Endpoints added

### Admin users
- `GET /admin/users`
- `POST /admin/users/invite`
- `GET /admin/users/{userId}`
- `PATCH /admin/users/{userId}`

### Panels and catalog linking
- `GET /lab/panels`
- `POST /lab/panels`
- `GET /lab/panels/{panelId}`
- `PATCH /lab/panels/{panelId}`
- `POST /lab/panels/{panelId}:add-test`
- `POST /lab/panels/{panelId}:remove-test`
- `GET /lab/parameters/{parameterId}`
- `GET /lab/linking/state`
- `POST /lab/linking:link-test-parameter`
- `POST /lab/linking:unlink-test-parameter`
- `GET /lab/tests/{testId}/reference-ranges`
- `POST /lab/tests/{testId}:upsert-reference-range`

### Import / export jobs
- `POST /lab/catalog-imports`
- `GET /lab/catalog-imports`
- `GET /lab/catalog-imports/{jobId}`
- `POST /lab/catalog-exports`
- `GET /lab/catalog-exports`
- `GET /lab/catalog-exports/{jobId}/file`

### Business config
- `GET /admin/business/branding`
- `PUT /admin/business/branding`
- `GET /admin/business/report-design`
- `PUT /admin/business/report-design`
- `GET /admin/business/receipt-design`
- `PUT /admin/business/receipt-design`

### Admin overview expansion
- Existing `GET /admin/overview` extended with:
  - `counts.users_count`
  - `counts.panels_count`
  - `counts.pending_imports_count`
  - `catalog.panels_count`

## 2) UI route to backend mapping

| UI route | Backend endpoint(s) |
|---|---|
| `/admin` | `GET /admin/overview` |
| `/admin/users` | `GET /admin/users` |
| `/admin/users/invite` | `POST /admin/users/invite` |
| `/admin/users/{userId}` | `GET /admin/users/{userId}`, `PATCH /admin/users/{userId}` |
| `/admin/catalog/panels` | `GET /lab/panels`, `POST /lab/panels` |
| `/admin/catalog/panels/{panelId}` | `GET /lab/panels/{panelId}`, `PATCH /lab/panels/{panelId}`, `POST /lab/panels/{panelId}:add-test`, `POST /lab/panels/{panelId}:remove-test` |
| `/admin/catalog/parameters/{parameterId}` | `GET /lab/parameters/{parameterId}` |
| `/admin/catalog/linking` | `GET /lab/linking/state`, `POST /lab/linking:link-test-parameter`, `POST /lab/linking:unlink-test-parameter`, `GET /lab/tests/{testId}/reference-ranges`, `POST /lab/tests/{testId}:upsert-reference-range` |
| `/admin/catalog/import-export` | `POST /lab/catalog-imports`, `GET /lab/catalog-imports`, `GET /lab/catalog-imports/{jobId}`, `POST /lab/catalog-exports`, `GET /lab/catalog-exports`, `GET /lab/catalog-exports/{jobId}/file` |
| `/admin/business/branding` | `GET/PUT /admin/business/branding` |
| `/admin/business/report-design` | `GET/PUT /admin/business/report-design` |
| `/admin/business/receipt-design` | `GET/PUT /admin/business/receipt-design` |

## 3) Locked architectural decisions
- Parameters are tenant-scoped.
- Panels are tenant-scoped.
- Catalog import execution is synchronous for MVP, but persisted as deterministic jobs/history.
- Invite model is email-based with `PENDING | ACCEPTED | REVOKED | EXPIRED` and explicit expiry.

## 4) Sample curl smoke flow

```bash
# host and token examples
HOST=tenant-a.test
TOKEN='Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE'

curl -H "Host: $HOST" http://localhost:3000/admin/overview
curl -H "Host: $HOST" http://localhost:3000/admin/users

curl -X POST -H "Host: $HOST" -H 'Content-Type: application/json' \
  -d '{"email":"new.user@tenant.test","name":"New User","roleNames":["ADMIN"]}' \
  http://localhost:3000/admin/users/invite

curl -X POST -H "Host: $HOST" -H "Authorization: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"BASIC-PANEL","name":"Basic Panel"}' \
  http://localhost:3000/lab/panels

curl -X POST -H "Host: $HOST" -H "Authorization: $TOKEN" \
  -F 'mode=MERGE' -F 'file=@./catalog.xlsx' \
  http://localhost:3000/lab/catalog-imports

curl -H "Host: $HOST" http://localhost:3000/lab/catalog-imports
```

## 5) Verification results
- Contract generation: passed
  - `npm run contracts:generate`
- API build: passed
  - `npm run build --workspace=api`
- API lint: passed
  - `npm run lint --workspace=api`
- Web build: passed
  - `npm run build --workspace=web`
- API unit smoke: passed
  - `npm run test --workspace=api -- admin.service.spec.ts`
- E2E smoke (new): passed
  - `npm run test:e2e --workspace=api -- admin-catalog-gap.e2e-spec.ts`

## 6) Notes
- Validation errors now use `error.field_errors` (contract + runtime), with runtime compatibility fallback for legacy `error.fields` payloads.
- New write operations emit tenant-scoped audit events.
