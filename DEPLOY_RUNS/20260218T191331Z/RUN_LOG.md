# Run Log
Timestamp: 20260218T191331Z

## Session bootstrap
- Verified repo root: `/home/munaim/srv/apps/vexel-health`
- Enumerated project structure under `apps/*` and `packages/*`
- Detected existing in-flight doc reorganization changes in git status

## Truth-map initialization
- Created `docs/TRUTH_MAP.md` with baseline repository reality, drift analysis, and execution plan.

## Integration cleanup
- Restored `apps/api/dist/*` to avoid committing generated runtime build artifacts.
- Removed stale `packages/contracts/src/schema.d.ts` in favor of generated `src/schema.ts`.

## Docker build fix
- Initial `docker compose up -d --build` failed at API image build.
- Root cause: Prisma client generation happened after API TypeScript build in container.
- Fix: reordered API Dockerfile to run `prisma generate` before `npm run build --workspace=api`.
- Added root `.dockerignore` to reduce docker build context size and speed up rebuilds.

## Runtime resilience fixes
- Updated PDF service to avoid startup crash from native QuestPDF dependency failures; `/render` now uses QuestPDF when available with deterministic fallback bytes otherwise.
- Updated worker Dockerfile to run from root npm workspace so shared tsconfig paths resolve.
- Preparing compose patch to use root build context for worker and API restart policy for DB warm-up race.

## Service runtime fixes (post-compose)
- Updated tenancy middleware to bypass `/health` so health checks do not require tenant/domain tables.
- Updated worker Redis connection wiring to avoid ioredis type mismatch crash in container runtime.

## Toolchain verification
- `npm install` -> success
- `npm run contracts:generate` -> success
- `npm run build --workspace=@vexel/contracts` -> success
- `npm run build --workspace=api` -> success (after `prisma generate`)
- `npm run test --workspace=api -- --runInBand` -> success
- `npm run test:e2e --workspace=api -- --runInBand` -> success
- `npm run build --workspace=web` -> success
- `npm run lint` -> success (api warnings only; no errors)
- `npm run test` -> success

## Docker / runtime
- Initial compose build failed due:
  - api Dockerfile order (`prisma generate` needed before `build`)
  - host port collisions (`5432`, `6379`)
- Fixes applied:
  - API Dockerfile order corrected
  - Removed host port bindings for postgres/redis
  - Added `.dockerignore`
  - Worker build context switched to repo root workspace
  - API restart policy and health-route tenancy bypass
  - PDF runtime fallback for native dependency failures
- Final:
  - `docker compose up -d --build` successful
  - `docker compose ps` shows services up
  - `curl http://127.0.0.1:3000/health` -> `{"status":"ok","service":"api"}`
  - `curl http://127.0.0.1:5000/health` -> `{"status":"ok"}`

## DB init + seed
- `docker compose exec -T api npx prisma db push --schema prisma/schema.prisma` -> success
- Seeded tenant/domain/user via Prisma script in api container:
  - tenant: `11111111-1111-1111-1111-111111111111`
  - user: `demo@vexel.dev` / `demo123`

## Smoke flow
- Login success (`/auth/login`) with tenant header.
- Patient create success:
  - `regNo=REG-00000001`
- Encounter create success:
  - `encounterCode=LAB-2026-000001`
  - `status=CREATED`
- Command transitions success:
  - `:start-prep` -> `PREP`
  - `:start-main` -> `IN_PROGRESS`
  - `:finalize` -> `FINALIZED`
  - `:document` -> HTTP 501 with `not_implemented`
- Cross-tenant read check:
  - GET patient under different tenant -> HTTP 404

## Caddy
- Existing `vexel.alshifalab.pk` block detected in `/home/munaim/srv/proxy/caddy/Caddyfile`.
- `caddy validate/reload` from current user failed due permissions to `/home/munaim/srv/proxy/caddy/logs/error.log`.
- Wrote exact block + sudo commands to `docs/CADDY_BLOCK_vexel.alshifalab.pk.txt`.

## Final verification pass
- Re-ran:
  - `npm run build --workspace=@vexel/contracts` -> success
  - `npm run build --workspace=api` -> success
  - `npm run build --workspace=web` -> success
  - `npm run test:e2e --workspace=api -- --runInBand` -> success
  - `npm run lint` -> success (warnings only in api tests)
  - `npm run test` -> success

## Live health checks
- `curl http://127.0.0.1:3000/health` -> `{"status":"ok","service":"api"}`
- `curl http://127.0.0.1:5000/health` -> `{"status":"ok"}`

## Smoke evidence snapshot
- Login: success for `demo@vexel.dev` with dev tenant header.
- Patient create: `regNo=REG-00000001`.
- Encounter create: `encounterCode=LAB-2026-000001`, `status=CREATED`.
- Command transitions:
  - `:start-prep` => `PREP`
  - `:start-main` => `IN_PROGRESS`
  - `:finalize` => `FINALIZED`
  - `:document` => HTTP 501 (`not_implemented`)
- Cross-tenant patient read attempt => HTTP 404.

## Final container snapshot
- `docker compose ps` shows all services up:
  - api, web, worker, pdf, postgres, redis
