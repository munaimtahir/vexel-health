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
