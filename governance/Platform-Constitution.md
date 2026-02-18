# Platform Constitution
Date: 2026-02-18

This document is **law** for this repository. If code conflicts with this document, the code must change.

## 1. Mission
Build a **multi-tenant, modular healthcare operations platform** where tenants can enable/disable modules (LIMS, RIMS, Blood Bank, OPD) and sub-features without redeploying. The system must be:
- Fast, keyboard-first, “calendar-entry” UX on web
- Future mobile-ready over the same backend
- Deterministic and auditable for clinical workflows
- Printing-first with **designed, deterministic PDFs** via a dedicated PDF service

## 2. Non‑negotiable architecture choices
### 2.1 Repository Structure
Single repo containing:
- Web (Next.js)
- API (NestJS)
- Worker (BullMQ)
- PDF service (.NET + QuestPDF)
- Shared packages (contracts, UI, config)

### 2.2 Contract-first APIs
- **OpenAPI is the source of truth.**
- Web/mobile clients must use **generated SDK** only.
- No ad-hoc fetch payloads.

### 2.3 Runtime validation
- All request inputs are validated at runtime.
- Validation errors are returned with **field-level** messages.
- “Internal server error” must not be shown to users for validation problems.

### 2.4 Workflow by Commands + State Machines
Clinical workflows are executed through **commands** and guarded by **state machines**.
- No endpoint may “silently” mutate workflow state.
- No state transitions occur via raw CRUD endpoints.

### 2.5 Tenant isolation
- Every domain table includes `tenant_id`.
- Every query executes inside a **TenantContext**.
- Cross-tenant leakage is treated as a critical security defect.

### 2.6 Feature Flags (3 layers)
Feature control is **one system**, used everywhere:
- Platform features
- Module toggles
- Module sub-feature toggles

Backend is authoritative; frontend hiding is cosmetic.

### 2.7 Printing / Documents
- Official published PDFs are generated only by the **PDF Service** (QuestPDF).
- All documents are **versioned** (payload version + template version).
- Published PDFs are **reproducible** (store hashes + template version).

## 3. Repository boundaries
### 3.1 Core vs Modules
- `core/*` = shared platform capabilities (auth, tenancy, documents, audit, billing, patients).
- `modules/*` = product modules (lims, rims, bloodbank, opd).

**Rule:** Modules may not import other modules’ internals. Cross-module interaction happens only through:
- `core/*` services
- published interfaces/events

### 3.2 Import discipline
- Enforce import boundaries via lint/tsconfig path rules.
- No circular dependencies across core/modules.

## 4. Data correctness rules
- Use DB constraints for integrity (FKs, unique constraints, indexes).
- All workflow transitions create audit events.
- Published documents store `payload_hash` and `pdf_hash`.

## 5. Mobile readiness rules
Backend is client-agnostic.
- JWT-based auth (no session-only assumptions)
- Consistent pagination and error format
- File delivery supports mobile (streaming / pre-signed URLs optional later)
- No UI-specific server assumptions (no server-rendered flows)

## 6. Testing gates
A release is blocked unless:
- Contract generation succeeds
- Unit tests pass
- E2E workflow tests pass for LIMS happy path
- Cross-tenant isolation tests pass
- PDF render smoke tests pass

## 7. “No legacy” policy
No backward-compatibility or legacy normalization code unless explicitly required by real data migration.
This project starts with a clean database.

## 8. Decision record
This constitution is binding unless updated via a documented ADR (Architecture Decision Record).
