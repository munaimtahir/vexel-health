# Phase 3B PREP Data
Date: 2026-02-18

## Summary
Phase 3B adds typed, tenant-scoped PREP data per encounter type and turns PREP into a real workflow stage.

New API endpoints:
- `POST /encounters/{id}:save-prep`
- `GET /encounters/{id}/prep`

Existing transitions retained:
- `POST /encounters/{id}:start-prep`
- `POST /encounters/{id}:start-main`

## Data Model
Each PREP table is tenant-scoped with one row per encounter:
- `LabEncounterPrep`
- `RadEncounterPrep`
- `OpdEncounterPrep`
- `BbEncounterPrep`
- `IpdEncounterPrep`

All have:
- `id`, `tenantId`, `encounterId`, `createdAt`, `updatedAt`
- unique constraints on `encounterId` and `(tenantId, encounterId)`

BB includes urgency enum:
- `BbUrgency = ROUTINE | URGENT`

## Validation and Safety
- Encounter lookup is tenant-scoped for both save and get.
- Payload shape is validated against encounter type.
  - If fields do not belong to the encounter type, API returns `409` domain error code `INVALID_ENCOUNTER_TYPE`.
- LAB progression gate at `:start-main`:
  - requires `specimenType` in LAB prep.
  - if missing, API returns `409` domain error code `PREP_INCOMPLETE`.
- Other encounter types are currently non-blocking for `:start-main` in MVP.

## Response Contract
`EncounterPrepResponse` returns:
- `encounterId`
- `type`
- `updatedAt`
- typed prep blocks (`labPrep`, `radPrep`, `opdPrep`, `bbPrep`, `ipdPrep`) where only the relevant one is populated.

## UI Behavior
Encounter detail page now:
- shows typed PREP forms when status is `PREP`
- saves via `:save-prep`
- proceeds via `:start-main`
- shows read-only PREP summary for all statuses

## Tests Added
`apps/api/test/encounter-prep.e2e-spec.ts` covers:
- LAB prep happy path (`start-prep` -> `save-prep` -> `get prep` -> `start-main`)
- tenant isolation for prep reads
- type mismatch handling (`INVALID_ENCOUNTER_TYPE`)
