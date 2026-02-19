# TASKS.md
Date: 2026-02-18

This is the canonical checklist.

## Phase 0 — Skeleton
- [x] Create repository structure (apps/*, packages/*)
- [x] Docker compose: postgres, redis, api, web, worker, pdf
- [x] Auth + tenancy scaffolding
- [x] Feature flag scaffolding + /me/features
- [x] Audit event log scaffolding
- [x] OpenAPI pipeline + generated client used by web
- [x] Health endpoints for API + PDF

## Phase 1 — Core entities
- [x] Patients (register/search)
- [ ] Billing minimal (invoice + payment)
- [ ] Documents registry + storage + hashes
- [ ] Tenant branding config storage

## Phase 2 — LIMS MVP
- [x] Catalog engine (tests/parameters/panels/ranges)
- [x] Order creation command
- [ ] Record payment command
- [x] Result entry command + UI
- [x] Verification command + UI
- [x] Publish report command
- [x] Encounter preparation command (`/lims/commands/updateEncounterPrep`) for LAB sample capture (ordering allowed before prep)
- [x] Operator LAB pathway polish: register -> select tests -> print receipt -> samples(collected=received) -> result-entry(draft + submit) -> verify -> published queues with patient context

## Phase 3 — PDF Service
- [ ] Implement /render in QuestPDF service
- [ ] Template families v1 (single/panel/hematology/receipt/form)
- [ ] Store template_version + payload_version + hashes
- [ ] PDF smoke tests

## Phase 4 — Bulk import
- [ ] XLSX import v1 with validation report
- [ ] Duplicate detection rules

## Phase 5 — SaaS hardening
- [ ] Tenant provisioning UI
- [ ] Plan presets + overrides
- [ ] Admin monitoring (jobs, pdf failures)
- [x] Web admin scaffold: Business & Users + Catalog Settings routes/navigation/theme placeholders (2026-02-19)
- [x] Admin business design scaffold: Branding -> Report Design and Receipt Design metadata pages (2026-02-19)

## Phase 4C — LAB hardening
- [x] Centralized LAB RBAC permissions and guarded LAB write endpoints
- [x] LAB enter/verify/publish idempotency and concurrency hardening
- [x] Domain error precision for LAB + finalize blocking
- [x] Document tenancy negative-path validation for LAB publish/download
- [x] LAB command audit persistence with failure reason payloads
- [x] Catalog integrity normalization + reference-range ambiguity guard

## Audit evidence
- [x] 2026-02-19: workflow audit artifacts generated under `_audit_evidence/workflow_audit/`
- [x] 2026-02-19: LAB verify now auto-finalizes encounter when all ordered tests are VERIFIED; LAB publish is gated to `FINALIZED`/`DOCUMENTED` for consistent encounter+operator workflow
- [x] 2026-02-19: API lint/build stabilization completed (Prisma prebuild generation + zero-warning lint baseline for tests)
