# TRUTH_MAP
Date: 2026-02-18

## Runtime Truth (after Phase 0-2 execution)
- Monorepo uses npm workspaces as primary package manager (`package-lock.json` retained, `pnpm-workspace.yaml` removed).
- Services present and wired through Docker Compose:
  - `api` (NestJS) on `127.0.0.1:3000`
  - `web` (Next.js) on `127.0.0.1:3001`
  - `pdf` (.NET) on `127.0.0.1:5000`
  - `worker` (BullMQ)
  - `postgres`, `redis` (internal only)
- Governance docs are centralized under `governance/` and root `AGENTS.md` is canonical.

## Implemented vs Required (Phase 0-2)
### Implemented
- Contract-first API upgraded and regenerated into `@vexel/contracts`.
- Tenancy guardrails:
  - Host-based tenant resolution in middleware.
  - Dev fallback via `x-tenant-id` only when `TENANCY_DEV_HEADER_ENABLED=1`.
- Standardized API error envelope globally (validation/domain/auth/not_found/unexpected/not_implemented).
- Patient registration/search/get endpoints with immutable tenant-scoped RegNo sequence (`REG-{SEQ8}`).
- Encounter create/list/get endpoints with tenant+type+year encounter code (`{TYPE}-{YYYY}-{SEQ6}`).
- Encounter command endpoints:
  - `:start-prep`, `:start-main`, `:finalize` implemented with guarded transitions.
  - `:document` returns `501` deferred stub.
- Web minimal flow:
  - Login, patient register/list/search, create encounter, encounter detail.
  - Typed client usage via `@vexel/contracts`.
  - Field-level error rendering from API envelope.
- Integration test proving cross-tenant isolation passes.
- Docker stack up with API/PDF health endpoints responding.

### Remaining / Deferred
- Worker processing logic beyond startup scaffold.
- Full PDF native QuestPDF runtime chain (service has deterministic fallback PDF path for resilience).
- Full production Caddy reload from this session (permission-limited); exact block + commands delivered in docs.

## Key Drift Resolved in Session
- API contract drift fixed for encounters and patient details.
- Naming drift fixed: `encounterCode` and `regNo` surfaced in API contract + web.
- Workflow statuses aligned to locked defaults (`CREATED -> PREP -> IN_PROGRESS -> FINALIZED -> DOCUMENTED` with `DOCUMENTED` currently deferred command).
