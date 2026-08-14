# Story 3.5: CSV Export

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want to export the session roster as CSV with every configured field as a column,
so that I can take attendance and rosters out of the app.

## Acceptance Criteria

1. GIVEN I am the admin WHEN I export CSV THEN the file contains columns for group, member name, email, and every configured field.
2. GIVEN a field value is blank and the field is optional WHEN the CSV is generated THEN the cell is omitted (left blank).
3. GIVEN a session is archived WHEN I export its CSV THEN the export still works with all data intact.
4. GIVEN a non-admin requests the export WHEN the endpoint is called THEN it is rejected (export CSV is admin-only).

## Tasks / Subtasks

- [ ] CSV export endpoint (AC: 1, 4)
  - [ ] Add `GET /sessions/{code}/admin/export.csv` with admin-token authorization (AD-3) and a `can?('export csv', role)` server-side check (AD-5).
  - [ ] Stream the CSV (Laravel streamed response) with `text/csv` + attachment headers; columns: group, member name, email, then fields in config order.
- [ ] Dynamic field columns (AC: 1, 2)
  - [ ] Build columns dynamically from the session config `fields` (AD-8); read values from `groups.field_values` JSON keyed by field id (AD-7).
  - [ ] Omit blank cells for optional fields (PRD assumption: email optional; CSV omits blanks).
- [ ] Archived-session support (AC: 3)
  - [ ] Export reads session state regardless of status; archived sessions export their full data (CAP-1).
- [ ] Export correctness check (AC: 1, 2)
  - [ ] Consistent column order and escaping (names/values with commas/quotes handled); one row per active membership.

## Dev Notes

- AD-8: field definitions live in the session config; CSV columns are built dynamically from config — no rigid export columns, no migration per field.
- AD-4: the export reads fields from the one validated config object via the config resolver (E4S1).
- AD-7: rows come from `memberships` joined to `participants` and `groups`; values from `groups.field_values` JSON.
- AD-5: `export csv` is admin-only in the default matrix; enforced server-side, UI renders the export button only from the allowed-action set.
- AD-3: admin routes are authorized by the per-session admin token.
- NFR-6: CSV export is the data exit hatch for the ephemeral-first model.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/specs/spec-groupify/flexibility-model.md#surfaces]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]

# Traceability

- FR: FR-5.5 | CAP: CAP-5 | AD: AD-3, AD-4, AD-5, AD-7, AD-8

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-5-csv-export.md
