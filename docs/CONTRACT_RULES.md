# CONTRACT_RULES
Date: 2026-02-18

## Contract-First Policy
1. `packages/contracts/openapi.yaml` is authoritative.
2. API route/DTO changes must be reflected in OpenAPI in the same change.
3. Regenerate contracts after OpenAPI edits:
- `npm run contracts:generate`
4. Rebuild contracts package to publish usable artifacts:
- `npm run build --workspace=@vexel/contracts`

## Consumption Rules
- Web must use `@vexel/contracts` typed client (`createVexelClient`) and generated path types.
- No manual fetch payloads for covered endpoints.

## Error Envelope Rules
- Validation errors: `400` with `error.type=validation_error` and `error.fields`.
- Domain errors: `409` with `error.type=domain_error`, `code`, `message`.
- Auth errors: `401/403` with `error.type=auth_error`.
- Not found: `404` with `error.type=not_found`.
- Deferred commands: `501` with `error.type=not_implemented`.
- Unexpected errors: `500` with `error.type=unexpected_error` + correlationId.

## Drift Prevention Checklist
- Before merge: run
  - `npm run contracts:generate`
  - `npm run build --workspace=@vexel/contracts`
  - `npm run build --workspace=api`
  - `npm run build --workspace=web`
- Keep OpenAPI, API handlers, and web usage aligned in the same PR.
