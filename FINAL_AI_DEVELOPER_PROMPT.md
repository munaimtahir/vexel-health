# FINAL_AI_DEVELOPER_PROMPT.md
Date: 2026-02-18

You are the autonomous AI developer implementing Phase 0 and Phase 1 of the Vexel Health Platform.

## Read first (mandatory)
1) Platform-Constitution.md
2) Architecture.md
3) DataModel.md
4) DocumentEngine.md
5) Workflow.md
6) FeatureFlags.md
7) Tests.md
8) TASKS.md

## Target outcome (Phase 0 + Phase 1)
Deliver a running workspace with:
- apps/web (Next.js)
- apps/api (NestJS)
- apps/worker (BullMQ worker)
- apps/pdf (.NET + QuestPDF service skeleton)
- packages/contracts (OpenAPI + generated TS client)
- packages/ui (shared UI components)
- Docker Compose running Postgres + Redis + all apps
- Auth + tenancy scaffolding
- Feature flag scaffolding (`/me/features`)
- Audit event scaffolding
- Patients minimal (register/search)
- Documents module scaffolding (store metadata + file bytes placeholder)
- Health endpoints for API + PDF service

## Non-negotiable rules
- OpenAPI contract is authoritative; web uses generated client only.
- Every request input is runtime validated; field errors must be returned.
- TenantContext is required; no unscoped queries.
- No workflow transitions via CRUD.
- Keep modules isolated; no module-to-module imports.

## Repo structure (create exactly)
- apps/
  - web/
  - api/
  - worker/
  - pdf/
- packages/
  - contracts/
  - ui/
  - config/
- docs/ (optional later; do not duplicate dev-pack docs)
- .github/ISSUE_TEMPLATE/

## Implementation steps
### Step 1: Initialize workspace tooling
- Choose a workspace tool (pnpm workspaces preferred).
- Add root scripts:
  - `dev` (compose up)
  - `lint`, `test`
  - `contracts:generate` (OpenAPI → TS SDK)

### Step 2: Docker compose
- Services:
  - postgres
  - redis
  - api
  - web
  - worker
  - pdf
- Provide `.env.example` with required variables.

### Step 3: API scaffolding
- NestJS app with modules:
  - tenancy, auth, rbac (minimal), feature_flags, audit, patients, documents
- Standard error format (see API-Interfaces.md)
- Health endpoint: `/health`

### Step 4: Contracts
- Define OpenAPI spec for:
  - auth/login, auth/refresh
  - me, me/features
  - patients (create/search/get)
  - documents (placeholder)
- Generate TS client into packages/contracts and use it in web.

### Step 5: Web scaffolding
- Next.js app with:
  - Login
  - Minimal shell layout
  - Patients page (register/search)
- Use shadcn/ui + TanStack Query + RHF + Zod.
- API calls only through generated client.

### Step 6: PDF service skeleton
- .NET minimal API:
  - GET /health
  - POST /render (accepts request, returns placeholder PDF bytes for now)
- Include font bundling placeholder.

### Step 7: Tests
- Add minimal tests:
  - Contract generation check
  - One integration test: tenant isolation for patient list
  - PDF service health test

## Output requirements
- Update TASKS.md by checking completed boxes.
- Provide a short “What’s done / How to run” summary at end.

## TODO checklist (must include in your final response)
- [ ] Workspace scaffold created
- [ ] Docker compose runs all services
- [ ] OpenAPI contract + generated SDK integrated
- [ ] Auth + tenancy working
- [ ] /me/features returns flags
- [ ] Patients register/search working
- [ ] PDF service responds to /health and /render
- [ ] Minimal tests passing
