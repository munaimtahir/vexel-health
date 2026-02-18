# DECISIONS_LOCKED
Date: 2026-02-18

## Locked Defaults Applied
1. Patient RegNo format: `REG-{SEQ8}`
- Scope: per-tenant monotonic sequence.
- Storage: `Patient.regNo` with unique constraint `(tenantId, regNo)`.

2. Encounter types: `LAB`, `RAD`, `OPD`, `BB`, `IPD`
- Validation: OpenAPI enum + API DTO validation.

3. Encounter code format: `{TYPE}-{YYYY}-{SEQ6}`
- Scope: per-tenant + per-type + per-year sequence.
- Storage: `Encounter.encounterCode` with unique constraint `(tenantId, encounterCode)`.

4. Encounter workflow skeleton
- `CREATED -> PREP -> IN_PROGRESS -> FINALIZED -> DOCUMENTED`
- Implemented commands:
  - `:start-prep` (`CREATED -> PREP`)
  - `:start-main` (`PREP -> IN_PROGRESS`)
  - `:finalize` (`IN_PROGRESS -> FINALIZED`)
  - `:document` deferred as explicit `501` stub

## Governance Constraints Enforced
- OpenAPI is source of truth; generated contracts consumed by web.
- TenantContext required for tenant-protected routes.
- Workflow mutation only via command endpoints.
- No backward-compat/legacy migration logic assumed.
