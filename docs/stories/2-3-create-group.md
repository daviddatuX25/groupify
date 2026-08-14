# Story 2.3: Create Group

Status: ready-for-dev

## Story

As a participant,
I want to create a group with a name and required fields,
so that others can find and join my group.

## Acceptance Criteria

1. GIVEN a participant WHEN they create a group THEN they provide a name (or accept the auto name per the naming scheme) and become the group's leader.
2. GIVEN group creation WHEN a size is chosen THEN it is bounded by the session's min/max rules.
3. GIVEN the group create form WHEN it renders THEN field inputs are generated from the session field config.
4. GIVEN the group create form WHEN a required field is empty THEN submit is blocked.

## Tasks / Subtasks

- [ ] Build the create-group form (AC: 1, 3, 4)
  - [ ] Form (modal or page) with a name input pre-filled per the naming scheme (e.g. "Team Alpha…" / "Table 1…") when auto-naming applies (FR-4.1)
  - [ ] Field inputs generated from session config `fields` (AD-4/AD-8) — text input per field, required flag from config (AC: 3)
  - [ ] Client-side blocking: required-field validation prevents submit while empty (AC: 4)
- [ ] Implement the create-group action (AC: 1, 2)
  - [ ] `POST /sessions/{code}/groups` in app/Http/Controllers — validates name, size, and required fields server-side
  - [ ] Capacity bounded by session rules: group size within `min_members` / `max_members` from config (AC: 2)
  - [ ] Creator becomes the group leader (membership row with role `leader`, status active) per AD-7; creator auto-joins the group
  - [ ] Commit in one transaction, then broadcast the group-created event on the `session:<code>` presence channel (AD-1, AD-6)
- [ ] Render the new group live (AC: 1)
  - [ ] New card appears on the board from the event/snapshot without reload; creator's seat moves from pool to the new group
- [ ] Validate server-side rejection (AC: 2, 4)
  - [ ] Oversized groups and empty required fields are rejected with clear errors even if the client check is bypassed

## Dev Notes

- FR-4.1: create group — name (or auto per scheme), leader = creator, capacity bounded by session min/max; FR-4.4: create/edit form renders all session-defined fields, required fields block submit.
- AD-4 Session config object: min/max, naming scheme, and `fields` all come from the one validated config structure.
- AD-7 Membership model: the creator's leadership is a memberships row (role leader); capacity enforced transactionally.
- AD-8 Fields: values stored as JSON keyed by field id; the form is generated from config — adding a field requires no migration (flexibility-model.md#fields-system).
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S3)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-4 (Group formation)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4 (Session config object — single source of truth)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8 (Fields — config, not schema)]
- [Source: docs/prds/prd-groupify/prd.md#F4 (Groups — FR-4.1, FR-4.4)]

# Traceability

- FR: FR-4.1, FR-4.4 | CAP: CAP-4 | AD: AD-4, AD-7, AD-8

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-3-create-group.md
