# Story 3.3: Dissolve Groups

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want to dissolve all groups or a single group back into the pool,
so that I can restart formation for the next round.

## Acceptance Criteria

1. GIVEN groups exist WHEN I choose dissolve-all THEN every member returns to the pool and all groups are removed.
2. GIVEN I select a single group WHEN I dissolve it THEN only that group's members return to the pool and all other groups are untouched.
3. GIVEN I dissolve any groups WHEN the action completes THEN the activity feed records a dissolve event with a timestamp.
4. GIVEN a non-admin attempts to dissolve WHEN the action is dispatched THEN it is rejected (dissolve all groups is admin-only).

## Tasks / Subtasks

- [ ] Dissolve-all action (AC: 1, 4)
  - [ ] Add `POST /sessions/{code}/admin/groups/dissolve-all` with admin-token authorization (AD-3) and a `can?('dissolve all groups', role)` server-side check (AD-5).
  - [ ] In one transaction, delete all groups and their memberships for the session; members return to the pool as active, ungrouped participants (AD-7).
- [ ] Per-group dissolve action (AC: 2)
  - [ ] Add `POST /sessions/{code}/admin/groups/{group}/dissolve` scoped to one group; delete that group and its memberships only (AD-7).
- [ ] Event recording (AC: 3)
  - [ ] Insert a `session_events` row (`type` = dissolve, payload = affected group ids, `at` = timestamp) in the same transaction as the mutation (AD-1, Seed shape).
- [ ] Realtime broadcast (AC: 1, 2)
  - [ ] Broadcast the dissolve event on the admin and session channels after commit (AD-6); board, pool, and stats update live; reconnect ends in snapshot resync.

## Dev Notes

- AD-7: dissolve is a single transaction over `groups` + `memberships` rows; capacity/join-mode invariants are re-established by returning members to the pool.
- AD-1: mutations commit a transaction, then broadcast; `session_events` rows are written in the same transaction so the feed never misses a dissolve.
- AD-6: god-mode events go on the `admin:<code>` channel; participant-facing changes on `session:<code>`; reconnect always ends in a full snapshot resync.
- AD-5: `dissolve all groups` is admin-only in the default matrix; per-group dissolve is an admin control on the board.
- AD-3: admin routes are authorized by the per-session admin token.
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

- FR: FR-5.3 | CAP: CAP-5 | AD: AD-1, AD-3, AD-5, AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-3-dissolve-groups.md
