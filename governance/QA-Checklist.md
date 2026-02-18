# QA-Checklist.md
Date: 2026-02-18

## UX
- Keyboard-first navigation works
- No unnecessary loading spinners
- Forms show field errors clearly

## Data integrity
- Tenant isolation verified
- State machine rejects invalid transitions
- Required parameters enforced correctly

## Reporting
- Published PDFs deterministic (hash recorded)
- Branding applied correctly
- Multi-page tables do not break layout

## Observability
- Correlation ID present in API responses
- Errors logged with context (without PHI)

## Security basics (MVP)
- JWT auth required on protected endpoints
- Role checks enforced
- No debug endpoints in production

## Regression
- E2E workflow tests pass
