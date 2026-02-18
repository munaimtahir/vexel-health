# DataModel.md
Date: 2026-02-18

This is a conceptual data model; exact schemas live in Prisma migrations.

## Core tables
### tenancy
- tenants(id, name, status, created_at)
- tenant_domains(id, tenant_id, domain, created_at)
- tenant_features(id, tenant_id, key, enabled, config_json)

### auth / rbac
- users(id, tenant_id, email, name, status, password_hash, created_at)
- roles(id, tenant_id, name)
- user_roles(user_id, role_id)
- permissions(id, key, description)
- role_permissions(role_id, permission_id)

### audit (append-only)
- audit_events(
    id, tenant_id, actor_user_id,
    event_type, entity_type, entity_id,
    payload_json, created_at, correlation_id
  )

### patients
- patients(id, tenant_id, mrn?, name, dob?, gender?, phone?, created_at)
- encounters(id, tenant_id, patient_id, type, started_at, ended_at?)

### billing
- invoices(id, tenant_id, patient_id, encounter_id?, status, total_amount, currency, created_at)
- invoice_items(id, invoice_id, item_type, item_ref_id, description, qty, unit_price, amount)
- payments(id, tenant_id, invoice_id, method, amount, received_at, reference?)

### documents
- documents(
    id, tenant_id,
    document_type, template_version,
    payload_version, payload_hash,
    file_path_or_object_key,
    pdf_hash, status, created_at, published_at?
  )

## LIMS tables (module)
### catalog
- tests(id, tenant_id, code, name, layout_type, print_group, print_priority, active)
- panels(id, tenant_id, code, name, active)
- panel_tests(panel_id, test_id, sort_order)
- parameters(id, tenant_id, test_id, name, unit, is_required, sort_order)
- ref_ranges(id, tenant_id, parameter_id, sex?, age_min_days?, age_max_days?, low?, high?, text_range?)

### workflow
- orders(id, tenant_id, patient_id, encounter_id?, status, created_at)
- order_items(id, tenant_id, order_id, test_id, panel_id?, price, status)
- results(id, tenant_id, order_item_id, status, entered_at, verified_at, verified_by?)
- result_values(id, tenant_id, result_id, parameter_id, value_text, value_num?, flag?, is_absent?)

## Notes
- Every table includes `tenant_id` except purely global reference tables (rare).
- Prefer immutable audit trail + controlled state transitions.
