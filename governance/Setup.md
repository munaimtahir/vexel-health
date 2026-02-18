# Setup.md
Date: 2026-02-18

## Prerequisites
- Docker + Docker Compose
- Node.js (LTS)
- .NET SDK (for local PDF service dev) — optional if using container only

## Local dev
1. Copy env template:
   - `.env.example` → `.env`
2. Start stack:
   - `docker compose up --build`
3. Apply migrations:
   - API container runs migrations on startup (or run a command script)
4. Seed:
   - run `seed:dev` to load demo tenant + users + starter catalog

## Environments
- `dev`: local docker
- `prod`: VPS docker

## Access
- Web: http://localhost:3000
- API: http://localhost:4000
- PDF Service: http://localhost:4010/health

## Common commands
- regenerate contracts
- run unit tests
- run E2E tests
(Exact scripts to be added in package.json and documented as they are implemented.)
