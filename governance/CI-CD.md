# CI-CD.md
Date: 2026-02-18

## Workspace build strategy
Use path-based builds to deploy only what changed:
- apps/web
- apps/api
- apps/worker
- apps/pdf
- packages/*

## Pipelines (minimum)
1. Lint + typecheck
2. Unit tests
3. Contract generation check (must be clean)
4. Build docker images
5. Optional: E2E tests on staging

## Deployment
- VPS via Docker Compose
- Build and pull tagged images
- Run migrations (API) safely
- Restart services
- Verify health endpoints

## Versioning
- Semantic version for templates and payloads
- App releases tracked via git tags later
