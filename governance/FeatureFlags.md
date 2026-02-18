# FeatureFlags.md
Date: 2026-02-18

## Key naming
Use dot-separated keys.

### Platform
- `platform.documents`
- `platform.billing`
- `platform.audit`

### Modules
- `module.lims`
- `module.rims`
- `module.bloodbank`
- `module.opd`

### Sub-features
- `lims.sample_workflow`
- `lims.result_verification`
- `lims.auto_print_on_publish`

## Governance rules
- Backend is authoritative: every protected action checks `FeatureService.can(tenant, key)`.
- Frontend uses `/me/features` to hide/show menus but must not be trusted.

## Storage
- Tenant feature flags stored in DB: `tenant_features`
- Optional: plan presets define default flags; tenant overrides are layered.

## Audit
- Any feature change is audited with actor and reason.
