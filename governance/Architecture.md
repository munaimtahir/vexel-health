# Architecture.md
Date: 2026-02-18

## High-level overview
A modular monolith platform with shared core services and pluggable modules, plus two supporting processes:
- **Worker** for background jobs
- **PDF Service** for deterministic document rendering

### Components
1. **Web App** (Next.js)
   - Keyboard-first UX
   - Uses generated SDK
2. **API** (NestJS)
   - Multi-tenant, contract-first
   - Command/state-machine workflow engine
3. **Worker** (Node process)
   - BullMQ job processor (PDF renders, nightly jobs later)
4. **PDF Service** (.NET + QuestPDF)
   - Renders official PDFs from versioned payloads
5. **PostgreSQL**
6. **Redis**
7. **Object Storage**
   - Local filesystem for MVP; S3/MinIO compatible later

## Data flow (LIMS report publish)
1. Web calls API command: `PublishReport`
2. API builds **DocumentPayload v1** and chooses `document_type`
3. API calls PDF service `/render`
4. PDF service returns bytes + metadata (pdf hash)
5. API stores PDF in object storage and saves document record (payload hash, pdf hash, template version)
6. Web downloads/opens PDF via API document endpoint

## Boundaries
- Core services are reusable by all modules.
- Modules contain domain-specific rules and state machines.
- PDF service is isolated and stateless; it knows nothing about DB.

## Key architectural principles
- Deterministic, auditable workflows
- Contract-first APIs
- Strict tenant isolation
- Feature toggle governance
- Versioned documents and payloads

## Next.js App Router Discipline (Permanent Rules)

1. **App Router only**
   - `apps/web` MUST use the `/app` router exclusively.
   - The `/pages` directory is forbidden (remove if present), except if explicitly approved for a temporary migration window.

2. **No legacy data fetching**
   - `getServerSideProps` / `getStaticProps` / `getInitialProps` are forbidden.
   - Use Server Components, Route Handlers, and client components where appropriate.

3. **Routing APIs**
   - Use `next/navigation` in the App Router.
   - `next/router` is forbidden.

4. **API routes**
   - Use `app/api/**/route.ts` only.
   - `pages/api` is forbidden.

5. **Layout boundaries**
   - `/operator` and `/admin` MUST each have their own `layout.tsx` boundary.
   - Authentication/authorization checks happen at the layout boundary (or middleware), not scattered.

6. **Contract-first API consumption**
   - UI must call the backend ONLY via the `@vexel/contracts` generated SDK.
   - Direct `fetch()` to backend endpoints is forbidden unless the SDK cannot support it and an explicit exception is documented.

7. **Tenant isolation**
   - Never pass `tenant_id` via URL params or query strings.
   - Tenant context must come from auth/session only.

8. **No UI-derived workflow truth**
   - Workflow status shown in the UI must come from backend fields (derived status from backend allowed).

9. **Upgrade discipline**
   - Next major upgrades must be done via a dedicated migration PR with documented before/after build and smoke-test evidence.

10. **Enforcement**
    - CI checks MUST fail if `/pages` exists or if forbidden imports/usages are present (e.g. `npm run guardrails:next`).
