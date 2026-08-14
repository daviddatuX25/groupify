# Story 4.2: Fields System

Status: ready-for-dev

## Story

As a developer,
I want the fields system built as configuration (not schema),
so that admins can add per-group fields that appear on create/edit forms, board cards, search, and CSV with no migrations.

## Acceptance Criteria

1. GIVEN I am the admin WHEN I add a text field (e.g. required "Chosen topic") THEN the field appears on group create/edit forms without any migration.
2. GIVEN a group has field values WHEN the board renders THEN those values appear on the group card.
3. GIVEN I search the board WHEN the query matches a field value THEN the matching group is shown (field values are searchable/filterable).
4. GIVEN a required field is empty WHEN a leader submits the group create/edit form THEN submit is blocked until it is filled.
5. GIVEN a field is configured with `in_csv` WHEN I export CSV THEN it appears as a column.

## Tasks / Subtasks

- [ ] Field definitions in config (AC: 1)
  - [ ] Add admin route to add/edit a field `{ name, type: text, required, filled_by, on_card, in_csv, filterable }` into config `fields[]` (AD-4, AD-8, flexibility-model attributes).
  - [ ] Validate the field definition; commit then broadcast the config change (AD-1, AD-6).
- [ ] Field values storage (AC: 2, 4)
  - [ ] Store values in `groups.field_values` JSON keyed by field id (AD-7, AD-8); no columns, no migrations.
  - [ ] Enforce required fields on group create/edit submit (FR-4.4).
- [ ] Group create/edit form (AC: 1, 4)
  - [ ] Render all configured fields from the config resolver (E4S1) on the group create/edit form; required fields block submit (filled_by leader).
- [ ] Board card + search (AC: 2, 3)
  - [ ] Render `on_card` field values on the grid card from the snapshot (AD-6).
  - [ ] Board search matches group name or field values; `filterable` fields participate in the "open slots only" filter surface (FR-3.4).
- [ ] CSV column (AC: 5)
  - [ ] CSV export builds columns dynamically from `in_csv` fields (AD-8; builds on E3S5).

## Dev Notes

- AD-8: field definitions live in the session config; values stored as JSON keyed by field id; CSV columns built dynamically from config — adding a field is a config change only.
- AD-4: fields are part of the one validated config structure read through the single resolver; field changes apply live.
- AD-7: values live in `groups.field_values` JSON; membership transactions enforce required-field completion on create/edit.
- AD-6: config and board changes propagate via the session channel; reconnect ends in snapshot resync so cards and search never go stale.
- Surfaces (flexibility-model): group create/edit form · board card · board search · CSV export.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e4--flexibility-systems-config-fields-permissions-extensions]
- [Source: docs/prds/prd-groupify/prd.md#f4--groups]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-6]
- [Source: docs/specs/spec-groupify/flexibility-model.md#2-fields-system-cap-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]

# Traceability

- FR: FR-4.4 | CAP: CAP-6 | AD: AD-1, AD-4, AD-6, AD-7, AD-8

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/4-2-fields-system.md
