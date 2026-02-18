# Tests.md
Date: 2026-02-18

## Test layers
### Unit tests
- Core utilities (validation, hashing, tenant context)
- State machine transition rules
- PDF payload canonicalization

### Integration tests
- API endpoints with DB
- Tenant isolation tests (A cannot read B)
- Command idempotency tests

### E2E tests (release gate)
Simulate the full LIMS flow:
1. Login
2. Register patient
3. Create order (Albumin + CBC + one panel)
4. Record payment
5. Enter results
6. Verify
7. Publish report
8. Download PDF and verify:
   - status is published
   - pdf exists
   - pdf_hash recorded

### PDF smoke tests
- Render each template family with fixture payloads
- Validate:
  - PDF bytes non-empty
  - hash stable (for pinned template version)
  - number of pages within expected range (basic sanity)

## Cross-tenant leakage tests (mandatory)
- Create Tenant A + B
- Create patient/order in A
- Ensure B cannot:
  - list, read, update, publish documents
