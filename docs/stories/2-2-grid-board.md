# Story 2.2: Grid Board

Status: ready-for-dev

## Story

As a participant,
I want to see a live grid of group cards with slots, fields, and join buttons,
so that I can find and pick the group I want.

## Acceptance Criteria

1. GIVEN the board WHEN groups exist THEN each card shows the group name, slots (e.g. 3/5), field values, and a join button (or FULL when at capacity).
2. GIVEN the board WHEN the participant types in search THEN cards are filtered by group name or field value.
3. GIVEN the board WHEN the "open slots only" filter is toggled THEN only groups with free capacity remain visible.

## Tasks / Subtasks

- [ ] Build the board from the session snapshot (AC: 1)
  - [ ] `resources/js/components/Board.tsx` (or page section) rendering one card per group from the snapshot (AD-6)
  - [ ] Card shows: group name, slot count (active memberships / max, e.g. 3/5), field values rendered from config `fields` (AD-8), and a join button or FULL label when at capacity (FR-3.2)
  - [ ] FULL is derived from capacity (active memberships count >= max) per AD-7 — no separate flag
- [ ] Search by name and field value (AC: 2)
  - [ ] Search input filters cards client-side against group name and filterable field values (FR-3.4; filterable per flexibility-model fields table)
  - [ ] No results state shown when the search matches nothing
- [ ] "Open slots only" filter (AC: 3)
  - [ ] Toggle hides groups whose active membership count equals the session max; works combined with search
  - [ ] Filters re-apply after live updates so new FULL groups drop out and reopened groups reappear
- [ ] Keep the board live (AC: 1, 2, 3)
  - [ ] Re-render cards from session events (group created, join/leave, field edits) without page reload (CAP-3: within ~1s)

## Dev Notes

- FR-3.2: live grid cards — group name, slots (3/5), field values, join button (or FULL); FR-3.4: search by group name / field value + "open slots only" filter — ADOPT OpenSpace.
- AD-6 Realtime: the board renders from the session snapshot and event deltas on the `session:<code>` presence channel.
- AD-7 Membership model: slot counts are counts of active memberships — the card's FULL state derives from that count.
- AD-8 Fields: field values live as JSON keyed by field id; the card renders from config `fields`, so adding a field is a config change only (flexibility-model.md#fields-system).
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S2)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3 (Pool & live grid)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6 (Realtime — two channel classes, snapshot resync)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8 (Fields — config, not schema)]
- [Source: docs/prds/prd-groupify/prd.md#F3 (Pool & live board — FR-3.2, FR-3.4)]
- [Source: docs/specs/spec-groupify/flexibility-model.md (Fields system — CAP-6)]

# Traceability

- FR: FR-3.2, FR-3.4 | CAP: CAP-3 | AD: AD-6, AD-7, AD-8

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-2-grid-board.md
