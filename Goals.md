# Goals.md
Date: 2026-02-18

## MVP (LIMS-first)
### Outcomes
- Multi-tenant foundation with feature flags
- LIMS core workflow end-to-end in web UI:
  Register Patient → Create Order → Record Payment → Enter Results → Verify → Publish PDF
- Deterministic PDF reports (QuestPDF service)
- Seed catalog for Biochemistry + Hematology
- Bulk catalog import v1 (XLSX) after MVP workflow is stable

### Non-goals for MVP
- Microservices split (beyond PDF service and worker)
- Advanced billing plans, Stripe, etc.
- Full HL7/FHIR integration (defer)
- RIMS/OPD/BloodBank module logic (defer)

## v1.0 (Commercial SaaS)
- Tenant provisioning + plan presets
- Module toggles + sub-feature toggles in Admin
- Monitoring dashboards (jobs, PDF failures)
- Data export utilities
- Mobile client readiness validated (auth, errors, pagination)

## B-Ready (later)
- Optional Postgres RLS
- SSO (OIDC/SAML)
- Advanced audit retention policies
- Template editor UI (if needed)
