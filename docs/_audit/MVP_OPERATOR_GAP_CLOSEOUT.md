# MVP Operator Gap Closeout

**Date:** 2026-02-19  
**Deploy run:** docs/_audit/DEPLOY_RUNS/20260219_1400/

## What was missing (gaps)

1. **Payment recording (encounter-scoped)** — No API or UI to create an invoice for an encounter or record a payment (e.g. amount, method, reference).
2. **Verification queue** — No endpoint or page to list lab order items pending verification (status RESULTS_ENTERED) with patient/encounter context for the tenant.
3. **Admin overview** — No GET /admin/overview or /admin page with tenant-scoped counts (encounters by status, verification queue count, published last 24h), PDF service health, catalog summary, feature flags.
4. **Global derived Lab Encounter Status** — No single derived status for lab encounters; risk of UI status drift between list/detail. Need DRAFT | ORDERED | RESULTS_ENTERED | VERIFIED | PUBLISHED derived from encounter + lab items + document state.

## What was added (2026-02-19)

- **Endpoints:**
  - `POST /encounters/{id}/payments` — record payment for encounter; create-or-use invoice; returns invoice summary + payments.
  - `GET /lab/verification-queue` — tenant-scoped list of lab order items (RESULTS_ENTERED) with patient and test context and derived_encounter_status.
  - `GET /admin/overview` — tenant-scoped counts (encounters by derived status, verification queue count, published last 24h), PDF service health (cached 60s), catalog counts, feature flags.
- **Pages:**
  - `/verification` — table from verification queue; Open encounter, Verify (calls lab-verify); user-readable errors.
  - Billing card on encounter detail — invoice summary (after first payment), form (amount, method, reference), Record payment via SDK; refresh on success.
  - `/admin` — cards for counts, PDF health, catalog, feature flags from GET /admin/overview.
- **Derived status:** Pure derived `labEncounterStatus` (DRAFT | ORDERED | RESULTS_ENTERED | VERIFIED | PUBLISHED) from encounter + lab items + document state. Exposed on encounter detail, encounter list (LAB only), and verification queue items. No stored redundant field. Helper `deriveLabEncounterStatus()` in API with unit tests.
- **Nav:** Layout links to Patients, Verification, Admin.
- **E2E:** Lab workflow e2e extended with record-payment step; assertion that document metadata includes id and payloadHash. Document-pipeline mock extended with `labOrderItem.findMany` for encounter detail derived status.
