# API-Interfaces.md
Date: 2026-02-18

## Contract-first
- OpenAPI is the authoritative contract.
- Generate:
  - TypeScript client SDK for web and future mobile
  - Zod validators (optional) or mirror schemas in `packages/contracts`

## Standard response shapes
### Success
- Return resource or command result object.

### Validation error (400)
```
{
  "error": {
    "type": "validation_error",
    "field_errors": {
      "fieldName": ["message1", "message2"]
    }
  }
}
```

### Domain rule violation (409)
```
{
  "error": {
    "type": "domain_error",
    "code": "ORDER_STATE_INVALID",
    "message": "Cannot verify results before entry is complete."
  }
}
```

### Auth error (401/403)
- Standard JSON error without leaking details.

### Unexpected error (500)
- User gets generic message
- Logs include correlation id

## Phase 5 contract decisions (2026-02-20)
- Parameters are tenant-scoped.
- Panels are tenant-scoped.
- Catalog import execution is synchronous for MVP, but always persisted as deterministic jobs/history.
- Invite model is email-based with statuses `PENDING | ACCEPTED | REVOKED | EXPIRED` and explicit expiry.

## API surface (MVP)
### Tenancy/Auth
- POST /auth/login
- POST /auth/refresh
- GET  /me

### Feature flags
- GET  /me/features
- GET  /admin/tenants/:tenantId/features
- PUT  /admin/tenants/:tenantId/features

### Patients
- POST /patients
- GET  /patients?query=
- GET  /patients/:id

### LIMS catalog
- GET  /lims/catalog/tests
- POST /lims/catalog/tests
- POST /lims/catalog/panels

### Orders
- POST /lims/commands/registerPatient (optional shortcut)
- POST /lims/commands/createOrder
- POST /lims/commands/recordPayment

### Results
- POST /lims/commands/enterResults
- POST /lims/commands/verifyResults
- POST /lims/commands/publishReport

### Documents
- GET /documents/:id (metadata)
- GET /documents/:id/file (download/stream)

## PDF Service interface (internal)
- POST /render
- POST /render/preview (optional)
- GET  /health
