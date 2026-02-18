# Workflow.md
Date: 2026-02-18

## Philosophy
All workflow transitions happen via **commands**, validated and guarded by state machines.
CRUD endpoints may exist for configuration and reference data, not for workflow transitions.

## LIMS MVP state machines
### Order state
- DRAFT → ENTERED → VERIFIED → PUBLISHED
- Optional: if sample workflow is enabled:
  - DRAFT → PAID → COLLECTED → RECEIVED → ENTERED → VERIFIED → PUBLISHED

### Result state (per order item)
- DRAFT (optional) → ENTERED → VERIFIED
- PUBLISHED is a document-level event, not necessarily a per-result state.

## Commands (MVP)
- CreateOrder
- RecordPayment
- EnterResults
- VerifyResults
- PublishReport
- Unverify (optional early; include if you want “return to entry”)

## Idempotency
Commands must support safe retries:
- Accept `idempotency_key` header or field
- If repeated, return the same result without duplicating records

## Error rules
- Validation errors: 400 with field errors
- Invalid transition: 409 with domain error code
- Missing required results: 409 with explicit list of missing items/parameters

## Audit
Every command writes an audit event:
- event_type: e.g., `lims.order.created`
- include entity ids and minimal structured payload
