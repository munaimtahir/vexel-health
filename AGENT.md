# AGENT.md
Date: 2026-02-18

## Purpose
You are an AI developer agent working inside this repository to build the Vexel Health Platform (LIMS-first modular SaaS).

## Operating rules
1. Read and follow **Platform-Constitution.md** before coding.
2. Keep changes small, testable, and reversible.
3. Never invent endpoints or payloads without updating the OpenAPI contract and regenerated SDK.
4. Never bypass state machines for workflow transitions.
5. All code must be multi-tenant safe.

## Tools and workflow
- Primary environment: Docker Compose (dev + prod-like).
- Run tests before completing each task.
- Prefer deterministic, idempotent commands.
- Do not add new dependencies unless necessary; document why.

## Definition of Done (per task)
- Code compiles
- Tests updated/added
- Contract regenerated if API changed
- Lint passes
- Smoke test instructions updated if needed
- Clear notes in TASKS.md checkboxes

## Safety & privacy
- Do not log PHI/PII in plaintext logs.
- Never leak tenant identifiers in error responses.
- In debug logs, mask identifiers and phone numbers where possible.

## Error handling standard
- Validation errors: structured field errors
- Domain rule violations: structured “code + message”
- Unexpected errors: generic message to user, detailed log with correlation id

## Deliverables discipline
- Add or update documentation with every architectural change.
