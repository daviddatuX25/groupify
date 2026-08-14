# Story 1.5: Session States + Archive/Delete

Status: ready-for-dev

## Story

As a facilitator,
I want to freeze, archive, or delete a session,
so that I can control when grouping happens and retire sessions cleanly.

## Acceptance Criteria

1. GIVEN a live session WHEN the facilitator freezes it THEN all joins, leaves, and swaps are blocked and the board is read-only (admin controls still work).
2. GIVEN a live session WHEN the facilitator archives it THEN it stops accepting joins.
3. GIVEN a session WHEN the facilitator deletes it THEN all its rows are purged.

## Tasks / Subtasks

- [ ] Model session states (AC: 1, 2)
  - [ ] Add `status` field on `sessions` (live / archived) and `freeze` flag in the config `rules` per AD-4; expose state in the session snapshot
  - [ ] Admin freeze/unfreeze action updates `rules.freeze` and broadcasts the state change on the `session:<code>` channel (AC: 1)
  - [ ] Admin archive action sets `status = archived` and broadcasts it (AC: 2)
- [ ] Enforce freeze in all mutation actions (AC: 1)
  - [ ] Join, leave, create-group, move, dissolve actions re-check the freeze flag and join mode in the same transaction as the mutation (AD-7)
  - [ ] Board renders read-only (no join/leave/swap affordances) for non-admin clients when frozen; admin exempt from the freeze (FR-1.3)
- [ ] Stop joins on archived sessions (AC: 2)
  - [ ] Join/verify endpoints reject requests when `status = archived` with a clear message
  - [ ] Archived sessions remain viewable/exportable but accept no new joins (CAP-1, FR-1.4)
- [ ] Implement delete (AC: 3)
  - [ ] Admin delete action purges the session and all rows: participants, groups, memberships, session_events (cascade delete)
  - [ ] Deleting revokes admin and participant tokens (AD-3); broadcast a session-gone state so clients stop rendering the session
- [ ] Surface state changes live (AC: 1, 2)
  - [ ] All connected clients re-render from events/snapshot when freeze, archive, or delete state changes (AD-6)

## Dev Notes

- AD-4 Session config object: `freeze` lives in config `rules` — one validated structure, feature code never reads ad-hoc columns.
- AD-7 Membership model: capacity and freeze are enforced transactionally with join/leave/move — a frozen session blocks every membership mutation server-side, not just in the UI.
- AD-1: every state mutation is an HTTP action committing a transaction, then a broadcast; clients render from server state.
- CAP-1: session lifecycle = create, run, freeze, archive; archived sessions stop accepting joins; FR-1.4: delete purges data.
- AD-3: tokens are revocable only by session delete/archive — deletion is the full revocation path.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S5)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-1 (Session lifecycle)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4 (Session config object — single source of truth)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/prds/prd-groupify/prd.md#F1 (Session management — FR-1.3, FR-1.4)]

# Traceability

- FR: FR-1.3, FR-1.4 | CAP: CAP-1 | AD: AD-3, AD-4, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-5-session-states.md
