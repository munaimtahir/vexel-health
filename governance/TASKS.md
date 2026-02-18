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
- [ ] Catalog engine (tests/parameters/panels/ranges)
- [ ] Order creation command
- [ ] Record payment command
- [ ] Result entry command + UI
- [ ] Verification command + UI
- [ ] Publish report command

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
