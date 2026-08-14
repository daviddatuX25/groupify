# Story 3.2: Force-Move Member

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want to move any member to any group (or to the pool) directly from the live board,
so that I can rebalance groups without waiting for join mode or member action.

## Acceptance Criteria

1. GIVEN I am the admin WHEN I force-move a member to a target group THEN the member is moved regardless of the target group's join mode and the change is visible live on all screens.
2. GIVEN I am the admin WHEN I move a member to the pool THEN the member is removed from their group (effective kick) and appears in the pool.
3. GIVEN the target group is at capacity WHEN a force-move is attempted THEN the move is rejected — capacity is never violated.
4. GIVEN the session is frozen WHEN a non-admin attempts a move THEN it is blocked; the admin's force-move still works (admin exempt).

## Tasks / Subtasks

- [ ] Force-move action endpoint (AC: 1, 3, 4)
  - [ ] Add `POST /sessions/{code}/admin/members/{participant}/move` accepting target group id (or pool) with admin-token authorization (AD-3).
  - [ ] Implement as one transaction that re-checks capacity and freeze before committing (AD-7); admin is exempt from freeze, and join mode is explicitly bypassed (FR-5.2).
  - [ ] Gate the action with `can?('move members', role)` server-side (AD-5).
- [ ] Pool-as-kick semantics (AC: 2)
  - [ ] Target "pool" clears the membership's group; if the moved member is a leader, transfer leadership to the next-joined member (AD-7).
- [ ] Realtime propagation (AC: 1, 2)
  - [ ] Broadcast the move event on the admin and session channels only after the transaction commits (AD-1, AD-6); reconnect ends in snapshot resync.
- [ ] Board interaction (AC: 1)
  - [ ] Click-level move control on grid cards (picker/drag target selection, Zoom/Kahoot pattern per FR-5.2); render only when the allowed-action set includes `move members` (AD-5).
- [ ] Failure handling (AC: 3)
  - [ ] Return a clear validation error for capacity violation and freeze blocks; transaction rollback leaves no partial state.

## Dev Notes

- AD-7: move is a single transaction re-checking capacity, join mode, and freeze before committing; capacity = count of active memberships.
- AD-1: every mutation is an HTTP action that commits a transaction, then broadcasts; the database is the only source of truth.
- AD-5: `can?(action, role, session)` resolves session override → role default → system default; controllers enforce server-side, UI renders only the allowed set.
- AD-6: move events flow on `admin:<code>` (god-mode) and `session:<code>` channels; any (re)connect ends in a full snapshot resync.
- AD-3: admin requests are authorized by the per-session admin token; participant tokens never grant admin moves.
- E1S5: frozen = board read-only for participants, admin exempt.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-5.2 | CAP: CAP-5 | AD: AD-1, AD-3, AD-5, AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-2-force-move.md
