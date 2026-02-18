# AGENTS.md
Date: 2026-02-18

Canonical AI agent governance for this repository. This file merges and supersedes the previous `AGENT.md` and `AGENTS.md`.

## 1) Mission and scope
Build a multi-tenant, modular healthcare operations platform with LIMS-first MVP delivery and deterministic PDF publishing.

MVP workflow target:
- Register Patient -> Create Order -> Record Payment -> Enter Results -> Verify -> Publish PDF

MVP outcomes:
- Multi-tenant foundation with feature flags
- Contract-first API and generated client usage
- Deterministic, versioned PDFs through dedicated PDF service

MVP non-goals:
- Microservice split beyond worker + PDF service
- Advanced billing plans/Stripe
- Full HL7/FHIR integration
- Full RIMS/OPD/BloodBank business logic

## 2) Mandatory governance documents
Before major work, review files in `governance/` in this order:
1. `governance/Platform-Constitution.md` (binding law)
2. `governance/Architecture.md`
3. `governance/DataModel.md`
4. `governance/Workflow.md`
5. `governance/DocumentEngine.md`
6. `governance/API-Interfaces.md`
7. `governance/FeatureFlags.md`
8. `governance/Tests.md`
9. `governance/QA-Checklist.md`
10. `governance/TASKS.md`
11. `governance/Setup.md`

If code conflicts with `governance/Platform-Constitution.md`, code must change.

## 3) Non-negotiable platform rules
- OpenAPI is the source of truth for API contracts.
- Web/mobile clients use generated SDKs only. No ad-hoc payloads.
- Validate request inputs at runtime and return field-level validation errors.
- Workflow transitions occur only through commands guarded by state machines.
- Do not mutate workflow state via raw CRUD endpoints.
- Every domain table is tenant-scoped and every query is tenant-scoped.
- Feature flags are backend-authoritative and enforced server-side.
- Official published PDFs are generated only by the PDF service.
- Published document records must store payload/template versions and content hashes.
- Keep modules isolated; no module-to-module internal imports.

## 4) Repository structure and boundaries
This repository is an npm workspace monorepo:
- `apps/api`: NestJS API (`src/`, `test/`, `prisma/`)
- `apps/web`: Next.js frontend (`app/`, `components/`, `lib/`)
- `apps/worker`: BullMQ/Redis worker (`src/index.ts`)
- `apps/pdf`: .NET + QuestPDF rendering service (`Program.cs`)
- `packages/contracts`: shared OpenAPI-generated types (`openapi.yaml`, `src/schema.d.ts`)
- `packages/ui`: shared React UI package

Core boundary model:
- `core/*` for reusable platform capabilities (auth, tenancy, audit, documents, billing, patients)
- `modules/*` for product modules (lims, rims, bloodbank, opd)
- Cross-module interaction only through core services or published interfaces/events

Do not hand-edit generated outputs such as:
- `apps/api/dist/*`
- `packages/contracts/dist/*`

## 5) Build, setup, and commands
- Primary environment is Docker Compose.
- Copy `.env.example` to `.env` for local setup.
- `npm run dev`: start local stack
- `docker compose up --build`: rebuild and run all services
- `npm run lint`: run workspace linters
- `npm run test`: run workspace tests
- `npm run contracts:generate`: regenerate contract types from OpenAPI
- `npm run start:dev --workspace=api`: run API in watch mode
- `npm run dev --workspace=web`: run web locally

Prefer deterministic and idempotent commands. Do not add dependencies unless necessary and documented.

## 6) Coding and design conventions
- TypeScript strict mode is expected; avoid `any` unless justified.
- Use explicit types for external interfaces and command/result boundaries.
- Naming conventions: PascalCase for components/classes, camelCase for variables/functions, kebab-case for route folders.
- API linting/prettier config: `apps/api/eslint.config.mjs`
- Web linting config: `apps/web/eslint.config.mjs`

## 7) Workflow and command model (LIMS)
Primary commands:
- `CreateOrder`
- `RecordPayment`
- `EnterResults`
- `VerifyResults`
- `PublishReport`
- Optional: `Unverify`

State machine guidance:
- Order: `DRAFT -> ENTERED -> VERIFIED -> PUBLISHED`
- Optional sample path: `DRAFT -> PAID -> COLLECTED -> RECEIVED -> ENTERED -> VERIFIED -> PUBLISHED`
- Result: `DRAFT (optional) -> ENTERED -> VERIFIED`

Idempotency:
- Commands must support safe retries via idempotency key and return stable results on replay.

Audit:
- Every command writes an audit event with entity ids and minimal structured payload.

## 8) API and error handling standards
Validation error (`400`):
- Structured `validation_error` with field-level messages

Domain rule violation (`409`):
- Structured `domain_error` with `code` + `message`

Auth errors (`401`/`403`):
- Standard JSON without leaking details

Unexpected errors (`500`):
- Generic user-facing message
- Detailed logs with correlation id

Never expose internal stack details, PHI/PII, or tenant identifiers in user-visible errors.

## 9) Document engine rules
- Document types are stable identifiers (for example `lims.report.single.v1`).
- Payload versions and template versions are independent and immutable once published.
- Store `payload_hash = sha256(canonical_json(payload))` and `pdf_hash = sha256(pdf_bytes)`.
- Reprint should return identical stored bytes when possible.
- PDF service must be stateless, deterministic, and use pinned bundled fonts.
- Tenant branding is input data and versioned configuration.

## 10) Testing and release gates
Primary framework is Jest in API:
- Unit tests: `*.spec.ts` in `apps/api/src`
- E2E tests: `*.e2e-spec.ts` in `apps/api/test`
- Commands: `npm run test --workspace=api`, `npm run test:e2e --workspace=api`, `npm run test:cov --workspace=api`

Release blocking checks:
- Contract generation succeeds
- Unit tests pass
- LIMS happy-path E2E tests pass
- Cross-tenant isolation tests pass
- PDF smoke tests pass

Coverage thresholds are not yet enforced; maintain or improve touched-area coverage.

## 11) Security, privacy, and tenancy
- Never log PHI/PII in plaintext.
- Mask identifiers and phone numbers in debug logs where possible.
- Enforce tenant isolation in all queries and handlers.
- Enforce auth and role checks on protected actions.
- Feature flag changes must be audited with actor and reason.

## 12) Definition of done for each task
- Code compiles
- Tests updated/added and passing for touched behavior
- Contract regenerated if API changed
- Lint passes
- Smoke test instructions updated when needed
- `governance/TASKS.md` updated with clear checkbox progress
- Documentation updated for architectural or behavior changes

## 13) Branching and PR rules
- Branch names: `feature/*` or `fix/*`
- Prefer Conventional Commits: `feat:`, `fix:`, `chore:`
- Keep PRs small and behavior-focused
- Include test evidence and documentation updates where relevant
- Do not break contract generation

## 14) Practical execution rules for AI agents
- Keep changes small, testable, and reversible.
- Never invent endpoints/payloads without updating OpenAPI and regenerated contracts.
- Never bypass command/state-machine workflow transitions.
- Keep all code multi-tenant safe.
- Update docs with each architectural decision or change.
