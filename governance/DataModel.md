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
- admin_user_invites(
    id, tenant_id, email, name, role_names_csv,
    status[pending|accepted|revoked|expired], expires_at,
    invited_by_user_id?, accepted_by_user_id?, accepted_at?, revoked_at?, created_at
  )

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

### catalog jobs
- catalog_import_jobs(
    id, tenant_id, file_name, mode, status,
    processed_rows, success_rows, failed_rows, error_json, created_by?, created_at, updated_at
  )
- catalog_export_jobs(
    id, tenant_id, entity, status, file_name?, file_bytes?,
    created_by?, created_at, updated_at
  )

### tenant business config
- tenant_branding_config(
    tenant_id, business_name, address, phone, header_line_1, header_line_2,
    logo_asset_name?, header_asset_name?, footer_asset_name?, updated_by?, updated_at
  )
- tenant_report_design_config(tenant_id, typed layout fields..., updated_by?, updated_at)
- tenant_receipt_design_config(tenant_id, typed layout fields..., updated_by?, updated_at)

### workflow
- orders(id, tenant_id, patient_id, encounter_id?, status, created_at)
- order_items(id, tenant_id, order_id, test_id, panel_id?, price, status)
- results(id, tenant_id, order_item_id, status, entered_at, verified_at, verified_by?)
- result_values(id, tenant_id, result_id, parameter_id, value_text, value_num?, flag?, is_absent?)

## Notes
- Every table includes `tenant_id` except purely global reference tables (rare).
- Prefer immutable audit trail + controlled state transitions.
