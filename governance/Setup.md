# Setup.md
Date: 2026-02-18

## Prerequisites
- Docker + Docker Compose
- Node.js (LTS)
- .NET SDK (for local PDF service dev) — optional if using container only

## Local dev
1. Copy env template:
   - `.env.example` → `.env`
2. Deploy/update stack (includes DB sync + admin bootstrap):
   - `npm run deploy:dev`
3. Manual equivalents (if needed):
   - `docker compose up -d --build`
   - `npm run db:push:dev`
   - `npm run seed:dev`

## Development admin bootstrap (persistent across deploys)
- `seed:dev` is idempotent and re-runs on every `deploy:dev`.
- It guarantees a tenant + domain mapping + admin account exist.
- Default credentials:
  - Host: `vexel.alshifalab.pk`
  - Email: `admin@vexel.dev`
  - Password: `Admin@123!`
- Override via `.env`:
  - `DEV_ADMIN_TENANT_ID`
  - `DEV_ADMIN_DOMAINS`
  - `DEV_ADMIN_EMAIL`
  - `DEV_ADMIN_PASSWORD`
  - `DEV_ADMIN_NAME`
  - `DEV_ADMIN_ROLE_NAME`

## Environments
- `dev`: local docker
- `prod`: VPS docker

## Access
- Web (direct): http://127.0.0.1:3001
- API (direct): http://127.0.0.1:3000
- PDF Service (direct): http://127.0.0.1:5000/health
- Web (domain): https://vexel.alshifalab.pk
- API (domain): https://vexel.alshifalab.pk/api/health

## Common commands
- `npm run contracts:generate`
- `npm run test`
- `npm run test:e2e --workspace=api`
- `npm run deploy:dev`
